# MCP-Web: Use Frontend Apps as Tools

This system allows any web frontend application to be controlled by an AI tool (like Claude Desktop) by exposing state and actions as tools using the [MCP](https://modelcontextprotocol.io) protocol via a bridge server architecture.

## Architecture Overview

```
Frontend App ↔ MCP Bridge ↔ MCP Client ↔ AI Agent/App
```

## Quick Start

### 1. Install and Start the Bridge Server

```bash
# Install the bridge server
npm install -g @mcp-web/bridge

# Start the bridge server
mcp-bridge
# Runs on ports 3001 (WebSocket) and 3002 (MCP HTTP)
```

### 2. Install the MCP Client for Claude Desktop

```bash
# Install the client
npm install -g @your-company/mcp-client
```

### 3. Add MCP Frontend to Your Web App

#### Option A: Via npm (recommended)
```bash
npm install @your-company/mcp-frontend
```

```typescript
import MCPWeb from '@mcp-web/web';

// Initialize MCP Frontend
const mcp = new MCPWeb({
  appName: 'my-dashboard',
  bridgeUrl: 'wss://yourdomain.com:3001',
});

// Add tools that Claude can use
mcp.addTool(
  'get-user-data',
  'Get current user information from the dashboard',
  () => {
    return {
      user: getCurrentUser(),
      preferences: getUserPreferences()
    };
  }
);

mcp.addTool(
  'click-button',
  'Click a button on the page',
  (selector: string) => {
    const button = document.querySelector(selector);
    if (button) {
      (button as HTMLElement).click();
      return { success: true, message: `Clicked ${selector}` };
    }
    throw new Error(`Button not found: ${selector}`);
  },
  {
    type: "object",
    properties: {
      selector: { type: "string", description: "CSS selector for the button" }
    },
    required: ["selector"]
  }
);

// Add a screenshot tool
const screenshotTool = MCPUtils.createScreenshotTool(
  'take-screenshot',
  'Take a screenshot of the current page'
);
mcp.addTool(screenshotTool.name, screenshotTool.description, screenshotTool.handler, screenshotTool.inputSchema);
```

### 4. Configure Claude Desktop

Click the 🤖 button in your web app to get the configuration, then add to Claude Desktop:

```json
{
  "mcpServers": {
    "my-dashboard": {
      "command": "npx",
      "args": ["@mcp-web/client"],
      "env": {
        "MCP_SERVER_URL": "https://yourdomain.com:3002",
        "AUTH_TOKEN": "your-generated-auth-token-from-ui"
      }
    }
  }
}
```
