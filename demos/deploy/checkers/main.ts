import { createDemoServer } from '../lib/create-demo-server.ts';
import config from './mcp-web.config.ts';

createDemoServer({
  bridge: config,
  staticDir: './static',
}, import.meta.url);
