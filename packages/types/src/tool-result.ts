import type {
  CallToolResult,
  ImageContent,
} from '@modelcontextprotocol/sdk/types.js';
import { isErrorResult } from './tools.js';

const isImageDataUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^data:image\/[^,]*;base64,/.test(value);

const toImageContent = (dataUrl: string): ImageContent => ({
  type: 'image',
  data: dataUrl.slice(dataUrl.indexOf(',') + 1),
  mimeType: dataUrl.slice('data:'.length, dataUrl.indexOf(';')),
});

/**
 * Wraps a tool handler's return value in the MCP `CallToolResult` format.
 *
 * - An object's `_meta` moves to the top level of the result, where MCP hosts
 *   look for it.
 * - An error result (see `isErrorResult`) becomes JSON text with `isError`.
 * - A base64 image data URL, or an object with one in `dataUrl`, becomes image
 *   content.
 * - A string becomes text, and any other value becomes JSON text.
 */
export function toCallToolResult(result: unknown): CallToolResult {
  if (result && typeof result === 'object' && '_meta' in result) {
    const { _meta, ...rest } = result as Record<string, unknown>;
    return {
      ...toCallToolResult(rest),
      ...(_meta && typeof _meta === 'object'
        ? { _meta: _meta as Record<string, unknown> }
        : {}),
    };
  }

  if (isErrorResult(result)) {
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: true,
    };
  }

  if (typeof result === 'string') {
    if (isImageDataUrl(result)) {
      return { content: [toImageContent(result)] };
    }
    return { content: [{ type: 'text', text: result }] };
  }

  if (result === null || result === undefined) {
    return { content: [{ type: 'text', text: '' }] };
  }

  if (typeof result !== 'object') {
    return { content: [{ type: 'text', text: String(result) }] };
  }

  const { dataUrl } = result as { dataUrl?: unknown };
  if (isImageDataUrl(dataUrl)) {
    return { content: [toImageContent(dataUrl)] };
  }

  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}
