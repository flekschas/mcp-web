# MCP-Web Demos Deployment

Deployment configuration for the MCP-Web demos (HiGlass, Todo, Checkers) on
Cloudflare Workers.

> For local development use the `demos/<demo>` directories, which have
> hot-reload. This directory is for deployment.

## Architecture

Each demo is one Worker that serves the built frontend from static assets and
routes bridge traffic to Durable Objects:

```
                    ┌─────────────────────────────┐
  browser ─────────►│ Worker                      │
   (WebSocket)      │  ├─ static assets (frontend)│
                    │  └─ router                  │
  MCP client ──────►│         │                   │
   (HTTP/SSE)       └─────────┼───────────────────┘
                              ▼
                    ┌─────────────────────────────┐
                    │ Durable Object (per room)   │
                    │  MCPWebBridge core          │
                    └─────────────────────────────┘
```

A **room** is derived from the auth token, which the frontend persists in
`localStorage`. One visitor therefore gets one Durable Object, holding their
WebSocket sessions and the MCP client requests that target them. An object is
evicted once nothing is connected to it, and nothing wakes it again until the
next request.

| Deployment | Domain |
|---|---|
| `mcp-web-higlass` | `higlass.demo.mcp-web.dev` |
| `mcp-web-todo` | `todo.demo.mcp-web.dev` |
| `mcp-web-checkers` | `checkers.demo.mcp-web.dev` |
| `mcp-web-checkers-agent` | `checkers-agent.demo.mcp-web.dev` |

## Directory Structure

```
demos/deploy/
├── package.json               # Workspace package; owns wrangler + deploy scripts
├── higlass/
│   ├── worker.ts              # Worker entry point
│   ├── wrangler.jsonc
│   └── mcp-web.config.ts      # Bridge config, also copied into the frontend build
├── todo/                      # same shape
└── checkers/
    ├── worker.ts              # Bridge worker
    ├── agent-worker.ts        # AI agent worker
    ├── wrangler.jsonc
    ├── wrangler.agent.jsonc
    └── mcp-web.config.ts
```

The checkers agent logic lives in `demos/checkers/agent.ts` as a runtime-agnostic
Hono app; `agent-worker.ts` only builds its config from the Worker `env`.

## Local Development

Build the frontend first — the Worker serves it from the `assets` directory:

```bash
pnpm install
pnpm build:packages

cd demos/todo && pnpm build && cd -

cd demos/deploy
pnpm dev:todo        # http://localhost:8787
```

The same works for `dev:higlass`, `dev:checkers`, and `dev:checkers-agent`.
`wrangler dev` runs the real workerd runtime with local Durable Objects, so
behaviour matches production closely.

The `vars` in each config point at the deployed hostnames. Checkers needs two
Workers, so override both sides or the local bridge sends its queries to the
production agent and the production agent calls back to the production bridge.
Each `wrangler dev` also needs its own inspector port:

```bash
cd demos/deploy

# No `--` before the flags: pnpm passes it through, and wrangler stops reading
# options there, so everything after it would be ignored.
pnpm dev:checkers --port 8787 --inspector-port 9230 \
  --var AGENT_URL:http://localhost:8788

pnpm dev:checkers-agent --port 8788 --inspector-port 9231 \
  --var BRIDGE_URL:http://localhost:8787 \
  --var ALLOWED_ORIGINS:http://localhost:8787
```

A production build of a demo drops `bridgeUrl` and takes the bridge host from
the page, so the bridge follows whatever port it is served on. The agent address
does not: build `demos/checkers` with a `mcp-web.config.ts` whose `agentUrl` is
`http://localhost:8788` before serving it this way.

## Deployment

### One-time setup

1. **Authenticate:** `npx wrangler login`

2. **Add the custom domains.** The `routes` entry in each `wrangler.jsonc`
   claims the hostname; the zone must already exist in the Cloudflare account.

   A hostname that already has a DNS record — these demos were served from
   Render, so each has a `CNAME` — cannot be claimed by a Worker Custom Domain.
   Delete the existing record in the zone's DNS tab first; `wrangler deploy`
   then creates the Custom Domain record itself. Check what is there with:

   ```bash
   dig +short CNAME checkers.demo.mcp-web.dev
   ```

3. **Set the checkers agent secrets:**

   ```bash
   cd demos/deploy
   npx wrangler secret put ANTHROPIC_API_KEY --config checkers/wrangler.agent.jsonc
   ```

   `OPENAI_API_KEY`, `GOOGLE_API_KEY`, and `CEREBRAS_API_KEY` are optional.
   `BRIDGE_URL`, `ALLOWED_ORIGINS`, `MODEL_PROVIDER`, and `MODEL_NAME` are
   settings, not secrets, so they belong in `vars` in the config.

4. **Add CI secrets** to the GitHub repository: `CLOUDFLARE_API_TOKEN` (with
   the *Edit Cloudflare Workers* template) and `CLOUDFLARE_ACCOUNT_ID`.

### Manual deploy

```bash
cd demos/todo && pnpm build && cd -   # assets must exist before deploying

cd demos/deploy
pnpm deploy:todo
```

### Automated deploy

`.github/workflows/deploy-demos.yml` builds each frontend and runs
`wrangler deploy` on every push to `main` that touches `demos/` or `packages/`.
Use the workflow's `demo` input to deploy just one.

## How Requests Are Routed

`run_worker_first` in each `wrangler.jsonc` lists the paths the Worker must see
before asset routing does. Everything else — hashed JS, CSS, images — is served
straight from Cloudflare's asset storage and never bills a Worker request.

The Worker claims a request when it is a WebSocket upgrade, an agent callback on
`/query/:uuid/*`, any non-GET method, a `GET` that accepts `text/event-stream`,
or a `GET` on `/` that accepts `application/json`. A normal browser navigation
falls through to the assets binding, with `index.html` as the SPA fallback, and
so does an application's own JSON file.

Rooms are resolved in the same order the bridge itself resolves sessions:

| Request | Room comes from |
|---|---|
| WebSocket upgrade | `room` query parameter, sent by the frontend |
| Agent callback `/query/:uuid/*` | query index lookup |
| MCP request carrying a query id | query index lookup |
| MCP follow-up with only `Mcp-Session-Id` | room prefix inside that id |
| Any other MCP request | SHA-256 of the auth token |
| No token at all (preflight, server info) | shared `anonymous` object |

The query index is a single Durable Object mapping query uuid to room. Agent
callbacks carry only a uuid, so without it the router would have nothing to key
on.

`Mcp-Session-Id` is opaque to clients, so the Worker prefixes the room onto the
id the core issues and strips it again on the way in. A Remote MCP client sends
nothing but that header when it opens its stream or closes its session.

## Cost

Durable Objects are available on the Workers Free plan using the SQLite storage
backend, which is what `migrations.new_sqlite_classes` selects. Free tier
allowances are 100,000 requests/day and 13,000 GB-s/day of Durable Object
compute, with incoming WebSocket messages billed at 20:1.

Objects currently accept sockets with `accept()` rather than the Hibernation
API, so one stays live — and accrues duration — for as long as a visitor is
connected. That is the main thing to watch if the demos get busy. Hibernation
would require moving the per-session tool and resource registries out of memory
into storage.

## Monitoring

Each Worker exposes `/health`:

```bash
curl https://todo.demo.mcp-web.dev/health
```

`observability.enabled` is set in every config, so logs are available in the
Cloudflare dashboard under Workers & Pages → the Worker → Logs. Live tail:

```bash
cd demos/deploy
npx wrangler tail --config todo/wrangler.jsonc
```

## Troubleshooting

**Frontend loads but never connects.** Check the browser console for the
WebSocket URL. It must point at the same host the Worker serves, which comes
from `bridgeUrl` in `mcp-web.config.ts` — and that file has to be copied into
the demo directory before the frontend build.

**`GET /` returns JSON instead of the app.** Something is sending
`Accept: application/json`; the bridge claims those. Browsers send
`text/html`, so this only shows up with `curl`.

**WebSocket upgrade returns index.html.** `run_worker_first` is missing `"/"`
in that demo's `wrangler.jsonc`, so asset routing answered before the Worker.

**Agent callbacks 404.** The query index binding is missing. Only the checkers
config declares `MCP_WEB_QUERY_INDEX`, and only its `worker.ts` exports the
`MCPWebQueryIndex` class.

**Deploy fails on the assets directory.** The frontend has not been built. Run
`pnpm build` in `demos/<demo>` first.
