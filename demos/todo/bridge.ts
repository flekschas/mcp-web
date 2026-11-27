#!/usr/bin/env tsx

import { MCPWebBridgeNode } from '@mcp-web/bridge';
import type { MCPWebBridgeNodeSSLConfig } from '@mcp-web/bridge';
import config from './mcp-web.config.js';

// The port of `bridgeUrl` in mcp-web.config.ts
const BRIDGE_PORT = 3001;

const useSSL = process.argv.includes('--ssl');

let ssl: MCPWebBridgeNodeSSLConfig | undefined;
if (useSSL) {
  const { readFileSync } = await import('node:fs');
  const { homedir } = await import('node:os');
  const { join } = await import('node:path');

  // Load SSL certificates from vite-plugin-mkcert's cache directory
  const mkcertDir = join(homedir(), '.vite-plugin-mkcert');
  try {
    ssl = {
      key: readFileSync(join(mkcertDir, 'dev.pem')),
      cert: readFileSync(join(mkcertDir, 'cert.pem')),
    };
  } catch {
    console.error(
      'SSL certificates not found. Run `pnpm dev:ssl` for the Vite app first to generate them,',
      'or use `pnpm dev` to run without SSL.',
    );
    process.exit(1);
  }
}

const bridge = new MCPWebBridgeNode({
  name: 'MCP-Web Todo App (React)',
  description: 'Simple todo application with React + Jotai demonstrating MCP Web integration',
  port: BRIDGE_PORT,
  ssl,
  icon: config.icon,
  mcpApp: config.mcpApp,
});

// Wait for the bridge to be ready before printing success
bridge.ready()
  .then(() => {
    const protocol = bridge.isSecure ? 'https' : 'http';
    console.log(`Frontend: ${protocol}://localhost:5175`);
  })
  .catch(() => {
    // Error already logged by MCPWebBridgeNode
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('\nShutting down MCP Bridge...');
  bridge.close().then(() => process.exit(0));
});
