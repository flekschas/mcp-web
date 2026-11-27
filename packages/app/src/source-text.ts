/**
 * Removes comments from source code, keeping strings intact.
 *
 * @internal
 */
export function stripComments(code: string): string {
  let result = '';
  let quote: string | null = null;
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (quote) {
      result += char;
      if (char === '\\') result += code[++i] ?? '';
      else if (char === quote) quote = null;
    } else if (char === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      i = end === -1 ? code.length : end - 1;
    } else if (char === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      i = end === -1 ? code.length : end + 1;
    } else {
      if (char === "'" || char === '"' || char === '`') quote = char;
      result += char;
    }
  }
  return result;
}

/**
 * The value of source text that is one string literal, such as `'1.2.0'`, or
 * undefined for anything else, such as `'1.' + '2'`. Literals with escapes
 * are not supported.
 *
 * @internal
 */
export function readStringLiteral(
  source: string | undefined,
): string | undefined {
  const match = source?.match(/^'([^'\\\n]*)'$|^"([^"\\\n]*)"$/);
  return match ? (match[1] ?? match[2]) : undefined;
}

/**
 * Reads the top-level properties of an object literal's body as source text,
 * so properties of nested objects, such as a handler's return value, are
 * skipped. Shorthand properties and spreads are left out.
 *
 * @internal
 */
export function readTopLevelProperties(body: string): Map<string, string> {
  const code = stripComments(body);
  const properties = new Map<string, string>();
  let depth = 0;
  let start = 0;
  let quote: string | null = null;

  const addProperty = (end: number) => {
    const property = code.slice(start, end);
    const colon = property.indexOf(':');
    if (colon === -1) return;
    const key = property
      .slice(0, colon)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    properties.set(key, property.slice(colon + 1).trim());
  };

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = null;
    } else if (char === "'" || char === '"' || char === '`') {
      quote = char;
    } else if ('({['.includes(char)) {
      depth++;
    } else if (')}]'.includes(char)) {
      depth--;
    } else if (char === ',' && depth === 0) {
      addProperty(i);
      start = i + 1;
    }
  }
  addProperty(code.length);
  return properties;
}

/**
 * Replaces the text inside string literals with spaces, so code can be
 * searched without matching strings. Positions stay the same.
 *
 * @internal
 */
export function blankStrings(code: string): string {
  let result = '';
  let quote: string | null = null;
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (quote) {
      if (char === '\\') {
        result += '  ';
        i++;
      } else if (char === quote) {
        quote = null;
        result += char;
      } else {
        result += char === '\n' ? char : ' ';
      }
    } else {
      if (char === "'" || char === '"' || char === '`') quote = char;
      result += char;
    }
  }
  return result;
}

/**
 * Index of the bracket that closes the one at `open`, or -1. Expects code
 * without strings and comments.
 *
 * @internal
 */
export function findClosingBracket(code: string, open: number): number {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if ('({['.includes(code[i])) depth++;
    else if (')}]'.includes(code[i]) && --depth === 0) return i;
  }
  return -1;
}
