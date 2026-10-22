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
 * - Accepts either spelling of "this is the answer": a trailing expression,
 *   which is rewritten into a return, or an explicit top-level `return`, which
 *   is left alone
 *
 * Both are accepted because models write both, and which one a given prompt
 * elicits is not worth being strict about: accepting only the trailing
 * expression rejects `return`-using programs as `'return' outside of function`,
 * which is a syntax error for code that is correct in intent.
 */
export function validateAndTransformCode(code: string): ValidationResult {
  let ast: acorn.Program;

  try {
    ast = acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
      // The program body becomes an AsyncFunction body, where a top-level
      // return is legal — acorn just has to be told not to apply the
      // module-level rule.
      allowReturnOutsideFunction: true,
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

  // Transform: a trailing expression becomes a return. A program that already
  // ends in a return needs nothing, and one that ends in neither (a loop, an
  // assignment) yields undefined — which is a real answer, not an error.
  let transformedCode = code;
  const lastNode = ast.body[ast.body.length - 1];

  if (lastNode && lastNode.type === 'ExpressionStatement') {
    // Slice the *expression*, not the statement: a statement's range includes
    // its semicolon, and `return (x;)` is a syntax error the model would
    // receive as an unexplained "Unexpected token ';'".
    const expression = lastNode.expression;
    const before = code.slice(0, lastNode.start);
    const expr = code.slice(expression.start, expression.end);
    transformedCode = `${before}return (${expr})`;
  }

  return { valid: true, transformedCode };
}
