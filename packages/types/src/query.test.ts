import { expect, test } from 'bun:test';
import {
  QueryCompleteClientMessageSchema,
  QueryFailureMessageSchema,
  QueryMessageSchema,
  QueryProgressMessageSchema,
  QuerySchema,
} from './query.ts';

test('QuerySchema accepts valid query', () => {
  const result = QuerySchema.safeParse({
    uuid: 'test-uuid',
    prompt: 'Test prompt',
    context: [],
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.uuid).toBe('test-uuid');
    expect(result.data.prompt).toBe('Test prompt');
    expect(result.data.context).toEqual([]);
  }
});

test('QuerySchema accepts query with tools and restrictTools', () => {
  const result = QuerySchema.safeParse({
    uuid: 'test-uuid',
    prompt: 'Test prompt',
    context: [],
    tools: [
      {
        name: 'test_tool',
        description: 'A test tool',
        handler: () => {},
      },
    ],
    restrictTools: true,
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.tools?.length).toBe(1);
    expect(result.data.restrictTools).toBe(true);
  }
});

test('QuerySchema rejects invalid uuid type', () => {
  const result = QuerySchema.safeParse({
    uuid: 123, // Should be string
    prompt: 'Test prompt',
    context: [],
  });

  expect(result.success).toBe(false);
});

test('QuerySchema rejects invalid tools array', () => {
  const result = QuerySchema.safeParse({
    uuid: 'test-uuid',
    prompt: 'Test prompt',
    context: [],
    tools: 'invalid', // Should be array
  });

  expect(result.success).toBe(false);
});

test('QueryMessageSchema defaults type to "query"', () => {
  const result = QueryMessageSchema.safeParse({
    uuid: 'test-uuid',
    prompt: 'Test prompt',
    context: [],
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.type).toBe('query');
  }
});

test('QueryProgressMessageSchema validates progress messages', () => {
  const result = QueryProgressMessageSchema.safeParse({
    type: 'query_progress',
    uuid: 'test-uuid',
    message: 'Processing...',
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.type).toBe('query_progress');
    expect(result.data.uuid).toBe('test-uuid');
    expect(result.data.message).toBe('Processing...');
  }
});

test('QueryCompleteClientMessageSchema requires message', () => {
  const result = QueryCompleteClientMessageSchema.safeParse({
    type: 'query_complete',
    uuid: 'test-uuid',
    message: 'Done!',
  });

  expect(result.success).toBe(true);
});

test('QueryFailureMessageSchema validates error messages', () => {
  const result = QueryFailureMessageSchema.safeParse({
    type: 'query_failure',
    uuid: 'test-uuid',
    error: 'Something went wrong',
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.error).toBe('Something went wrong');
  }
});

test('QuerySchema accepts responseTool', () => {
  const result = QuerySchema.safeParse({
    uuid: 'test-uuid',
    prompt: 'Test prompt',
    context: [],
    responseTool: {
      name: 'response-tool',
      description: 'Tool for response',
      handler: () => {},
    },
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.responseTool?.name).toBe('response-tool');
  }
});
