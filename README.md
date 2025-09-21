# MCP Frontend Integration System

This system allows any web frontend to be controlled by Claude Desktop through a bridge server architecture.

## Architecture Overview

```
Claude Desktop ↔ MCP Client ↔ MCP Bridge ↔ Frontend App
```

## Quick Start

### 1. Install and Start the Bridge Server

```bash
# Install the bridge server
npm install -g @your-company/mcp-bridge

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
import MCPFrontend, { MCPUtils } from '@your-company/mcp-frontend';

// Initialize MCP Frontend
const mcp = new MCPFrontend({
  appName: 'my-dashboard',
  bridgeUrl: 'wss://yourdomain.com:3001', // or ws://localhost:3001 for local dev
  enableUI: true
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

#### Option B: Direct browser usage
```html
<script src="https://unpkg.com/@your-company/mcp-frontend/dist/index.umd.js"></script>
<script>
  const mcp = new MCPFrontend({
    appName: 'my-dashboard',
    enableUI: true
  });

  // Add tools
  mcp.addTool('get-page-title', 'Get the page title', () => document.title);
  
  mcp.addTool(
    'fill-form-field',
    'Fill a form field with text',
    (selector, value) => {
      const field = document.querySelector(selector);
      if (field) {
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        return { success: true };
      }
      throw new Error('Field not found');
    }
  );
</script>
```

### 4. Configure Claude Desktop

Click the 🤖 button in your web app to get the configuration, then add to Claude Desktop:

```json
{
  "mcpServers": {
    "my-dashboard": {
      "command": "npx",
      "args": ["@your-company/mcp-client"],
      "env": {
        "MCP_SERVER_URL": "https://yourdomain.com:3002",
        "AUTH_TOKEN": "your-generated-auth-token-from-ui"
      }
    }
  }
}
```

## Real-World Examples

### E-commerce Dashboard
```typescript
const mcp = new MCPFrontend({ appName: 'ecommerce-dashboard' });

// Get sales data
mcp.addTool(
  'get-sales-summary',
  'Get current sales summary',
  () => {
    const revenue = document.querySelector('.revenue-total')?.textContent;
    const orders = document.querySelector('.orders-count')?.textContent;
    const topProduct = document.querySelector('.top-product')?.textContent;
    
    return {
      revenue,
      orders,
      topProduct,
      timestamp: new Date().toISOString()
    };
  }
);

// Export data
mcp.addTool(
  'export-sales-report',
  'Export sales report as CSV',
  (dateRange: string) => {
    // Trigger existing export functionality
    const exportBtn = document.querySelector(`[data-export="${dateRange}"]`);
    exportBtn?.click();
    return { message: `Export started for ${dateRange}` };
  },
  {
    type: "object",
    properties: {
      dateRange: { 
        type: "string", 
        enum: ["today", "week", "month", "quarter"],
        description: "Date range for export" 
      }
    },
    required: ["dateRange"]
  }
);
```

### Analytics Platform
```typescript
const mcp = new MCPFrontend({ appName: 'analytics-platform' });

// Get chart data as image
mcp.addTool(
  'get-chart-image',
  'Get a chart as PNG image',
  async (chartId: string) => {
    const chartElement = document.querySelector(`#${chartId}`);
    if (!chartElement) {
      throw new Error(`Chart not found: ${chartId}`);
    }
    
    // Use html2canvas to capture the chart
    const canvas = await html2canvas(chartElement);
    return canvas.toDataURL('image/png');
  },
  {
    type: "object",
    properties: {
      chartId: { type: "string", description: "ID of the chart element" }
    },
    required: ["chartId"]
  }
);

// Switch dashboard views
mcp.addTool(
  'switch-view',
  'Switch to a different dashboard view',
  (viewName: string) => {
    const viewTab = document.querySelector(`[data-view="${viewName}"]`);
    if (viewTab) {
      (viewTab as HTMLElement).click();
      return { success: true, activeView: viewName };
    }
    throw new Error(`View not found: ${viewName}`);
  }
);
```

### CRM System
```typescript
const mcp = new MCPFrontend({ appName: 'crm-system' });

// Search contacts
mcp.addTool(
  'search-contacts',
  'Search for contacts in the CRM',
  (query: string) => {
    const searchInput = document.querySelector('#contact-search') as HTMLInputElement;
    searchInput.value = query;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Wait for results and return them
    setTimeout(() => {
      const results = Array.from(document.querySelectorAll('.contact-item')).map(item => ({
        name: item.querySelector('.contact-name')?.textContent,
        email: item.querySelector('.contact-email')?.textContent,
        company: item.querySelector('.contact-company')?.textContent
      }));
      return results;
    }, 1000);
  }
);

// Create new contact
mcp.addTool(
  'create-contact',
  'Create a new contact',
  (contactData: any) => {
    // Fill out the new contact form
    document.querySelector('#new-contact-name').value = contactData.name;
    document.querySelector('#new-contact-email').value = contactData.email;
    document.querySelector('#new-contact-company').value = contactData.company;
    
    // Submit the form
    document.querySelector('#create-contact-btn').click();
    
    return { success: true, message: 'Contact creation initiated' };
  },
  {
    type: "object",
    properties: {
      contactData: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          company: { type: "string" }
        },
        required: ["name", "email"]
      }
    },
    required: ["contactData"]
  }
);
```

## Claude Desktop Usage Examples

Once configured, you can ask Claude:

### Basic Queries
```
"What's the current revenue showing on my dashboard?"
"Take a screenshot of the analytics page"
"Click the export button for this month's data"
```

### Multi-step Tasks
```
"Search for contacts from Acme Corp, then create a follow-up task for the first result"
"Show me the sales chart and explain the trend I'm seeing"
"Export the quarterly report and tell me what the key metrics indicate"
```

### Session Management
```
"List my active dashboard sessions"
"Switch to the analytics view and get the conversion rate chart"
"On my CRM session, find all contacts added this week"
```

## Deployment Options

### Option 1: Self-hosted Bridge
- Deploy bridge server on your domain
- Frontend connects to your bridge
- Full control over security and data

### Option 2: Local Development
- Run bridge locally on localhost
- Use for development and testing
- No external dependencies

### Option 3: Hybrid Approach
- Bridge on your infrastructure
- Multiple frontend apps can connect
- Shared tools across applications

## Security Considerations

1. **Authentication**: Each session gets unique auth tokens
2. **Session Isolation**: Users can only control their own sessions
3. **Tool Permissions**: Developers control which tools are exposed
4. **Network Security**: Use WSS/HTTPS for production
5. **Rate Limiting**: Bridge can implement rate limiting per session

## Troubleshooting

### Common Issues

**Frontend can't connect to bridge:**
- Check WebSocket URL and port
- Verify CORS settings on bridge
- Ensure bridge server is running

**Claude Desktop can't find tools:**
- Verify MCP client configuration
- Check auth token is correct
- Ensure bridge HTTP server is accessible

**Tools not working:**
- Check browser console for errors
- Verify tool registration completed
- Test tools work in browser before MCP call

### Debug Mode

Enable debug logging:
```typescript
const mcp = new MCPFrontend({
  appName: 'my-app',
  debug: true  // Add debug option
});
```

## Advanced Features

### Custom Tool Schemas
```typescript
mcp.addTool(
  'complex-analysis',
  'Perform complex data analysis',
  (config: any) => {
    // Your analysis logic
  },
  {
    type: "object",
    properties: {
      metrics: {
        type: "array",
        items: { type: "string" },
        description: "Metrics to analyze"
      },
      timeframe: {
        type: "string",
        enum: ["1h", "24h", "7d", "30d"],
        description: "Analysis timeframe"
      },
      filters: {
        type: "object",
        properties: {
          category: { type: "string" },
          region: { type: "string" }
        }
      }
    },
    required: ["metrics", "timeframe"]
  }
);
```

### Async Tools
```typescript
mcp.addTool(
  'generate-report',
  'Generate a comprehensive report',
  async (reportType: string) => {
    // Start the report generation
    const reportId = await startReportGeneration(reportType);
    
    // Poll for completion
    return new Promise((resolve) => {
      const checkStatus = setInterval(async () => {
        const status = await getReportStatus(reportId);
        if (status.complete) {
          clearInterval(checkStatus);
          resolve({
            reportUrl: status.downloadUrl,
            summary: status.summary
          });
        }
      }, 2000);
    });
  }
);
```

This system provides a powerful way to make any web application controllable by Claude Desktop while maintaining security and providing a smooth developer experience.

## Development and Usage Guide

### Prerequisites

- Node.js 18+ and PNPM
- Claude Desktop application

### Installation & Build

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Or build individual packages
pnpm --filter mcp-bridge build
pnpm --filter mcp-frontend build  
pnpm --filter mcp-client build
```

### Package Usage

#### 1. Bridge Server (`packages/bridge/`)

The bridge server mediates between web frontends and Claude Desktop.

**Start the bridge:**
```bash
cd packages/bridge
pnpm build
pnpm start
# Runs WebSocket server on port 3001, MCP server on port 3002
```

**Or run directly:**
```bash
node packages/bridge/dist/index.js
```

#### 2. Frontend Library (`packages/frontend/`)

Add MCP control to any web application.

**Install in your project:**
```bash
# After building the workspace
pnpm --filter your-app add mcp-frontend@workspace:*
```

**Basic usage:**
```typescript
import MCPFrontend, { MCPUtils } from 'mcp-frontend'

const mcp = new MCPFrontend({
  appName: 'my-app',
  bridgeUrl: 'ws://localhost:3001',
  enableUI: true
})

// Add tools for Claude to use
mcp.addTool(
  'get-data',
  'Get application data',
  () => ({ status: 'active', users: 42 })
)

mcp.addTool(
  'click-button',
  'Click a button on the page',
  (selector: string) => {
    document.querySelector(selector)?.click()
    return { success: true }
  },
  {
    type: "object",
    properties: { selector: { type: "string" } },
    required: ["selector"]
  }
)
```

#### 3. MCP Client (`packages/client/`)

Connects Claude Desktop to the bridge server.

**Run the client:**
```bash
cd packages/client
pnpm build

# Set environment variables
export MCP_SERVER_URL="http://localhost:3002"
export AUTH_TOKEN="your-auth-token-from-frontend-ui"

# Run client
node dist/index.js
```

**Configure in Claude Desktop:**
```json
{
  "mcpServers": {
    "my-app": {
      "command": "node",
      "args": ["/path/to/packages/client/dist/index.js"],
      "env": {
        "MCP_SERVER_URL": "http://localhost:3002",
        "AUTH_TOKEN": "your-auth-token-from-frontend-ui"
      }
    }
  }
}
```

### Demo Application

See the React demo in `demos/react/` for a complete example:

```bash
# Build workspace first
pnpm build

# Run the demo
cd demos/react
pnpm dev
```

The demo shows:
- MCP Frontend integration with React
- Multiple tool types (counter control, DOM queries)
- Connection status monitoring
- Built-in configuration UI

### Complete Workflow

1. **Start the bridge server:**
   ```bash
   pnpm --filter mcp-bridge build && pnpm --filter mcp-bridge start
   ```

2. **Run your web application** (like the React demo):
   ```bash
   pnpm --filter mcp-frontend build
   cd demos/react && pnpm dev
   ```

3. **Get the auth token** by clicking the 🤖 button in your web app

4. **Configure Claude Desktop** with the MCP client and auth token

5. **Ask Claude** to interact with your web application!

### Example Claude Interactions

Once configured, you can ask Claude:

- "What's the current counter value in my React app?"
- "Set the counter to 100"
- "Find all buttons on the page"
- "Click the increment button"

### Troubleshooting

- **Frontend can't connect:** Check that bridge server is running on port 3001
- **Claude can't find tools:** Verify auth token and MCP server URL in Claude config
- **Import errors:** Make sure to run `pnpm build` before using the packages
