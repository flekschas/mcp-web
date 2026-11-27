# MCP Web

A TypeScript library for exposing interactive tools in your web application to Claude Desktop through the Model Context Protocol (MCP).

## Overview

MCP Web allows your web application to register tools that can be called by Claude Desktop, enabling AI-powered interactions with your web interface. Tools can read DOM elements, take screenshots, manipulate application state, and more.

## Quick Start

### Installation

```bash
npm install @mcp-web/core
```

### Basic Usage

```typescript
import { MCPWeb } from '@mcp-web/core';
import { z } from 'zod';

// Initialize MCP connection
const mcp = new MCPWeb({
  name: 'My Web App',
  description: 'Control my web application',
});

// Add a simple tool
mcp.addTool({
  name: 'get-page-title',
  description: 'Get the current page title',
  handler: () => document.title
});

// Add a tool with input validation
mcp.addTool({
  name: 'update-content',
  description: 'Update page content',
  inputSchema: z.object({
    selector: z.string().describe('CSS selector'),
    content: z.string().describe('New content')
  }),
  handler: ({ selector, content }) => {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = content;
      return { success: true };
    }
    return { success: false, error: 'Element not found' };
  }
});
```

## Built-in Tools

### Screenshot Tool
Capture screenshots of your web page or specific elements:

```typescript
import { ScreenshotTool } from '@mcp-web/core/tools/screenshot';

// Dynamic screenshots (with input)
mcp.addTool(new ScreenshotTool({
  name: 'screenshot',
  description: 'Take a screenshot of any element',
}));

// Static screenshots (no input required)
mcp.addTool(new ScreenshotTool({
  name: 'screenshot-chart',
  description: 'Take a screenshot of the chart',
  elementSelector: '#chart-container'
}));
```

### DOM Query Tool
Query and inspect DOM elements:

```typescript
import { DOMQueryTool } from '@mcp-web/core/tools/dom';

mcp.addTool(new DOMQueryTool({
  name: 'query-elements',
  description: 'Find and inspect DOM elements'
}));
```

### Python Code Execution Tool
Execute Python code with your application's context:

```typescript
import { PythonTool } from '@mcp-web/core/tools/python';

mcp.addTool(new PythonTool(() => {
  // Return data to be available in Python
  return { data: getAppData() };
}, {
  name: 'analyze-data',
  description: 'Analyze application data with Python'
}));
```

## Integrations

### Jotai State Management

Automatically create tools for reading and updating Jotai atoms:

```typescript
import { addAtomTool } from '@mcp-web/core/integrations/jotai';
import { atom } from 'jotai';
import { z } from 'zod';

const userAtom = atom({
  name: 'John Doe',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    language: 'en'
  }
});

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
    language: z.string()
  })
});

// Creates tools: get-user, set-user
addAtomTool({
  mcp,
  atom: userAtom,
  name: 'user',
  description: 'User profile and preferences',
  inputSchema: userSchema
});
```

#### Advanced: Schema Decomposition

For complex state objects, automatically split tools by property:

```typescript
addAtomTool({
  mcp,
  atom: userAtom,
  name: 'user',
  description: 'User profile and preferences',
  inputSchema: userSchema,
  // Split into separate tools for each top-level property
  inputSchemaSplit: ['name', 'email', 'preferences']
});
// Creates: get-user, set-user-name, set-user-email, set-user-preferences
```

## Configuration

### MCPWeb Options

```typescript
const mcp = new MCPWeb({
  name: 'My App',
  description: 'Optional description',
  bridgeUrl: 'ws://localhost:3001', // Auto-detected by default
  autoConnect: true, // Default: true
  authToken: 'custom-token', // Optional
  persistAuthToken: true, // Default: true
  idleTimeoutMs: 15 * 60 * 1000 // Default: off
});
```

With `idleTimeoutMs`, the page disconnects after that long without requests
from AI, like tool calls, or user interaction, and the next interaction
reconnects. Use it with hosted bridges, which keep running while a page is
connected. A tool call or resource read that is still running keeps the page
connected, for at most one more timeout. `mcp.idle` tells whether the page is
disconnected for that reason, and `mcp.idleDisconnectAt` when it will be, for
showing a countdown.

This is best effort. A browser can suspend the timers of a background page, so
the disconnect can come late. In Chromium, a frozen page disconnects right
away.

### Authentication

Auth tokens are automatically generated and persisted in localStorage. Access your token:

```typescript
console.log(mcp.authToken);

// Get MCP client configuration for Claude Desktop
console.log(mcp.mcpConfig);
```

## Tool Definition

Tools are defined with this interface:

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  handler: (
    input: unknown,
    context: { elicit: Elicit },
  ) => Promise<unknown> | unknown;
  inputSchema?: ZodSchema | JSONSchema;
}
```

### Asking the User

A handler can ask the user a question in the middle of a call with `elicit`
and wait for the answer. The page shows the question in a plain dialog, or in
your own UI with `mcp.onElicit()`:

```typescript
mcp.addTool({
  name: 'get_greeting',
  description: 'Greet the user in their language',
  outputSchema: z.object({ greeting: z.string() }),
  handler: async (_input, { elicit }) => {
    const language = await elicit('Which language?', ['English', 'German']);
    return { greeting: language === 'German' ? 'Hallo!' : 'Hello!' };
  },
});
```

`elicit(message)` asks yes or no, `elicit(message, choices)` asks for one of
the choices, and `elicit(message, zodObject)` asks to fill in a flat form.
State tools can ask before storing a change with `onBeforeChange`. See
[Asking the User](https://mcp-web.dev/asking-the-user).

### Input Validation

Use Zod schemas for automatic input validation:

```typescript
const updateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150)
});

mcp.addTool({
  name: 'update-user',
  description: 'Update user information',
  inputSchema: updateUserSchema,
  handler: (input) => {
    // input is automatically validated and typed
    updateUser(input);
    return { success: true };
  }
});
```

## Connection Management

```typescript
// Check connection status
if (mcp.connected) {
  console.log('Connected to MCP bridge');
}

// Manual connection control
await mcp.connect();
mcp.disconnect();

// List registered tools
console.log(mcp.getTools());

// Remove tools
mcp.removeTool('tool-name');
```

## Examples

Check out the [HiGlass demo](../../demos/higlass) for a complete example of integrating MCP Web with a complex genomics visualization application.

## Requirements

- Modern browser with WebSocket support
- MCP Bridge server running (typically on localhost:3001)
- Claude Desktop with MCP client configured

## Contributing

This library is part of the MCP Frontend Integration System. See the main repository for contribution guidelines.
