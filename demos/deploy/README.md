# MCP-Web Demos Deployment

This directory contains deployment configurations for deploying the MCP-Web
demos (HiGlass, Todo, Checkers) to Deno Deploy Classic.

> **Note:** This directory is used by GitHub Actions for deployment only.
> For local development, use the `demos/<demo>` directories with Node.js/pnpm.

## Architecture

Each demo is deployed as a fully isolated instance with its own bridge server:

```
higlass.demo.mcp-web.dev  → HiGlass bridge + frontend
todo.demo.mcp-web.dev     → Todo bridge + frontend
checkers.demo.mcp-web.dev → Checkers bridge + frontend
checkers-agent.demo.mcp-web.dev → Checkers AI agent
```

## Directory Structure

```
demos/deploy/
├── lib/
│   └── create-demo-server.ts    # Shared server template
├── higlass/
│   ├── main.ts                  # Entry point (source)
│   ├── server.bundle.js         # Bundled server (gitignored)
│   ├── deno.json                # Deno config
│   └── static/                  # Built frontend (gitignored)
├── todo/
│   ├── main.ts
│   ├── server.bundle.js
│   ├── deno.json
│   └── static/
├── checkers/
│   ├── main.ts                  # Bridge entry point (source)
│   ├── serve-agent.ts           # AI agent entry point (source)
│   ├── server.bundle.js         # Bundled bridge (gitignored)
│   ├── agent.bundle.js          # Bundled agent (gitignored)
│   ├── deno.json
│   └── static/
└── README.md                    # This file
```

**Note:** The checkers agent logic lives in `demos/checkers/agent.ts` and is shared
between local development (Node.js) and deployment (Deno). The `serve-agent.ts` files
in each environment are thin wrappers that handle runtime-specific concerns.

## Pre-Bundling for Deno Deploy Classic

Deno Deploy Classic doesn't bundle code at deployment time—it runs imports directly.
Since our `@mcp-web/*` packages aren't published to npm, we pre-bundle the server
code with esbuild before deploying.

### How It Works

1. **Source files** (`main.ts`, `serve-agent.ts`) import from `@mcp-web/bridge`, etc.
2. **Bundle script** (`scripts/bundle-servers.ts`) uses esbuild to create self-contained bundles
3. **Bundle outputs** (`server.bundle.js`, `agent.bundle.js`) have all dependencies inlined
4. **Deno Deploy** runs the bundles directly with no runtime import resolution needed

### Building Bundles Locally

```bash
# From repo root
pnpm install
pnpm build           # Build all packages first
pnpm bundle:servers  # Create .bundle.js files
```

This creates:
- `demos/deploy/higlass/server.bundle.js`
- `demos/deploy/todo/server.bundle.js`
- `demos/deploy/checkers/server.bundle.js`
- `demos/deploy/checkers/agent.bundle.js`

### Testing Bundles with Deno

```bash
# Test a bundled server locally
cd demos/deploy/todo
deno task start   # Runs server.bundle.js

cd demos/deploy/checkers
deno task start   # Runs server.bundle.js
deno task agent   # Runs agent.bundle.js
```

## Local Development

For local development, use the Node.js setup in the main demo directories:

```bash
# Install dependencies (from repo root)
pnpm install

# Run a demo locally
cd demos/todo
pnpm dev          # Starts frontend dev server

cd demos/checkers
pnpm dev          # Starts frontend dev server
pnpm bridge       # Starts bridge server (separate terminal)
```

> **Why not use `demos/deploy/` locally?**
> The deploy configurations use bundled files that need to be built first.
> For active development, the main demo directories with hot-reload are easier.

## Deployment to Deno Deploy Classic

### One-Time Setup

1. **Create Deno Deploy Classic projects:**
   - Go to [dash.deno.com](https://dash.deno.com)
   - Create 4 projects (click "Just link the repo, I'll set up GitHub Actions myself"):
     - `mcp-web-higlass`
     - `mcp-web-todo`
     - `mcp-web-checkers`
     - `mcp-web-checkers-agent`

2. **Link GitHub repository:**
   - In each project, go to Settings → GitHub
   - Connect your repository
   - Select "GitHub Actions" as the deployment method

3. **Configure custom domains:**
   - In each project, go to Settings → Domains
   - Add custom domains:
     - `mcp-web-higlass` → `higlass.demo.mcp-web.dev`
     - `mcp-web-todo` → `todo.demo.mcp-web.dev`
     - `mcp-web-checkers` → `checkers.demo.mcp-web.dev`
     - `mcp-web-checkers-agent` → `checkers-agent.demo.mcp-web.dev`

4. **Configure DNS (at your DNS provider):**
   ```
   CNAME higlass.demos        mcp-web-higlass.deno.dev
   CNAME todo.demos           mcp-web-todo.deno.dev
   CNAME checkers.demos       mcp-web-checkers.deno.dev
   CNAME checkers-agent.demos mcp-web-checkers-agent.deno.dev
   ```

5. **Set environment variables (Checkers Agent only):**
   - Go to `mcp-web-checkers-agent` → Settings → Environment Variables
   - Add:
     - `ANTHROPIC_API_KEY` (required)
     - `GOOGLE_API_KEY` (optional)
     - `OPENAI_API_KEY` (optional)
     - `MODEL_PROVIDER` (optional, e.g., `anthropic`)
     - `BRIDGE_URL` = `https://checkers.demo.mcp-web.dev`
     - `ALLOWED_ORIGINS` = `https://checkers.demo.mcp-web.dev`

   - Go to `mcp-web-checkers` → Settings → Environment Variables
   - Add:
     - `AGENT_URL` = `https://checkers-agent.demo.mcp-web.dev`

### Automated Deployment

GitHub Actions automatically deploys on push to `main` when files in `demos/` or `packages/` change.

**Workflow:** `.github/workflows/deploy-demos.yml`

**Manual deployment:**
```bash
# Via GitHub UI
Go to Actions → Deploy Demos to Deno Deploy → Run workflow

# Or push to main
git push origin main
```

**Deploy specific demo:**
```bash
# Via GitHub UI with input parameter
Actions → Deploy Demos → Run workflow → Select demo (higlass/todo/checkers)
```

### Build Process

The GitHub Actions workflow:
1. Installs dependencies (`pnpm install`)
2. Builds all packages (`pnpm build`)
3. Builds each demo frontend (`pnpm build` in demo directory)
4. Bundles servers with esbuild (`pnpm bundle:servers`)
5. Uploads artifacts (frontend dist + server bundles)
6. Deploy jobs download artifacts and deploy via `deployctl`

The bundled `.js` files are self-contained—no npm imports to resolve at runtime.

## Monitoring

### Health Checks

Each deployment exposes a `/health` endpoint:

```bash
curl https://higlass.demo.mcp-web.dev/health
curl https://todo.demo.mcp-web.dev/health
curl https://checkers.demo.mcp-web.dev/health
curl https://checkers-agent.demo.mcp-web.dev/health
```

### Logs

View logs in Deno Deploy dashboard:
- Go to your project → Logs
- Real-time log streaming
- Error tracking

### Metrics

Deno Deploy provides:
- Request count
- Response time
- Error rate
- Bandwidth usage

## Troubleshooting

### Frontend not connecting to bridge

Check browser console for WebSocket connection errors:
- Verify `VITE_BRIDGE_HOST` and `VITE_BRIDGE_PORT` in `.env.production`
- Check that bridge is running at expected URL
- Verify CORS settings

### Checkers agent not responding

1. Check environment variables are set correctly
2. Verify API keys are valid
3. Check agent logs in Deno Deploy dashboard
4. Test health endpoint: `curl https://checkers-agent.demo.mcp-web.dev/health`

### Build failures

1. Ensure all packages are built first: `pnpm build`
2. Check for TypeScript errors: `pnpm typecheck`
3. Verify demo builds locally: `cd demos/<demo> && pnpm build`
4. Verify bundles build: `pnpm bundle:servers`

### Deployment failures

1. Check GitHub Actions logs
2. Verify Deno Deploy project names match workflow
3. Ensure GitHub repository is linked in Deno Deploy
4. Check deployment permissions (id-token: write)

### Bundle issues

If bundles fail to build:
1. Check that all packages are built: `pnpm build`
2. Look for import errors in `scripts/bundle-servers.ts`
3. Run `pnpm bundle:servers` locally to see detailed errors

If bundles fail at runtime on Deno:
1. Check for Node.js-specific APIs that aren't available in Deno
2. Verify the bundle includes all necessary dependencies
3. Test locally with `deno run --allow-all demos/deploy/<demo>/server.bundle.js`

## Rollback

To rollback to a previous deployment:

1. Go to Deno Deploy project
2. Click "Deployments" tab
3. Find previous successful deployment
4. Click "Promote to Production"

## Cost

Deno Deploy pricing:
- **Free tier:** 100K requests/day, 100GB bandwidth/month
- **Pro:** $20/month per project for higher limits

For demo purposes, free tier should be sufficient.

## Security

- API keys stored in Deno Deploy environment variables (not in code)
- CORS configured to only allow same-origin requests
- WebSocket sessions auto-cleanup on disconnect
- All traffic over HTTPS

## Support

For issues:
- Check deployment logs in Deno Deploy dashboard
- Review GitHub Actions workflow logs
