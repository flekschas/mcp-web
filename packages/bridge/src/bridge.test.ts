import { test, expect } from 'bun:test';
import { McpWebConfigSchema } from '@mcp-web/types';

test('Bridge config schema validates valid configuration', () => {
  const result = McpWebConfigSchema.safeParse({
    wsPort: 4001,
    mcpPort: 4002,
    name: 'Test Bridge',
    description: 'Test description',
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.wsPort === 4001).toBe(true);
    expect(result.data.mcpPort === 4002).toBe(true);
  }
});

test('Bridge config schema rejects invalid port numbers', () => {
  const result = McpWebConfigSchema.safeParse({
    name: 'Test Bridge',
    description: 'Test description',
    wsPort: -1,
    mcpPort: 4002,
  });

  expect(result.success).toBe(false);
});

test('Bridge config schema accepts agentUrl', () => {
  const result = McpWebConfigSchema.safeParse({
    name: 'Test Bridge',
    description: 'Test description',
    wsPort: 4001,
    mcpPort: 4002,
    agentUrl: 'http://localhost:3003',
  });

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.agentUrl === 'http://localhost:3003').toBe(true);
  }
});

test('Bridge config schema requires name and description', () => {
  const result = McpWebConfigSchema.safeParse({
    wsPort: 4001,
    mcpPort: 4002,
  });

  expect(result.success).toBe(false);
});
