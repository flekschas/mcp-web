# MCP Web Tools

A collection of reusable, pre-built tools for MCP-Web. Includes screenshot capture, DOM querying, and in-browser Python execution.

## Overview

This package provides ready-to-use tool classes that can be registered directly with `MCPWeb.addTool()`.

## Quick Start

### Installation

```bash
npm install @mcp-web/tools
```

### Screenshot Tool

Capture screenshots of the page or specific elements. Returns a data URL that the bridge automatically converts into an MCP image content block.

```typescript
import { ScreenshotTool } from '@mcp-web/tools/screenshot';

// Dynamic: AI chooses which element to capture
mcp.addTool(new ScreenshotTool({
  name: 'screenshot',
  description: 'Take a screenshot of any element',
}));

// Static: always captures a specific element
mcp.addTool(new ScreenshotTool({
  name: 'screenshot-chart',
  description: 'Take a screenshot of the chart',
  elementSelector: '#chart-container',
  format: 'jpeg',
}));
```

### DOM Query Tool

Query and inspect DOM elements by CSS selector. Returns tag name, id, class, text content, and attributes for each match.

```typescript
import { DOMQueryTool } from '@mcp-web/tools/dom';

mcp.addTool(new DOMQueryTool());
```

### Python Tool

Execute Python code in the browser using Pyodide. Runs in a Web Worker with a 30-second timeout. Packages are loaded automatically from imports.

```typescript
import { PythonTool } from '@mcp-web/tools/python';

const pythonTool = new PythonTool(
  // Provide datasets available to the Python script
  () => ({ data: getAppData() }),
  {
    name: 'analyze-data',
    description: 'Analyze application data with Python',
    defaultPackages: ['numpy', 'pandas'],
  }
);

mcp.addTool(pythonTool);

// Clean up when done
pythonTool.destroy();
```

## Creating Custom Tools

Extend `BaseTool` to create your own reusable tools:

```typescript
import { BaseTool } from '@mcp-web/tools';
import { z } from 'zod';

const InputSchema = z.object({
  query: z.string().describe('Search query'),
});

const OutputSchema = z.object({
  results: z.array(z.string()),
});

class SearchTool extends BaseTool<typeof InputSchema, typeof OutputSchema> {
  get name() { return 'search'; }
  get description() { return 'Search for items'; }
  get inputSchema() { return InputSchema; }
  get outputSchema() { return OutputSchema; }
  get handler() {
    return ({ query }: z.infer<typeof InputSchema>) => ({
      results: performSearch(query),
    });
  }
}

mcp.addTool(new SearchTool());
```

## Exports

| Import Path | Export | Description |
|-------------|--------|-------------|
| `@mcp-web/tools` | `BaseTool` | Abstract base class for creating custom tools |
| `@mcp-web/tools/screenshot` | `ScreenshotTool` | Capture page or element screenshots (png, jpeg, webp) |
| `@mcp-web/tools/dom` | `DOMQueryTool` | Query and inspect DOM elements by CSS selector |
| `@mcp-web/tools/python` | `PythonTool` | Run Python code in-browser via Pyodide Web Worker |

## Learn More

For full documentation, guides, and examples, visit [mcp-web.dev](https://mcp-web.dev).
