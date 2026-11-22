import { expect, test } from 'bun:test';
import { z } from 'zod';
import { MCPWeb } from './web.js';

test('removing without a connection works in a runtime without WebSocket', () => {
  const globals = globalThis as { WebSocket?: unknown };
  const webSocket = globals.WebSocket;
  delete globals.WebSocket;
  try {
    const mcp = new MCPWeb({
      name: 'test',
      description: 'Test app',
      autoConnect: false,
    });
    mcp.addTool({
      name: 'tool',
      description: 'A tool',
      inputSchema: z.object({}),
      handler: () => ({}),
    });
    mcp.addResource({
      uri: 'test://resource',
      name: 'resource',
      handler: () => '',
    });

    mcp.removeTool('tool');
    mcp.removeResource('test://resource');

    expect(mcp.tools.size).toBe(0);
    expect(mcp.resources.size).toBe(0);
  } finally {
    globals.WebSocket = webSocket;
  }
});
