import { createDemoServerNode } from '../lib/create-demo-server-node.ts';
import config from './mcp-web.config.ts';

createDemoServerNode(
  {
    bridge: config,
    staticDir: './static',
  },
  import.meta.url,
);
