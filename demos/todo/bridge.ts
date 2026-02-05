#!/usr/bin/env tsx

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { MCPWebBridgeNode } from '@mcp-web/bridge';

// Port constant shared with mcp-web.config.ts (but we can't import it because
// that file uses Vite-specific import.meta.env which doesn't work in tsx)
const BRIDGE_PORT = 3001;

// Load SSL certificates from vite-plugin-mkcert's cache directory
// This ensures the bridge uses the same certificates as Vite for local development
const mkcertDir = join(homedir(), '.vite-plugin-mkcert');

let ssl: { key: Buffer; cert: Buffer } | undefined;
try {
  ssl = {
    key: readFileSync(join(mkcertDir, 'dev.pem')),
    cert: readFileSync(join(mkcertDir, 'cert.pem')),
  };
  console.log('Starting MCP Bridge with SSL (using vite-plugin-mkcert certificates)...');
} catch {
  console.log('Starting MCP Bridge without SSL (no mkcert certificates found)...');
  console.log('  Run the Vite dev server first to generate certificates.');
}

const bridge = new MCPWebBridgeNode({
  name: 'MCP-Web Todo App (React)',
  description: 'Simple todo application with React + Jotai demonstrating MCP Web integration',
  port: BRIDGE_PORT,
  ssl,
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
