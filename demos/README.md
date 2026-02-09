# Demos

## Development

To run these demos locally and test the Remote MCP server you need do the
following:

1. Install [mkcert](https://github.com/FiloSottile/mkcert) and set it up via `mkcert -instal` to use HTTPS locally.
2. Install [ngrok](https://ngrok.com/) and set it up
3. For either demo, first install the package via `pnpm install` and start start the servers via `pnpm run dev`
4. Start ngrok via `ngrok http https://localhost:3001` and remember the _forwarding URL_ (something like https://bla-blub-jones.ngrok-free.dev)
5. Open the demo, click on the MCP button, and copy the auth token
6. In Claude Desktop (or any other tool supporting remote MCP), add the follwing URL: <FORWARDING_URL>?token=<AUTH_TOKEN>

This exposes your local MCP server to the web so Claude can query it as if it
was a remote MCP server.
