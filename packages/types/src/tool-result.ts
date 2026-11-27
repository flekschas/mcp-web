import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { isErrorResult, type Tool } from './tools.js';

/**
 * Turns the value a tool handler returns into an MCP `CallToolResult`.
 *
 * Strings become text, and image data URLs, also as `{ dataUrl }`, become
 * images. Other values become JSON text, and an error result is marked with
 * `isError`. Throws for a value that can't be JSON, such as a bigint. The
 * `_meta` field of an object result moves to the top level of the result,
 * where the protocol expects it.
 *
 * With an output schema, a successful object result is also returned as
 * `structuredContent`, as MCP requires. The content stays for clients that
 * don't read structured content.
 */
export function toCallToolResult(
  result: unknown,
  outputSchema?: Tool['outputSchema'],
): CallToolResult {
  let value = result;
  let meta: Record<string, unknown> | undefined;
  if (value && typeof value === 'object' && '_meta' in value) {
    const { _meta, ...rest } = value as Record<string, unknown>;
    if (_meta && typeof _meta === 'object') {
      meta = _meta as Record<string, unknown>;
    }
    value = rest;
  }

  const isError = isErrorResult(value);
  const isObject =
    value !== null && typeof value === 'object' && !Array.isArray(value);
  return {
    content: [toContent(value)],
    ...(outputSchema && isObject && !isError
      ? { structuredContent: value as Record<string, unknown> }
      : {}),
    ...(isError ? { isError: true } : {}),
    ...(meta ? { _meta: meta } : {}),
  };
}

/**
 * Turns a successful result that isn't an object into an error when the tool
 * has an output schema, because MCP clients reject it.
 */
export const checkResultShape = (
  result: unknown,
  outputSchema?: Tool['outputSchema'],
): unknown =>
  outputSchema &&
  !isErrorResult(result) &&
  (result === null || typeof result !== 'object' || Array.isArray(result))
    ? { error: 'Invalid output: expected an object' }
    : result;

function toContent(value: unknown): CallToolResult['content'][number] {
  const dataUrl =
    value && typeof value === 'object' && !isErrorResult(value)
      ? (value as { dataUrl?: unknown }).dataUrl
      : value;
  if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
    const [header, data = ''] = dataUrl.split(',');
    const mimeType = header.slice('data:'.length).split(';')[0];
    return { type: 'image', data, mimeType };
  }

  if (typeof value === 'string') return { type: 'text', text: value };
  if (value === null || value === undefined) return { type: 'text', text: '' };
  // Throws for values without JSON, such as a bigint.
  return { type: 'text', text: JSON.stringify(value, null, 2) ?? '' };
}
