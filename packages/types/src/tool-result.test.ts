import { expect, test } from 'bun:test';
import { toCallToolResult } from './tool-result.js';

const meta = { ui: { resourceUri: 'ui://app/view.html' } };

test('_meta moves to the top level for every kind of result', () => {
  expect(toCallToolResult({ count: 2, _meta: meta })).toEqual({
    content: [{ type: 'text', text: '{\n  "count": 2\n}' }],
    _meta: meta,
  });
  expect(toCallToolResult({ error: 'Not allowed', _meta: meta })).toEqual({
    content: [{ type: 'text', text: '{\n  "error": "Not allowed"\n}' }],
    isError: true,
    _meta: meta,
  });
  expect(
    toCallToolResult({ dataUrl: 'data:image/png;base64,AAAA', _meta: meta }),
  ).toEqual({
    content: [{ type: 'image', data: 'AAAA', mimeType: 'image/png' }],
    _meta: meta,
  });
});

test('strings, images and empty results', () => {
  expect(toCallToolResult('done')).toEqual({
    content: [{ type: 'text', text: 'done' }],
  });
  expect(toCallToolResult('data:image/svg+xml;base64,PHN2Zz4=')).toEqual({
    content: [{ type: 'image', data: 'PHN2Zz4=', mimeType: 'image/svg+xml' }],
  });
  expect(toCallToolResult(undefined)).toEqual({
    content: [{ type: 'text', text: '' }],
  });
  expect(toCallToolResult({ status: 'rendered', error: null })).toEqual({
    content: [
      { type: 'text', text: '{\n  "status": "rendered",\n  "error": null\n}' },
    ],
  });
});

test('a value without JSON throws, also at the top level', () => {
  expect(() => toCallToolResult(1n)).toThrow();
  expect(() => toCallToolResult({ count: 1n })).toThrow();
  expect(toCallToolResult(1)).toEqual({
    content: [{ type: 'text', text: '1' }],
  });
});

test('with an output schema, an object result is also structured content', () => {
  const outputSchema = { type: 'object' as const };
  expect(toCallToolResult({ count: 2, _meta: meta }, outputSchema)).toEqual({
    content: [{ type: 'text', text: '{\n  "count": 2\n}' }],
    structuredContent: { count: 2 },
    _meta: meta,
  });
  expect(
    toCallToolResult({ error: 'Not allowed' }, outputSchema).structuredContent,
  ).toBeUndefined();
});
