# Frontend-Triggered Queries

By default, [MCP](https://modelcontextprotocol.io) can only be used for
communicating from an AI app/agent to the tool-offering server. However, when
building AI-native web apps, one often wants to trigger queries from the web
app.

While one could simply build a custom AI agent, wouldn't it be nice to use the
same MCP tools so that queries can both be triggered from an AI app (like
Claude Desktop) and the web app itself?

To support this, MCP-Web offers the ability to trigger queries using a
lightweight routing approach to an AI agent web app.

## MCP-Web Queries vs. Custom Protocol + Agent

MCP-Web's frontend-triggered queries ultimately serve the same purpose as
directly calling an LLM provider or an AI agent, so it's worth taking a moment
to consider which approach would be best for your use case.

### ✅ Use MCP-Web's queries when…

…you want tool unification. I.e., your app
already exposes MCP tools using MCP-Web and you want frontend-triggered AI
queries to use those same tools. Or your AI agent already uses a bunch of other
MCP tools and you want to apply the same tool discovery and calling protocol.

For instance, imagine building an todo app where you want an AI app to be able
to add todos from meeting notes in Google Drive while at the same time being
able to drop meeting notes into the web app to be turned into todos.

### ❌ Use a custom protocol when…

…you don't need to expose MCP tools or you
have custom AI workflows that don't fit well into MCP.

For instance, a simple chat interface that only needs AI completions without any
tool calls. Directly calling your LLM provider is simpler than MCP-Web's query
routing.

## What You Need

### 1. Agent Server

Frontend queries require an agent server. This server needs to handle at least
two endpoints:

- `PUT /query/{uuid}` for new queries
- `DELETE /query/{uuid}` for canceling queries

::: tip Complete Example
See the [Checkers Demo](../demos/checkers/agent.ts) for a complete agent
server implementation including query handling, tool routing, and LLM integration.
:::

### 2. Configure Agent URL

Add `agentUrl` to your MCPWeb config:

```typescript{7}
export const MCP_WEB_CONFIG = {
  name: 'My App',
  description: 'AI-controllable app',
  host: 'localhost',
  wsPort: 3001,
  mcpPort: 3002,
  agentUrl: 'http://localhost:3003',  // Required for queries
};
```

#### Custom Query Endpoint (Optional)

By default, when the `agentUrl` does not contain any path, queries are routed to
`/query`. You can customize the routing by include a custom path in the
`agentUrl`. In either case, a query UUID will be appended to the URL:

```typescript{4}
export const MCP_WEB_CONFIG = {
  name: 'My App',
  description: 'AI-controllable app',
  agentUrl: 'http://localhost:8000/api/v1/query',
};
```

Custom routing is useful when integrating with existing APIs that use different
routing conventions.

**Examples:**
- Default: `agentUrl: 'http://localhost:3000'`
  → queries sent to `http://localhost:3000/query/{uuid}`

- Custom: `agentUrl: 'http://localhost:8000/api/v1/query'`
  → queries sent to `http://localhost:8000/api/v1/query/{uuid}`


The agent server will receive:
- `PUT {agentUrl}/{uuid}` for new queries
- `DELETE {agentUrl}/{uuid}` for canceling queries

### 3. Call `mcp.query()`

Last but not least, issue a query using `mcp.query()` in your frontend app:

```typescript
const query = mcp.query({
  prompt: 'Your instruction to the AI',
  context: [/* optional context */],
  responseTool: /* optional tool */,
  timeout: 300000, // optional, default 5 minutes
});
```

## Simple Example

In the most simple case, send a prompt and await the query result. 🎉

```typescript{2-4}
async function summarizeTodos() {
  const query = mcp.query({
    prompt: "Analyze my today's todos and summarize them"
  });

  try {
    return await query.result;
  } catch (error) {
    console.error('Query failed:', error);
  }
}
```

## Add Context to Query

For many frontend-triggered queries, you might know in advance, which tools
provide essential context. To improve the performance, you can pass useful
context directly to the AI agent using the `context` prop.

For instance, for the above example query, the AI agent needs to know what
today's todos are to summarize them. You could let the AI agent discover a tool
to retrieve today's todos but that adds latency. It'd be faster to directly
expose the today's todos tool as context.

```typescript{1-5,10}
const getTodaysTodosTool = mcp.addTool({
  name: 'get_todays_todos',
  handler: () => getTodaysTodos(),
  outputSchema: TodosSchema
});

async function summarizeTodos() {
  const query = mcp.query({
    prompt: "Analyze my today's todos and summarize them",
    context: [getTodaysTodosTool],
  });

  try {
    return await query.result;
  } catch (error) {
    console.error('Query failed:', error);
  }
}
```

There are two types of context you can pass along a query:
1. Getter tool definition
2. Ephemeral information

For getter tool definition context, the tool's current value is pre-computed
prior to issuing the query. I.e., the AI agent will immediately have the value of
that tool call without needing to call this tool.

Ephemeral information, could be anything that might be useful to complete the
query. The difference to tool context is that this information does not
correspond to a tool.

::: tip
Since tool definition context already pre-computes the current tool value,
it makes sense to hide those tools from the AI agent, as calling them twice would be
wasteful.
:::

## Streaming Results

For more involved queries, it can be useful to show intermediate progress
updates. You can do this by using `query.stream`, which returns an async
iterator.

::: tip Framework-Agnostic Pattern
This example uses placeholder state setters like `setProgress()` and `setSummarizing()`.
Implement these based on your framework (React useState, Svelte stores, Vue refs, etc.).
The key pattern is the `for await` loop over `query.stream`.
:::

```typescript{10-30}
async function summarizeTodos() {
  setSummarizing(true);

  const query = mcp.query({
    prompt: "Analyze my today's todos and summarize them",
    context: [getTodaysTodosTool],
  });

  try {
    for await (const event of query.stream) {
      switch (event.type) {
        case 'query_accepted':
          setProgress('AI is getting to work');
          break;

        case 'query_progress':
          setProgress(event.content || 'Processing...');
          break;

        case 'query_complete':
          setProgress('Complete!');
          return event.result;

        case 'query_failure':
          setProgress('AI failed');
          showError(event.error);
          break;
      }
    }
  } finally {
    setSummarizing(false);
  }
}
```

## Enforce a Response Tool

Sometimes you want the result of a query to be a tool call. You can enforce
this by specifying the `responseTool` property. This is very useful for
structured queries. 

```typescript{11-12}
const makeMoveTool = mcp.addTool({
  name: 'make_move',
  description: 'Make a move on the game board',
  handler: (move) => { applyMove(move) },
  inputSchema: z.object({ from: PositionSchema, to: PositionSchema }),
});

async function makeMoveAI() {
  const query = mcp.query({
    prompt: 'Analyze the board and make your move',
    // AI agent must call this tool to complete the query
    responseTool: makeMoveTool,
  });

  try {
    await query.result;
  } catch (error) {
    console.error('AI failed to make a move:', error);
  }
}
```

## Cancel a Query

You can cancel a query using either the return value's `cancel()` function or
with an [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).

### Using the `query.cancel()` function

```typescript{16}
let currentQuery: QueryResponse | null = null;

async function startAnalysis() {
  currentQuery = mcp.query({
    prompt: 'Perform deep analysis of the dataset',
    timeout: 600000, // 10 minutes
  });

  for await (const event of currentQuery.stream) {
    // Process events...
  }
}

function cancelAnalysis() {
  if (currentQuery) {
    currentQuery.cancel();
    currentQuery = null;
  }
}
```

### Using `AbortSignal`

Using the [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
to cancel a query can be useful for auto-cancelling queries (e.g., if they run
too long) or when you want to delegate the cancellation without passing the
entire `query` response object.

```typescript{3-4,8}
async function runWithTimeout() {
  // Auto-cancel after 30 seconds
  const abortController = new AbortController();
  setTimeout(() => abortController.abort(), 30000);

  const query = mcp.query({
    prompt: 'Quick analysis needed',
  }, abortController.signal);

  try {
    for await (const event of query.stream) {
      if (event.type === 'query_complete') {
        return event.result;
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Query was cancelled');
    }
  }
}
```
