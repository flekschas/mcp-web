# MCP-Client

## Classes

### MCPWebClient

Defined in: [packages/client/src/client.ts:47](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L47)

#### Constructors

##### Constructor

```ts
new MCPWebClient(config: {
  authToken?: string;
  serverUrl: string;
  timeout?: number;
}, query?: {
  context: {
     description?: string;
     name: string;
     schema?: JSONSchema;
     type: "tool" | "ephemeral";
     value: unknown;
  }[];
  prompt: string;
  responseTool?: {
     description: string;
     inputSchema?: JSONSchema;
     name: string;
     outputSchema?: JSONSchema;
  };
  restrictTools?: boolean;
  tools?: {
     description: string;
     inputSchema?: JSONSchema;
     name: string;
     outputSchema?: JSONSchema;
  }[];
  uuid: string;
}): MCPWebClient;
```

Defined in: [packages/client/src/client.ts:53](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L53)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | \{ `authToken?`: `string`; `serverUrl`: `string`; `timeout?`: `number`; \} |
| `config.authToken?` | `string` |
| `config.serverUrl?` | `string` |
| `config.timeout?` | `number` |
| `query?` | \{ `context`: \{ `description?`: `string`; `name`: `string`; `schema?`: `JSONSchema`; `type`: `"tool"` \| `"ephemeral"`; `value`: `unknown`; \}[]; `prompt`: `string`; `responseTool?`: \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \}; `restrictTools?`: `boolean`; `tools?`: \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \}[]; `uuid`: `string`; \} |
| `query.context?` | \{ `description?`: `string`; `name`: `string`; `schema?`: `JSONSchema`; `type`: `"tool"` \| `"ephemeral"`; `value`: `unknown`; \}[] |
| `query.prompt?` | `string` |
| `query.responseTool?` | \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \} |
| `query.responseTool.description?` | `string` |
| `query.responseTool.inputSchema?` | `JSONSchema` |
| `query.responseTool.name?` | `string` |
| `query.responseTool.outputSchema?` | `JSONSchema` |
| `query.restrictTools?` | `boolean` |
| `query.tools?` | \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \}[] |
| `query.uuid?` | `string` |

###### Returns

[`MCPWebClient`](#mcpwebclient)

#### Methods

##### callTool()

```ts
callTool(
   name: string, 
   args?: Record<string, unknown>, 
   sessionId?: string): Promise<{
[key: string]: unknown;
  _meta?: {
   [key: string]: unknown;
  };
  content: (
     | {
   [key: string]: unknown;
     _meta?: {
      [key: string]: unknown;
     };
     text: string;
     type: "text";
   }
     | {
   [key: string]: unknown;
     _meta?: {
      [key: string]: unknown;
     };
     data: string;
     mimeType: string;
     type: "image";
   }
     | {
   [key: string]: unknown;
     _meta?: {
      [key: string]: unknown;
     };
     data: string;
     mimeType: string;
     type: "audio";
   }
     | {
   [key: string]: unknown;
     _meta?: {
      [key: string]: unknown;
     };
     description?: string;
     mimeType?: string;
     name: string;
     title?: string;
     type: "resource_link";
     uri: string;
   }
     | {
   [key: string]: unknown;
     _meta?: {
      [key: string]: unknown;
     };
     resource:   | {
      [key: string]: unknown;
        _meta?: {
         [key: string]: unknown;
        };
        mimeType?: string;
        text: string;
        uri: string;
      }
        | {
      [key: string]: unknown;
        _meta?: {
         [key: string]: unknown;
        };
        blob: string;
        mimeType?: string;
        uri: string;
      };
     type: "resource";
  })[];
  isError?: boolean;
  structuredContent?: {
   [key: string]: unknown;
  };
}>;
```

Defined in: [packages/client/src/client.ts:257](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L257)

Call a tool, automatically augmented with query context if this is a
contextualized client.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `args?` | `Record`\<`string`, `unknown`\> |
| `sessionId?` | `string` |

###### Returns

`Promise`\<\{
\[`key`: `string`\]: `unknown`;
  `_meta?`: \{
   \[`key`: `string`\]: `unknown`;
  \};
  `content`: (
     \| \{
   \[`key`: `string`\]: `unknown`;
     `_meta?`: \{
      \[`key`: `string`\]: `unknown`;
     \};
     `text`: `string`;
     `type`: `"text"`;
   \}
     \| \{
   \[`key`: `string`\]: `unknown`;
     `_meta?`: \{
      \[`key`: `string`\]: `unknown`;
     \};
     `data`: `string`;
     `mimeType`: `string`;
     `type`: `"image"`;
   \}
     \| \{
   \[`key`: `string`\]: `unknown`;
     `_meta?`: \{
      \[`key`: `string`\]: `unknown`;
     \};
     `data`: `string`;
     `mimeType`: `string`;
     `type`: `"audio"`;
   \}
     \| \{
   \[`key`: `string`\]: `unknown`;
     `_meta?`: \{
      \[`key`: `string`\]: `unknown`;
     \};
     `description?`: `string`;
     `mimeType?`: `string`;
     `name`: `string`;
     `title?`: `string`;
     `type`: `"resource_link"`;
     `uri`: `string`;
   \}
     \| \{
   \[`key`: `string`\]: `unknown`;
     `_meta?`: \{
      \[`key`: `string`\]: `unknown`;
     \};
     `resource`:   \| \{
      \[`key`: `string`\]: `unknown`;
        `_meta?`: \{
         \[`key`: `string`\]: `unknown`;
        \};
        `mimeType?`: `string`;
        `text`: `string`;
        `uri`: `string`;
      \}
        \| \{
      \[`key`: `string`\]: `unknown`;
        `_meta?`: \{
         \[`key`: `string`\]: `unknown`;
        \};
        `blob`: `string`;
        `mimeType?`: `string`;
        `uri`: `string`;
      \};
     `type`: `"resource"`;
  \})[];
  `isError?`: `boolean`;
  `structuredContent?`: \{
   \[`key`: `string`\]: `unknown`;
  \};
\}\>

##### cancel()

```ts
cancel(reason?: string): Promise<void>;
```

Defined in: [packages/client/src/client.ts:451](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L451)

Cancel the current query.
Can only be called on a contextualized client instance.
Use this when the user or system needs to abort query processing.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `reason?` | `string` |

###### Returns

`Promise`\<`void`\>

##### complete()

```ts
complete(message: string): Promise<void>;
```

Defined in: [packages/client/src/client.ts:374](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L374)

Mark the current query as complete with a message.
Can only be called on a contextualized client instance.
Note: If the query specified a responseTool, calling this method will result in an error.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |

###### Returns

`Promise`\<`void`\>

##### contextualize()

```ts
contextualize(query: {
  context: {
     description?: string;
     name: string;
     schema?: JSONSchema;
     type: "tool" | "ephemeral";
     value: unknown;
  }[];
  prompt: string;
  responseTool?: {
     description: string;
     inputSchema?: JSONSchema;
     name: string;
     outputSchema?: JSONSchema;
  };
  restrictTools?: boolean;
  tools?: {
     description: string;
     inputSchema?: JSONSchema;
     name: string;
     outputSchema?: JSONSchema;
  }[];
  uuid: string;
}): MCPWebClient;
```

Defined in: [packages/client/src/client.ts:249](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L249)

Create a contextualized client for a specific query.
All tool calls made through this client will be tagged with the query UUID.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `query` | \{ `context`: \{ `description?`: `string`; `name`: `string`; `schema?`: `JSONSchema`; `type`: `"tool"` \| `"ephemeral"`; `value`: `unknown`; \}[]; `prompt`: `string`; `responseTool?`: \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \}; `restrictTools?`: `boolean`; `tools?`: \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \}[]; `uuid`: `string`; \} | The query object containing uuid and optional responseTool |
| `query.context` | \{ `description?`: `string`; `name`: `string`; `schema?`: `JSONSchema`; `type`: `"tool"` \| `"ephemeral"`; `value`: `unknown`; \}[] | - |
| `query.prompt` | `string` | - |
| `query.responseTool?` | \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \} | - |
| `query.responseTool.description` | `string` | - |
| `query.responseTool.inputSchema?` | `JSONSchema` | - |
| `query.responseTool.name` | `string` | - |
| `query.responseTool.outputSchema?` | `JSONSchema` | - |
| `query.restrictTools?` | `boolean` | - |
| `query.tools?` | \{ `description`: `string`; `inputSchema?`: `JSONSchema`; `name`: `string`; `outputSchema?`: `JSONSchema`; \}[] | - |
| `query.uuid` | `string` | - |

###### Returns

[`MCPWebClient`](#mcpwebclient)

##### fail()

```ts
fail(error: string | Error): Promise<void>;
```

Defined in: [packages/client/src/client.ts:412](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L412)

Mark the current query as failed with an error message.
Can only be called on a contextualized client instance.
Use this when the query encounters an error during processing.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | `string` \| `Error` |

###### Returns

`Promise`\<`void`\>

##### listPrompts()

```ts
listPrompts(sessionId?: string): Promise<
  | {
[key: string]: unknown;
  _meta?: {
   [key: string]: unknown;
  };
  nextCursor?: string;
  prompts: {
   [key: string]: unknown;
     _meta?: {
      [key: string]: unknown;
     };
     arguments?: {
      [key: string]: unknown;
        description?: string;
        name: string;
        required?: boolean;
     }[];
     description?: string;
     name: string;
     title?: string;
  }[];
}
| ErroredListPromptsResult>;
```

Defined in: [packages/client/src/client.ts:332](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L332)

List all available prompts.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `sessionId?` | `string` |

###### Returns

`Promise`\<
  \| \{
\[`key`: `string`\]: `unknown`;
  `_meta?`: \{
   \[`key`: `string`\]: `unknown`;
  \};
  `nextCursor?`: `string`;
  `prompts`: \{
   \[`key`: `string`\]: `unknown`;
     `_meta?`: \{
      \[`key`: `string`\]: `unknown`;
     \};
     `arguments?`: \{
      \[`key`: `string`\]: `unknown`;
        `description?`: `string`;
        `name`: `string`;
        `required?`: `boolean`;
     \}[];
     `description?`: `string`;
     `name`: `string`;
     `title?`: `string`;
  \}[];
\}
  \| `ErroredListPromptsResult`\>

##### listResources()

```ts
listResources(sessionId?: string): Promise<
  | {
[key: string]: unknown;
  _meta?: {
   [key: string]: unknown;
  };
  nextCursor?: string;
  resources: {
   [key: string]: unknown;
     _meta?: {
      [key: string]: unknown;
     };
     description?: string;
     mimeType?: string;
     name: string;
     title?: string;
     uri: string;
  }[];
}
| ErroredListResourcesResult>;
```

Defined in: [packages/client/src/client.ts:321](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L321)

List all available resources.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `sessionId?` | `string` |

###### Returns

`Promise`\<
  \| \{
\[`key`: `string`\]: `unknown`;
  `_meta?`: \{
   \[`key`: `string`\]: `unknown`;
  \};
  `nextCursor?`: `string`;
  `resources`: \{
   \[`key`: `string`\]: `unknown`;
     `_meta?`: \{
      \[`key`: `string`\]: `unknown`;
     \};
     `description?`: `string`;
     `mimeType?`: `string`;
     `name`: `string`;
     `title?`: `string`;
     `uri`: `string`;
  \}[];
\}
  \| `ErroredListResourcesResult`\>

##### listTools()

```ts
listTools(sessionId?: string): Promise<
  | {
[key: string]: unknown;
  _meta?: {
   [key: string]: unknown;
  };
  nextCursor?: string;
  tools: {
   [key: string]: unknown;
     _meta?: {
      [key: string]: unknown;
     };
     annotations?: {
      [key: string]: unknown;
        destructiveHint?: boolean;
        idempotentHint?: boolean;
        openWorldHint?: boolean;
        readOnlyHint?: boolean;
        title?: string;
     };
     description?: string;
     inputSchema: {
      [key: string]: unknown;
        properties?: {
         [key: string]: unknown;
        };
        required?: string[];
        type: "object";
     };
     name: string;
     outputSchema?: {
      [key: string]: unknown;
        properties?: {
         [key: string]: unknown;
        };
        required?: string[];
        type: "object";
     };
     title?: string;
  }[];
}
| ErroredListToolsResult>;
```

Defined in: [packages/client/src/client.ts:298](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L298)

List all available tools.
If this is a contextualized client with restricted tools, returns only those tools.
Otherwise fetches all tools from the bridge.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `sessionId?` | `string` |

###### Returns

`Promise`\<
  \| \{
\[`key`: `string`\]: `unknown`;
  `_meta?`: \{
   \[`key`: `string`\]: `unknown`;
  \};
  `nextCursor?`: `string`;
  `tools`: \{
   \[`key`: `string`\]: `unknown`;
     `_meta?`: \{
      \[`key`: `string`\]: `unknown`;
     \};
     `annotations?`: \{
      \[`key`: `string`\]: `unknown`;
        `destructiveHint?`: `boolean`;
        `idempotentHint?`: `boolean`;
        `openWorldHint?`: `boolean`;
        `readOnlyHint?`: `boolean`;
        `title?`: `string`;
     \};
     `description?`: `string`;
     `inputSchema`: \{
      \[`key`: `string`\]: `unknown`;
        `properties?`: \{
         \[`key`: `string`\]: `unknown`;
        \};
        `required?`: `string`[];
        `type`: `"object"`;
     \};
     `name`: `string`;
     `outputSchema?`: \{
      \[`key`: `string`\]: `unknown`;
        `properties?`: \{
         \[`key`: `string`\]: `unknown`;
        \};
        `required?`: `string`[];
        `type`: `"object"`;
     \};
     `title?`: `string`;
  \}[];
\}
  \| `ErroredListToolsResult`\>

##### run()

```ts
run(): Promise<void>;
```

Defined in: [packages/client/src/client.ts:541](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L541)

###### Returns

`Promise`\<`void`\>

##### sendProgress()

```ts
sendProgress(message: string): Promise<void>;
```

Defined in: [packages/client/src/client.ts:344](https://github.com/flekschas/mcp-web/blob/e8aa9068c06b25ad56ce2eba455aa6b81512d59d/packages/client/src/client.ts#L344)

Send a progress update for the current query.
Can only be called on a contextualized client instance.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |

###### Returns

`Promise`\<`void`\>
