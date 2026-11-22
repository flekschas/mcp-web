import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import type { z } from 'zod';

/** One problem a JSON Schema found, located in the checked value. */
export interface SchemaProblem {
  path: (string | number)[];
  message: string;
}

const MAX_PROBLEMS = 8;
const MAX_VALUES = 25;
const MAX_POINTERS = 4;
const MAX_SHAPES = 8;
const SCHEMA_ID = 'checked-schema';

interface SchemaLocation {
  /** JSON pointer as shown in messages, e.g. `/definitions/Mark`. */
  pointer: string;
  /** The same location as a URI fragment Ajv can resolve. */
  fragment: string;
}

/** Maps every object in the schema to its location. */
function indexLocations(schema: object): Map<object, SchemaLocation> {
  const locations = new Map<object, SchemaLocation>();
  const visit = (value: unknown, pointer: string, fragment: string) => {
    if (!value || typeof value !== 'object' || locations.has(value)) return;
    locations.set(value, { pointer, fragment });
    for (const [key, child] of Object.entries(value)) {
      const escaped = key.replaceAll('~', '~0').replaceAll('/', '~1');
      visit(
        child,
        `${pointer}/${key}`,
        `${fragment}/${encodeURIComponent(escaped)}`,
      );
    }
  };
  visit(schema, '', '#');
  return locations;
}

function toPath(instancePath: string): (string | number)[] {
  if (!instancePath) return [];
  return instancePath
    .slice(1)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

/**
 * An Ajv error. Errors from alternative branches that fit a value equally well
 * are tagged with their `shape`, so their message can tell alternative fixes
 * apart from fixes that are all needed.
 */
type CheckError = ErrorObject & { shape?: string };

const isAlternatives = (error: ErrorObject) =>
  error.keyword === 'anyOf' || error.keyword === 'oneOf';

const isConstant = (error: ErrorObject) =>
  error.keyword === 'const' || error.keyword === 'enum';

/**
 * A property one level below `instancePath`, such as a `type` tag, whose value
 * every branch rejects as a wrong constant.
 */
function commonTag(
  branches: ErrorObject[][],
  instancePath: string,
): string | undefined {
  const tags = (errors: ErrorObject[]) =>
    new Set(
      errors
        .filter(
          (error) =>
            isConstant(error) &&
            error.instancePath.startsWith(`${instancePath}/`) &&
            !error.instancePath.slice(instancePath.length + 1).includes('/'),
        )
        .map((error) => error.instancePath),
    );
  const [first, ...rest] = branches.map(tags);
  return [...first].find((tag) => rest.every((other) => other.has(tag)));
}

/**
 * How far a branch of `anyOf` or `oneOf` is from matching the value at
 * `instancePath`, compared in order: whether the value has a type the branch
 * rejects, how many of its properties the branch doesn't know, and how many
 * constants differ there or one level down (such as a `type` tag). Errors
 * further down say what is wrong within a branch, not which branch was meant.
 */
function distance(errors: ErrorObject[], instancePath: string): number[] {
  const result = [0, 0, 0];
  for (const error of errors) {
    const rest = error.instancePath.slice(instancePath.length);
    const here = rest === '';
    const child = here || !rest.slice(1).includes('/');
    if (here && error.keyword === 'type') result[0] = 1;
    if (here && error.keyword === 'additionalProperties') result[1]++;
    if (child && isConstant(error)) result[2]++;
  }
  return result;
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

const quote = (items: Iterable<unknown>, max = Infinity) => {
  const list = [...items].map((item) => JSON.stringify(item));
  const shown = list.slice(0, max).join(', ');
  return list.length > max ? `${shown}, … (${list.length - max} more)` : shown;
};

/** What is missing, unknown or otherwise wrong, from errors about shape. */
function describeShape(errors: CheckError[]): string[] {
  const missing = new Set<string>();
  const unknown = new Set<string>();
  const other = new Set<string>();

  for (const error of errors) {
    const params = error.params as Record<string, unknown>;
    switch (error.keyword) {
      case 'required':
        missing.add(String(params.missingProperty));
        break;
      case 'additionalProperties':
        unknown.add(String(params.additionalProperty));
        break;
      case 'anyOf':
        break;
      case 'oneOf':
        // Only a `oneOf` that several branches matched has its own message.
        if (params.passingSchemas) other.add(error.message ?? error.keyword);
        break;
      default:
        other.add(error.message ?? error.keyword);
    }
  }

  const parts: string[] = [];
  if (missing.size > 0)
    parts.push(`missing required property ${quote(missing)}`);
  if (unknown.size > 0) parts.push(`unknown property ${quote(unknown)}`);
  parts.push(...other);
  return parts;
}

/**
 * Summarizes all errors at one location into one message. Allowed values and
 * types are merged; shape errors of alternative shapes are listed as
 * alternative fixes.
 */
function describe(errors: CheckError[], pointers: string[]): string {
  const values = new Set<unknown>();
  const types = new Set<string>();
  const shapes = new Map<string, CheckError[]>();

  for (const error of errors) {
    const params = error.params as Record<string, unknown>;
    if (error.keyword === 'enum') {
      for (const value of params.allowedValues as unknown[]) values.add(value);
    } else if (error.keyword === 'const') {
      values.add(params.allowedValue);
    } else if (error.keyword === 'type') {
      types.add(String(params.type));
    } else {
      const shape = error.shape ?? '';
      shapes.set(shape, [...(shapes.get(shape) ?? []), error]);
    }
  }

  const parts: string[] = [];
  if (values.size > 0) {
    const typeText =
      types.size > 0 ? ` or of type ${[...types].join(' | ')}` : '';
    parts.push(`must be one of ${quote(values, MAX_VALUES)}${typeText}`);
  } else if (types.size > 0) {
    parts.push(`must be of type ${[...types].join(' | ')}`);
  }

  // Errors without a shape apply to every alternative.
  parts.push(...describeShape(shapes.get('') ?? []));
  shapes.delete('');
  const fixes = [
    ...new Set(
      [...shapes.values()]
        .map((group) => describeShape(group).join('; '))
        .filter(Boolean),
    ),
  ];
  if (fixes.length === 1) {
    parts.push(fixes[0]);
  } else if (fixes.length > 1) {
    const shown = fixes
      .slice(0, MAX_SHAPES)
      .map((fix) => `[${fix}]`)
      .join(' or ');
    const more = fixes.length > MAX_SHAPES ? ' or …' : '';
    parts.push(`fits none of the allowed shapes; fix one: ${shown}${more}`);
  }
  if (parts.length === 0) parts.push('does not match any allowed shape');

  return `${parts.join('; ')} (schema: ${pointers.join(', ')})`;
}

/**
 * Creates a check of values against a JSON Schema, compiled with Ajv on first
 * use.
 *
 * Ajv reports the errors of every branch of a failed `anyOf` or `oneOf`, most
 * of them from branches that were never meant. For an object or array, the
 * check keeps the errors of the branches closest to matching (see
 * `distance`), and lists the fixes of equally close branches as
 * alternatives. If every branch rejects the same tag, it lists the tag's
 * values. For any other value, or one whose type no branch accepts, it lists
 * what each branch accepts. The remaining errors are merged per location and
 * each message names the schema locations it comes from.
 */
export function createJsonSchemaCheck(
  schema: object,
): (value: unknown) => SchemaProblem[] {
  let ajv: Ajv | null = null;
  let validate: ValidateFunction | null = null;
  let locations = new Map<object, SchemaLocation>();
  let shapeCount = 0;

  const validatorOf = (branch: unknown): ValidateFunction | undefined => {
    if (!ajv) return undefined;
    if (typeof branch === 'boolean') return ajv.compile(branch);
    const location = locations.get(branch as object);
    return location && ajv.getSchema(`${SCHEMA_ID}${location.fragment}`);
  };

  /** Validates each branch of a failed `anyOf` or `oneOf` on its own. */
  const checkBranches = (alternatives: ErrorObject) => {
    const branches: ErrorObject[][] = [];
    for (const branch of alternatives.schema as unknown[]) {
      const validateBranch = validatorOf(branch);
      if (!validateBranch) return null;
      if (validateBranch(alternatives.data)) {
        branches.push([]);
        continue;
      }
      branches.push(
        (validateBranch.errors ?? []).map((error) => ({
          ...error,
          instancePath: alternatives.instancePath + error.instancePath,
        })),
      );
    }
    return branches;
  };

  /** The errors of the branches of a failed `anyOf` or `oneOf` to report. */
  const choose = (
    alternatives: ErrorObject,
    branches: CheckError[][],
  ): CheckError[] => {
    const candidates = branches.map((errors) => ({
      errors,
      distance: distance(errors, alternatives.instancePath),
    }));
    const closest = candidates.reduce(
      (min, candidate) =>
        compare(candidate.distance, min) < 0 ? candidate.distance : min,
      candidates[0].distance,
    );
    const here = (error: ErrorObject) =>
      error.instancePath === alternatives.instancePath;

    // A value that isn't an object or array, or has a type no branch
    // accepts: list what each branch accepts.
    const { data } = alternatives;
    if (data === null || typeof data !== 'object' || closest[0] === 1) {
      return branches.flatMap((errors) => errors.filter(here));
    }

    // Every branch rejects the same tag, such as `type`: list its values,
    // and the errors every branch has.
    const tag = commonTag(branches, alternatives.instancePath);
    if (tag !== undefined) {
      const key = (error: ErrorObject) =>
        `${error.keyword} ${error.instancePath} ${JSON.stringify(error.params)}`;
      const rest = branches.slice(1).map((errors) => new Set(errors.map(key)));
      return [
        ...branches.flatMap((errors) =>
          errors.filter(
            (error) => error.instancePath === tag && isConstant(error),
          ),
        ),
        ...branches[0].filter(
          (error) =>
            error.instancePath !== tag &&
            rest.every((other) => other.has(key(error))),
        ),
      ];
    }

    const tied = candidates.filter(
      (candidate) => compare(candidate.distance, closest) === 0,
    );
    if (tied.length === 1) return tied[0].errors;

    // Equally close branches are alternatives. A location where one of them
    // has no error needs no fix for that one, so it is left out, unless that
    // leaves nothing.
    const id = ++shapeCount;
    const tagged = tied.map((candidate, index) =>
      candidate.errors.map((error) => ({
        ...error,
        shape: `${id}.${index}${error.shape ? `/${error.shape}` : ''}`,
      })),
    );
    const shared = tagged.flatMap((errors) =>
      errors.filter((error) =>
        tagged.every((other) =>
          other.some((e) => e.instancePath === error.instancePath),
        ),
      ),
    );
    return shared.length > 0 ? shared : tagged.flat();
  };

  /**
   * Replaces each failed `anyOf` or `oneOf`, and the errors of its branches,
   * with the errors `choose` picks. Ajv lists a branch's errors right before
   * the error of its `anyOf` or `oneOf`, which is how they are found.
   */
  const resolve = (errors: CheckError[]): CheckError[] => {
    const resolved: CheckError[] = [];
    let end = errors.length;
    while (end > 0) {
      end--;
      const error = errors[end];
      const branches = isAlternatives(error) ? checkBranches(error) : null;
      const count = branches?.reduce((sum, b) => sum + b.length, 0) ?? 0;
      const block = errors.slice(end - count, end);
      if (
        !branches ||
        count > end ||
        block.some((e) => !e.instancePath.startsWith(error.instancePath))
      ) {
        resolved.unshift(error);
        continue;
      }
      end -= count;

      // A `oneOf` that more than one branch matched.
      if (branches.some((branch) => branch.length === 0)) {
        resolved.unshift(error);
        continue;
      }

      const kept = choose(error, branches.map(resolve));
      // Kept so the message also names the schema location of the
      // alternatives, which is where the property is defined.
      if (kept.some((e) => e.instancePath === error.instancePath)) {
        kept.push(error);
      }
      resolved.unshift(...kept);
    }
    return resolved;
  };

  return (value) => {
    if (!ajv || !validate) {
      ajv = new Ajv({
        strict: false,
        allErrors: true,
        validateFormats: false,
        verbose: true,
      });
      ajv.addSchema(schema, SCHEMA_ID);
      validate = ajv.getSchema(SCHEMA_ID) ?? null;
      locations = indexLocations(schema);
      if (!validate) throw new Error('Could not compile the JSON Schema');
    }
    if (validate(value)) return [];

    const raw = validate.errors ?? [];
    const resolved = resolve([...raw]);
    const errors = resolved.length > 0 ? resolved : raw;

    const byLocation = new Map<string, CheckError[]>();
    for (const error of errors) {
      const group = byLocation.get(error.instancePath) ?? [];
      group.push(error);
      byLocation.set(error.instancePath, group);
    }

    const problems: SchemaProblem[] = [];
    for (const [instancePath, group] of byLocation) {
      // Locations of the alternatives first: they name the property that was
      // wrong rather than one of its candidate types.
      const sorted = [...group].sort(
        (a, b) => Number(isAlternatives(b)) - Number(isAlternatives(a)),
      );
      const pointers = [
        ...new Set(
          sorted.map(
            (error) => locations.get(error.parentSchema as object)?.pointer,
          ),
        ),
      ]
        .filter((pointer): pointer is string => Boolean(pointer))
        .slice(0, MAX_POINTERS);
      problems.push({
        path: toPath(instancePath),
        message: describe(group, pointers),
      });
    }

    if (problems.length > MAX_PROBLEMS) {
      const hidden = problems.length - MAX_PROBLEMS;
      return [
        ...problems.slice(0, MAX_PROBLEMS),
        { path: [], message: `${hidden} more problem(s) not shown` },
      ];
    }
    return problems;
  };
}

/**
 * Adds a full JSON Schema check to a Zod schema as a synchronous refinement,
 * so state tools and the code tool report its problems like any Zod issue.
 */
export function refineWithJsonSchema<T extends z.ZodType>(
  zodSchema: T,
  check: (value: unknown) => SchemaProblem[],
): T {
  return zodSchema.superRefine((value, ctx) => {
    for (const problem of check(value)) {
      ctx.addIssue({
        code: 'custom',
        path: problem.path,
        message: problem.message,
      });
    }
  }) as T;
}
