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

## Recording Demo Videos

Demos with a **Code mode** switch in the header offer their tools either one by
one or through one [code tool](https://mcp-web.dev/tools/code). Switching
reloads the page, and the browser remembers the mode, so the demo opens in the
mode it was last in.

### What the AI App Sees After Switching

The reload closes the page's connection to the bridge, and the bridge drops the
page's tools with it. The reloaded page reconnects with the same auth token and
registers its tools in the new mode. The bridge keeps no tools from the old
mode.

The bridge then sends `notifications/tools/list_changed`. With remote MCP
(custom connector), it reaches the AI app directly. With stdio
(`@mcp-web/client`), it reaches the app only if the client passes list changes
on. Either way, the next tool list the AI app fetches has the new tools, but
when it fetches one is up to the app.

### Steps

1. Start the demo and open it in **one** tab. Tabs with the same auth token
   share one tool list, so a second tab in the other mode mixes both tool sets.
2. Set the mode with the **Code mode** switch and check it in the header.
3. Check the AI app's tool list. In code mode, it shows the code tool (e.g.,
   `higlass_code`) instead of the tools that change the app.
4. If it still shows the old tools, start a new conversation. If that doesn't
   help, disconnect and reconnect the connector under `Settings → Connectors`
   (remote MCP) or quit and reopen Claude Desktop (stdio).
5. Record. Switching modes resets the demo's state, so switch before you set
   up the scene.
