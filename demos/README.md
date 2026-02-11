# Demos

## Development

To run these demos locally and test the Remote MCP server you need do the
following:

1. Install [mkcert](https://github.com/FiloSottile/mkcert) and set it up via `mkcert -instal` to use HTTPS locally.
2. Install [ngrok](https://ngrok.com/) and set it up
3. In root, install and build packages via `pnpm install` && `pnpm run build`
4. Within either demo, start the servers via `pnpm run dev:ssl`
4. Start ngrok via `ngrok http https://localhost:3001` and remember the _forwarding URL_ (something like https://bla-blub-jones.ngrok-free.dev)
5. Open the demo, click on the MCP button, and copy the auth token
6. In your AI app, connect to the follwing remote MCP URL: <FORWARDING_URL>?token=<AUTH_TOKEN>

   - In Claude Desktop, you can add this under: `Settings → Connectors → Add custom connector`

This exposes your local MCP server to the web so AI app can query it as if it
was a remote MCP server.
