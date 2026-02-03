# MCP-Web MCPB Bundle API

### McpBundleOptions

*Interface* — `packages/mcpb/src/types.ts`

Options for generating an MCPB bundle.

**Properties:**

```ts
displayName?: string
```

Display name shown in Claude Desktop's extension list.
Defaults to the MCPWeb config name.

```ts
version?: string
```

Bundle version (semantic version format).
Defaults to "1.0.0".

```ts
description?: string
```

Bundle description.
Defaults to the MCPWeb config description.

```ts
author?: {
    name: string;
    email?: string;
    url?: string;
  }
```

Author information.

```ts
icon?: string | Blob
```

Icon for the extension. Can be:
- A URL to fetch the icon from
- A Blob containing the icon data

Should be a PNG image. If provided, it will be included in the bundle as icon.png.

```ts
clientBundleUrl?: string
```

Override the default CDN URL for fetching the

### McpBundleResult

*Interface* — `packages/mcpb/src/types.ts`

Result of generating an MCPB bundle.

**Properties:**

```ts
blob: Blob
```

The .mcpb file as a Blob, ready to be downloaded or processed.

```ts
filename: string
```

Suggested filename for the bundle (e.g., "my-app.mcpb").

```ts
download: () => void
```

Helper function to trigger browser download of the bundle.
Creates a temporary download link and clicks it.

### ManifestJson

*Interface* — `packages/mcpb/src/types.ts`

MCPB manifest.json structure (v0.3).

**Properties:**

```ts
manifest_version: string
```

```ts
name: string
```

```ts
display_name?: string
```

```ts
version: string
```

```ts
description: string
```

```ts
author: {
    name: string;
    email?: string;
    url?: string;
  }
```

```ts
server: {
    type: 'node';
    entry_point: string;
    mcp_config: {
      command: string;
      args: string[];
      env: Record<string, string>;
    };
  }
```

```ts
icon?: string
```

```ts
tools_generated: boolean
```

```ts
compatibility: {
    platforms: string[];
    runtimes: {
      node: string;
    };
  }
```

### fetchClientBundle

*Function* — `packages/mcpb/src/fetch-client.ts`

Fetches the pre-built

```ts
fetchClientBundle(customUrl?: string): Promise<string>
```

### getMcpBundle

*Function* — `packages/mcpb/src/get-mcp-bundle.ts`

Generates a pre-configured MCPB bundle for installation in Claude Desktop.

This function creates a `.mcpb` file (which is a zip archive) containing:
- manifest.json with pre-baked MCP_SERVER_URL and AUTH_TOKEN
- server/index.js (the standalone

```ts
getMcpBundle(mcpWeb: MCPWeb, options: McpBundleOptions): Promise<McpBundleResult>
```

### generateManifest

*Function* — `packages/mcpb/src/manifest.ts`

Generates a MCPB manifest.json from an MCPWeb instance and options.

The manifest includes pre-baked environment variables (MCP_SERVER_URL and AUTH_TOKEN)
so the user doesn't need to configure anything after installation.

```ts
generateManifest(mcpWeb: MCPWeb, options: McpBundleOptions): ManifestJson
```
