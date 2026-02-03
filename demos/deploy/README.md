# MCP-Web Demos Deployment

This directory contains deployment configurations for deploying the MCP-Web
demos (HiGlass, Todo, Checkers) to Deno Deploy.

## Architecture

Each demo is deployed as a fully isolated instance with its own bridge server:

```
higlass.demos.mcp-web.dev  → HiGlass bridge + frontend
todo.demos.mcp-web.dev     → Todo bridge + frontend
checkers.demos.mcp-web.dev → Checkers bridge + frontend
checkers-agent.demos.mcp-web.dev → Checkers AI agent
```

## Directory Structure

```
demos/deploy/
├── lib/
│   └── create-demo-server.ts    # Shared server template
├── higlass/
│   ├── main.ts                  # Entry point
│   ├── deno.json                # Deno config
│   └── static/                  # Built frontend (gitignored)
├── todo/
│   ├── main.ts
│   ├── deno.json
│   └── static/
├── checkers/
│   ├── main.ts                  # Bridge entry point
│   ├── serve-agent.ts           # AI agent entry point (imports from demos/checkers/agent.ts)
│   ├── deno.json
│   └── static/
└── README.md                    # This file
```

**Note:** The checkers agent logic lives in `demos/checkers/agent.ts` and is shared
between local development (Node.js) and deployment (Deno). The `serve-agent.ts` files
in each environment are thin wrappers that handle runtime-specific concerns.

## Local Development

### Prerequisites

- [Deno](https://deno.land/) 2.x or later
- pnpm (for building frontends)

### Testing Locally

1. **Build all demos:**
   ```bash
   ./scripts/build-demos.sh
   ```

2. **Run a demo locally:**
   ```bash
   # HiGlass
   cd demos/deploy/higlass
   deno task dev

   # Todo
   cd demos/deploy/todo
   deno task dev

   # Checkers (bridge)
   cd demos/deploy/checkers
   deno task dev
   
   # Checkers (agent - in separate terminal)
   cd demos/deploy/checkers
   ANTHROPIC_API_KEY=sk-xxx deno task dev:agent
   ```

3. **Open in browser:**
   - Frontend: `http://localhost:8000`
   - Health check: `http://localhost:8000/health`
   - MCP config: `http://localhost:8000/config`

## Deployment to Deno Deploy

### One-Time Setup

1. **Create Deno Deploy projects:**
   - Go to [dash.deno.com](https://dash.deno.com)
   - Create 4 projects:
     - `mcp-web-higlass`
     - `mcp-web-todo`
     - `mcp-web-checkers`
     - `mcp-web-checkers-agent`

2. **Link GitHub repository:**
   - In each project, go to Settings → GitHub
   - Connect your repository
   - Set up automatic deployments

3. **Configure custom domains:**
   - In each project, go to Settings → Domains
   - Add custom domains:
     - `mcp-web-higlass` → `higlass.demos.mcp-web.dev`
     - `mcp-web-todo` → `todo.demos.mcp-web.dev`
     - `mcp-web-checkers` → `checkers.demos.mcp-web.dev`
     - `mcp-web-checkers-agent` → `checkers-agent.demos.mcp-web.dev`

4. **Configure DNS (at your DNS provider):**
   ```
   CNAME higlass.demos        <deno-deploy-domain>
   CNAME todo.demos           <deno-deploy-domain>
   CNAME checkers.demos       <deno-deploy-domain>
   CNAME checkers-agent.demos <deno-deploy-domain>
   ```

5. **Set environment variables (Checkers Agent only):**
   - Go to `mcp-web-checkers-agent` → Settings → Environment Variables
   - Add:
     - `ANTHROPIC_API_KEY` (required)
     - `GOOGLE_API_KEY` (optional)
     - `OPENAI_API_KEY` (optional)
     - `MODEL_PROVIDER` (optional, e.g., `anthropic`)
     - `BRIDGE_URL` = `https://checkers.demos.mcp-web.dev`
     - `ALLOWED_ORIGINS` = `https://checkers.demos.mcp-web.dev`

   - Go to `mcp-web-checkers` → Settings → Environment Variables
   - Add:
     - `AGENT_URL` = `https://checkers-agent.demos.mcp-web.dev`

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
1. Installs dependencies
2. Builds all packages
3. Builds each demo frontend with production config
4. Uploads build artifacts
5. Deploys to Deno Deploy

## Monitoring

### Health Checks

Each deployment exposes a `/health` endpoint:

```bash
curl https://higlass.demos.mcp-web.dev/health
curl https://todo.demos.mcp-web.dev/health
curl https://checkers.demos.mcp-web.dev/health
curl https://checkers-agent.demos.mcp-web.dev/health
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
4. Test health endpoint: `curl https://checkers-agent.demos.mcp-web.dev/health`

### Build failures

1. Ensure all packages are built first: `pnpm build`
2. Check for TypeScript errors: `pnpm typecheck`
3. Verify demo builds locally: `cd demos/<demo> && pnpm build`

### Deployment failures

1. Check GitHub Actions logs
2. Verify Deno Deploy project names match workflow
3. Ensure GitHub repository is linked in Deno Deploy
4. Check deployment permissions (id-token: write)

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
