import { expect, test } from 'bun:test';
import { toCallToolResult } from './tool-result.js';

test('moves `_meta` out of the text, also for errors', () => {
  expect(toCallToolResult({ status: 'ok', _meta: { id: 1 } })).toEqual({
    content: [
      { type: 'text', text: JSON.stringify({ status: 'ok' }, null, 2) },
    ],
    _meta: { id: 1 },
  });
  expect(toCallToolResult({ error: 'failure', _meta: { id: 1 } })).toEqual({
    content: [
      { type: 'text', text: JSON.stringify({ error: 'failure' }, null, 2) },
    ],
    isError: true,
    _meta: { id: 1 },
  });
});

test('turns base64 image data URLs into images', () => {
  const image = { type: 'image', data: 'iVBORw0=', mimeType: 'image/png' };
  expect(toCallToolResult('data:image/png;base64,iVBORw0=')).toEqual({
    content: [image],
  });
  expect(
    toCallToolResult({ dataUrl: 'data:image/png;base64,iVBORw0=' }),
  ).toEqual({ content: [image] });
});

test('keeps other image data URLs as text', () => {
  const svg = 'data:image/svg+xml,%3Csvg%2F%3E';
  expect(toCallToolResult(svg)).toEqual({
    content: [{ type: 'text', text: svg }],
  });
});
