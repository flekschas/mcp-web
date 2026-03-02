import type { ToolDefinitionZod } from '@mcp-web/types';
import { z } from 'zod';

/**
 * Converts a JSON Schema object to a TypeScript-style type string.
 */
function jsonSchemaToTypeString(
  schema: Record<string, unknown>,
  indent = 0,
): string {
  const pad = '  '.repeat(indent);
  const type = schema.type as string | undefined;

  if (schema.enum) {
    const values = schema.enum as unknown[];
    return values
      .map((v) => (typeof v === 'string' ? `'${v}'` : String(v)))
      .join(' | ');
  }

  if (schema.const !== undefined) {
    const v = schema.const;
    return typeof v === 'string' ? `'${v}'` : String(v);
  }

  if (schema.anyOf) {
    const options = schema.anyOf as Record<string, unknown>[];
    return options
      .map((o) => jsonSchemaToTypeString(o, indent))
      .join(' | ');
  }

  if (schema.oneOf) {
    const options = schema.oneOf as Record<string, unknown>[];
    return options
      .map((o) => jsonSchemaToTypeString(o, indent))
      .join(' | ');
  }

  if (type === 'string') return 'string';
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'null') return 'null';

  if (type === 'array') {
    const items = schema.items as Record<string, unknown> | undefined;
    if (items) {
      return `${jsonSchemaToTypeString(items, indent)}[]`;
    }
    return 'unknown[]';
  }

  if (type === 'object') {
    const properties = schema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!properties || Object.keys(properties).length === 0) {
      return 'Record<string, unknown>';
    }

    const required = (schema.required as string[]) ?? [];
    const lines = Object.entries(properties).map(([key, prop]) => {
      const optional = !required.includes(key);
      const typeStr = jsonSchemaToTypeString(prop, indent + 1);
      return `${pad}  ${key}${optional ? '?' : ''}: ${typeStr}`;
    });

    return `{ ${lines.join('; ')} }`;
  }

  // additionalProperties pattern (Record-like)
  if (schema.additionalProperties) {
    const valueSchema = schema.additionalProperties as Record<
      string,
      unknown
    >;
    if (typeof valueSchema === 'object') {
      return `Record<string, ${jsonSchemaToTypeString(valueSchema, indent)}>`;
    }
  }

  return 'unknown';
}

/**
 * Checks if a type string is complex enough to warrant a named alias.
 */
function isComplexType(typeStr: string): boolean {
  return typeStr.includes('{') || typeStr.length > 60;
}

/**
 * Extracts @param descriptions from a JSON Schema's properties.
 */
function extractParamDocs(
  schema: Record<string, unknown>,
): string[] {
  const properties = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!properties) return [];

  const lines: string[] = [];
  for (const [key, prop] of Object.entries(properties)) {
    if (prop.description) {
      lines.push(` * @param params.${key} - ${prop.description as string}`);
    }
  }
  return lines;
}

/**
 * Generates a type alias name from a tool name.
 * e.g., "add_todos" -> "AddTodosInput"
 */
function toTypeName(toolName: string, suffix: string): string {
  return (
    toolName
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('') + suffix
  );
}

/**
 * Generates a function signature and any needed type aliases for a tool.
 */
function toolToSignature(tool: ToolDefinitionZod): {
  aliases: string[];
  signature: string;
} {
  const aliases: string[] = [];
  const jsdocLines: string[] = [];

  if (tool.description) {
    jsdocLines.push(` * ${tool.description}`);
  }

  let paramsStr = '';
  if (tool.inputSchema) {
    try {
      const jsonSchema = z.toJSONSchema(
        tool.inputSchema as z.ZodSchema,
      );
      const schema = jsonSchema as Record<string, unknown>;
      const typeStr = jsonSchemaToTypeString(schema);

      if (isComplexType(typeStr)) {
        const aliasName = toTypeName(tool.name, 'Input');
        aliases.push(`type ${aliasName} = ${typeStr};`);
        paramsStr = `params: ${aliasName}`;
      } else {
        paramsStr = `params: ${typeStr}`;
      }

      jsdocLines.push(...extractParamDocs(schema));
    } catch {
      paramsStr = 'params: unknown';
    }
  }

  let returnStr = 'unknown';
  if (tool.outputSchema) {
    try {
      const jsonSchema = z.toJSONSchema(
        tool.outputSchema as z.ZodSchema,
      );
      const typeStr = jsonSchemaToTypeString(
        jsonSchema as Record<string, unknown>,
      );

      if (isComplexType(typeStr)) {
        const aliasName = toTypeName(tool.name, 'Output');
        aliases.push(`type ${aliasName} = ${typeStr};`);
        returnStr = aliasName;
      } else {
        returnStr = typeStr;
      }
    } catch {
      // keep unknown
    }
  }

  let jsdoc = '';
  if (jsdocLines.length > 0) {
    jsdoc = `/**\n${jsdocLines.join('\n')}\n */\n`;
  }

  const signature = `${jsdoc}async function ${tool.name}(${paramsStr}): Promise<${returnStr}>`;
  return { aliases, signature };
}

/**
 * Generates the full description for a CodeTool from its constituent tools.
 */
export function generateCodeToolDescription(
  tools: ToolDefinitionZod[],
): string {
  const allAliases: string[] = [];
  const allSignatures: string[] = [];

  for (const tool of tools) {
    const { aliases, signature } = toolToSignature(tool);
    allAliases.push(...aliases);
    allSignatures.push(signature);
  }

  const typesBlock = [
    ...(allAliases.length > 0 ? [...allAliases, ''] : []),
    ...allSignatures,
  ].join('\n\n');

  return [
    'Execute code to achieve a goal.',
    '',
    'Available functions:',
    typesBlock,
    '',
    'Write plain JavaScript (not TypeScript).',
    'Code runs in a sandboxed iframe (allow-scripts only). Use the provided functions to interact with the app.',
    'Top-level await is supported.',
    'The value of the last expression is the result, e.g.:',
    '  const items = await get_items()',
    '  items.filter(i => i.active)  // ← returned',
  ].join('\n');
}
