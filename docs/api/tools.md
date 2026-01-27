# MCP-Tools API

## Other

### `BaseTool<TInput, TOutput>`

*Class* — `packages/tools/src/base.ts`

Abstract base class for creating reusable MCP tools.

Extend this class to create tools that can be shared across projects.
Subclasses must implement all abstract properties: name, description,
inputSchema, outputSchema, and handler.

**Accessors:**

```ts
get name(): string
```

Unique name for the tool.

```ts
get description(): string
```

Description of what the tool does (shown to AI).

```ts
get inputSchema(): TInput | undefined
```

Zod schema for validating input parameters.

```ts
get outputSchema(): TOutput
```

Zod schema for validating output values.

```ts
get handler(): (params: z.infer<TInput>) => z.infer<TOutput> | Promise<z.infer<TOutput>>
```

Function that executes the tool logic.

```ts
get definition(): ToolDefinition
```

Returns the tool definition for registration with MCPWeb.
