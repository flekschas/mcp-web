const config = {
  name: 'MCP-Web Todo',
  description: 'Manage a todo list - add, complete, delete, and organize tasks',
  bridgeUrl: 'todo.demo.mcp-web.dev',
  autoConnect: true,
  icon: 'https://storage.googleapis.com/mcp-web/favicon-todo.svg',
  // An open page keeps the hosted bridge running and billed.
  idleTimeoutMs: 15 * 60 * 1000,
};

export default config;
