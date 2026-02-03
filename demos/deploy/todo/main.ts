import { createDemoServer } from '../lib/create-demo-server.ts';

createDemoServer({
  bridge: {
    name: 'MCP-Web Todo Demo',
    description:
      'Manage a todo list - add, complete, delete, and organize tasks',
  },
  staticDir: './static',
});
