# @mcp-web/mcpb

Generate pre-configured MCPB bundles for one-click installation in Claude Desktop.

## Overview

`@mcp-web/mcpb` enables websites running MCP-Web to generate `.mcpb` files (MCP Bundle format) that users can install in Claude Desktop with a single click. The auth token and bridge connection URL are pre-baked into the bundle, eliminating any manual configuration.

## Installation

```bash
npm install @mcp-web/mcpb
# or
pnpm add @mcp-web/mcpb
# or
yarn add @mcp-web/mcpb
```

## Usage

### Basic Example

```typescript
import { MCPWeb } from '@mcp-web/core';
import { getMcpBundle } from '@mcp-web/mcpb';

// Create your MCP-Web instance
const mcp = new MCPWeb({
  name: 'My Todo App',
  description: 'AI-controllable todo application',
  autoConnect: true,
});

// Register your tools
mcp.addTool({
  name: 'create_todo',
  description: 'Create a new todo',
  handler: (input) => {
    // Your logic here
  },
});

// Generate MCPB bundle
async function handleInstallClick() {
  const bundle = await getMcpBundle(mcp, {
    displayName: 'My Todo App - Claude Extension',
    version: '1.0.0',
    author: {
      name: 'Your Name',
      url: 'https://yourwebsite.com'
    }
  });
  
  // Trigger browser download
  bundle.download();
}
```

### With Icon

```typescript
const bundle = await getMcpBundle(mcp, {
  displayName: 'My App',
  version: '1.0.0',
  icon: 'https://yourwebsite.com/icon.png', // URL to icon
  // or
  icon: iconBlob, // Blob object
});
```

### Custom Client Bundle URL

If you want to host the client bundle yourself:

```typescript
const bundle = await getMcpBundle(mcp, {
  clientBundleUrl: 'https://yourcdn.com/mcp-web-client.js',
});
```

## API

### `getMcpBundle(mcpWeb, options?)`

Generates a pre-configured MCPB bundle.

**Parameters:**
- `mcpWeb` (MCPWeb): The MCPWeb instance to create a bundle for
- `options` (McpBundleOptions, optional):
  - `displayName` (string): Display name in Claude Desktop (defaults to mcpWeb config name)
  - `version` (string): Semantic version (defaults to "1.0.0")
  - `description` (string): Bundle description (defaults to mcpWeb config description)
  - `author` (object): Author info with `name`, `email`, and `url` fields
  - `icon` (string | Blob): Icon as URL or Blob (PNG recommended)
  - `clientBundleUrl` (string): Custom URL for client bundle

**Returns:** `Promise<McpBundleResult>`
- `blob` (Blob): The .mcpb file as a Blob
- `filename` (string): Suggested filename (e.g., "my-app.mcpb")
- `download()` (function): Helper to trigger browser download

## How It Works

1. **Generate Manifest**: Creates a `manifest.json` with pre-baked environment variables:
   - `MCP_SERVER_URL`: Bridge connection URL
   - `AUTH_TOKEN`: Unique authentication token
   
2. **Fetch Client Bundle**: Downloads the standalone `@mcp-web/client` from CDN (unpkg with jsdelivr fallback)

3. **Create Archive**: Packages everything into a `.mcpb` zip file:
   ```
   my-app.mcpb
   ├── manifest.json
   ├── server/
   │   └── index.js (standalone client)
   └── icon.png (optional)
   ```

4. **Download**: User downloads the `.mcpb` file and double-clicks to install in Claude Desktop

## User Experience

From the user's perspective:

1. Visit your website
2. Click "Install Extension" button
3. Download `.mcpb` file
4. Double-click to open with Claude Desktop
5. Click "Install"
6. Done! No configuration needed.

## Security

The auth token is:
- **User-specific**: Generated uniquely for each user
- **Permanent**: Valid until explicitly revoked
- **Local**: Stored only on the user's machine
- **Equivalent** to manually editing Claude Desktop's config file

## Requirements

- Node.js 22+ (specified in bundle manifest)
- Browser environment with `fetch` and `Blob` support
- Network access to CDN (unless using custom `clientBundleUrl`)

## License

MIT
