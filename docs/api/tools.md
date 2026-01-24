# MCP-Tools API

## Other

### `BaseTool<TInput, TOutput>`

*Class* — `packages/tools/src/base.ts`

**Accessors:**

```ts
get name(): string
```

```ts
get description(): string
```

```ts
get inputSchema(): TInput | undefined
```

```ts
get outputSchema(): TOutput
```

```ts
get handler(): (params: z.infer<TInput>) => z.infer<TOutput> | Promise<z.infer<TOutput>>
```

```ts
get definition(): ToolDefinition
```
