import { MCPWeb } from '@mcp-web/core';
import { z } from 'zod';

/**
 * An app that exposes its tools only through WebMCP, so Playwright can call
 * them without a bridge.
 */

const mcp = new MCPWeb({
  name: 'WebMCP Test',
  description: 'Exposes tools through WebMCP',
  onlyWebMCP: true,
});

let todos: string[] = [];

mcp.addStateTools({
  name: 'todos',
  description: 'Todo items',
  get: () => todos,
  set: (value) => {
    todos = value;
  },
  schema: z.array(z.string()),
});

mcp.addTool({
  name: 'fail',
  description: 'Always fails',
  handler: () => {
    throw new Error('Something broke');
  },
});

declare global {
  interface Window {
    __webmcp: { removeTool: (name: string) => void };
  }
}

window.__webmcp = { removeTool: (name) => mcp.removeTool(name) };
