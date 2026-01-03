import { MCPWebClient, type MCPWebClientConfig, type Query } from "@mcp-web/client";

export class MockAgentServer {
  private server: ReturnType<typeof Bun.serve>;

  constructor(
    mcpWebClientConfig: MCPWebClientConfig,
    queryHandler: (contexualizedClient: MCPWebClient, query: Query) => Promise<void>,
    port: number = 3003,
    queryEndpoint: string = '/query',
  ) {
    this.server = Bun.serve({
      port,
      async fetch(req) {
        const url = new URL(req.url);

        const client = new MCPWebClient(mcpWebClientConfig);

        const handleQuery = (query: Query) => queryHandler(client.contextualize(query), query);

        if (req.method === 'PUT' && url.pathname.startsWith(`${queryEndpoint}/`)) {
          const query = await req.json() as Query;
          setTimeout(() => { handleQuery(query) }, 0);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('Not found', { status: 404 });
      }
    });
  }

  async stop() {
    this.server.stop(true);
    // Wait a bit for the port to be released
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
