import * as acorn from 'acorn';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  transformedCode?: string;
}

/**
 * Validates and transforms JavaScript code for sandbox execution.
 *
 * - Parses with acorn to catch syntax errors
 * - Rejects import/export declarations (functions are globals)
 * - Transforms last ExpressionStatement to a return statement
 *   so AsyncFunction returns the value
 */
export function validateAndTransformCode(code: string): ValidationResult {
  let ast: acorn.Program;

  try {
    ast = acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
    });
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  for (const node of ast.body) {
    if (
      node.type === 'ImportDeclaration' ||
      node.type === 'ExportNamedDeclaration' ||
      node.type === 'ExportDefaultDeclaration' ||
      node.type === 'ExportAllDeclaration'
    ) {
      return {
        valid: false,
        error: `${node.type} is not allowed. Functions are available as globals.`,
      };
    }
  }

  // Transform: if last statement is an expression, make it a return
  let transformedCode = code;
  const lastNode = ast.body[ast.body.length - 1];

  if (lastNode && lastNode.type === 'ExpressionStatement') {
    const before = code.slice(0, lastNode.start);
    const expr = code.slice(lastNode.start, lastNode.end);
    transformedCode = `${before}return (${expr})`;
  }

  return { valid: true, transformedCode };
}
