#!/usr/bin/env node

import { Client } from './client.js';

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down MCP Bridge Client...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down MCP Bridge Client...');
  process.exit(0);
});

// Start the client
const client = new Client();
client.run().catch((error) => {
  console.error('Failed to start MCP Bridge Client:', error);
  process.exit(1);
});
