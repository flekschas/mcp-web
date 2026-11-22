import { expect, test } from 'bun:test';
import { McpWebConfigSchema } from '@mcp-web/types';

test('Bridge config schema validates valid configuration', () => {
  const result = McpWebConfigSchema.safeParse({
    bridgeUrl: 'localhost:4001',
    name: 'Test Bridge',
    description: 'Test description',
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.bridgeUrl === 'localhost:4001').toBe(true);
  }
});

test('Bridge config schema strips protocol from bridgeUrl', () => {
  const result = McpWebConfigSchema.safeParse({
    bridgeUrl: 'ws://localhost:4001',
    name: 'Test Bridge',
    description: 'Test description',
  });

  expect(result.success).toBe(true);
  if (result.success) {
    // Protocol should be stripped by transform
    expect(result.data.bridgeUrl === 'localhost:4001').toBe(true);
  }
});

test('Bridge config schema uses no default bridgeUrl', () => {
  const result = McpWebConfigSchema.safeParse({
    name: 'Test Bridge',
    description: 'Test description',
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.bridgeUrl).toBeUndefined();
  }
});

test('Bridge config schema keeps the agentUrl protocol', () => {
  const result = McpWebConfigSchema.safeParse({
    name: 'Test Bridge',
    description: 'Test description',
    bridgeUrl: 'localhost:4001',
    agentUrl: 'https://agent.example.com',
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.agentUrl).toBe('https://agent.example.com');
  }
});

test('Bridge config schema requires name and description', () => {
  const result = McpWebConfigSchema.safeParse({
    bridgeUrl: 'localhost:4001',
  });

  expect(result.success).toBe(false);
});
