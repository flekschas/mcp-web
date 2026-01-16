# MCP-Tools

## Classes

### `abstract` BaseTool

Defined in: [base.ts:4](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/tools/src/base.ts#L4)

#### Type Parameters

| Type Parameter |
| ------ |
| `TInput` *extends* `z.ZodObject` |
| `TOutput` *extends* `z.ZodObject` |

#### Constructors

##### Constructor

```ts
new BaseTool<TInput, TOutput>(): BaseTool<TInput, TOutput>;
```

###### Returns

[`BaseTool`](#basetool)\<`TInput`, `TOutput`\>

#### Accessors

##### definition

###### Get Signature

```ts
get definition(): ToolDefinition;
```

Defined in: [base.ts:14](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/tools/src/base.ts#L14)

###### Returns

`ToolDefinition`

##### description

###### Get Signature

```ts
get abstract description(): string;
```

Defined in: [base.ts:9](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/tools/src/base.ts#L9)

###### Returns

`string`

##### handler

###### Get Signature

```ts
get abstract handler(): (params: output<TInput>) => output<TOutput> | Promise<output<TOutput>>;
```

Defined in: [base.ts:12](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/tools/src/base.ts#L12)

###### Returns

```ts
(params: output<TInput>): output<TOutput> | Promise<output<TOutput>>;
```

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | `output`\<`TInput`\> |

###### Returns

`output`\<`TOutput`\> \| `Promise`\<`output`\<`TOutput`\>\>

##### inputSchema

###### Get Signature

```ts
get abstract inputSchema(): TInput | undefined;
```

Defined in: [base.ts:10](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/tools/src/base.ts#L10)

###### Returns

`TInput` \| `undefined`

##### name

###### Get Signature

```ts
get abstract name(): string;
```

Defined in: [base.ts:8](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/tools/src/base.ts#L8)

###### Returns

`string`

##### outputSchema

###### Get Signature

```ts
get abstract outputSchema(): TOutput;
```

Defined in: [base.ts:11](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/tools/src/base.ts#L11)

###### Returns

`TOutput`
