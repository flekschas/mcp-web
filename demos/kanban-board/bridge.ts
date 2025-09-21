import { Bridge } from '@mcp-web/bridge';

new Bridge({
  name: 'Kanban Board',
  description: 'Control a project management kanban board',
  icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjE2IiB4PSI2IiB5PSI0IiByeD0iMiIvPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEyIiB4PSIxNCIgeT0iNCIgcng9IjIiLz48L3N2Zz4='
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down MCP Bridge...');
  process.exit(0);
});
