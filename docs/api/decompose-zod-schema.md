# Decompose Zod Schema API

## Other

### PlanBuilder

*Class* — `packages/decompose-zod-schema/src/plan-builder.ts`

Plan builder for more ergonomic plan construction

**Methods:**

```ts
addSplit(path: string): this
```

```ts
addEnumSplit(path: string, chunkSize: number): this
```

```ts
addEnumSlice(path: string, start: number, end: number): this
```

```ts
addEnumSliceFromIndex(path: string, start: number): this
```

```ts
addEnumSliceToIndex(path: string, end: number): this
```

```ts
addEntireEnumSlice(path: string): this
```

```ts
addArraySplit(path: string): this
```

```ts
addRecordSplit(path: string): this
```

```ts
addConditionalEnumSplit(path: string, maxSize: number, schema: ZodObject<Record<string, ZodType>>): this
```

```ts
build(): SplitPlan
```

### SizeBasedSuggestionStrategy

*Class* — `packages/decompose-zod-schema/src/split-suggestions.ts`

Size-based suggestion strategy that splits schemas based on token count and enum size limits

**Properties:**

```ts
name: any
```

**Methods:**

```ts
suggest(schema: ZodObject<Record<string, ZodType>>, options: SizeBasedOptions): SplitPlan
```

### SuggestionStrategyRegistry

*Class* — `packages/decompose-zod-schema/src/split-suggestions.ts`

Registry of available suggestion strategies for future extensibility

**Methods:**

```ts
register(strategy: SuggestionStrategy): void
```

```ts
get(name: string): SuggestionStrategy | undefined
```

```ts
list(): string[]
```

```ts
suggest(strategyName: string, schema: ZodObject<Record<string, ZodType>>, options: unknown): SplitPlan
```

### SemanticSuggestionStrategy

*Class* — `packages/decompose-zod-schema/src/split-suggestions.ts`

Future strategy example: Semantic-based suggestion
This could analyze schema property names, types, and relationships
to create more intelligent groupings

**Properties:**

```ts
name: any
```

**Methods:**

```ts
suggest(schema: ZodObject<Record<string, ZodType>>, _options?: unknown): SplitPlan
```

### DecomposedSchema

*Interface* — `packages/decompose-zod-schema/src/types.ts`

**Properties:**

```ts
name: string
```

```ts
schema: ZodObject
```

```ts
targetPaths: string[]
```

### ArraySplit

*Interface* — `packages/decompose-zod-schema/src/types.ts`

**Properties:**

```ts
path: string
```

```ts
isArrayElement: boolean
```

```ts
excludedSubArrays: string[]
```

### DecompositionOptions

*Interface* — `packages/decompose-zod-schema/src/types.ts`

**Properties:**

```ts
maxTokensPerSchema?: number
```

```ts
maxOptionsPerEnum?: number
```

### SuggestionStrategy

*Interface* — `packages/decompose-zod-schema/src/types.ts`

**Properties:**

```ts
name: string
```

**Methods:**

```ts
suggest(schema: ZodObject<Record<string, ZodType>>, options?: unknown): SplitPlan
```

### SizeBasedOptions

*Interface* — `packages/decompose-zod-schema/src/types.ts`

**Properties:**

```ts
maxTokensPerSchema: number
```

```ts
maxOptionsPerEnum: number
```

### SplitGroup

*Interface* — `packages/decompose-zod-schema/src/types.ts`

**Properties:**

```ts
name: string
```

```ts
paths: string[]
```

```ts
schemas: Record<string, ZodType>
```

### Split

*Type* — `packages/decompose-zod-schema/src/types.ts`

Split types for the decompose function

### SplitPlan

*Type* — `packages/decompose-zod-schema/src/types.ts`

```ts
Split[]
```

### decomposeSchema

*Function* — `packages/decompose-zod-schema/src/decompose.ts`

Convenience wrapper function that allows either manual split plan or automatic suggestion

```ts
decomposeSchema(schema: ZodObject<Record<string, ZodType>>, planOrOptions: SplitPlan | DecompositionOptions): DecomposedSchema[]
```

### decomposeSchemaWithPlan

*Function* — `packages/decompose-zod-schema/src/decompose.ts`

Manually decompose a schema using a predefined split plan.
This function takes a schema and a split plan that defines exactly how to split it.

```ts
decomposeSchemaWithPlan(schema: ZodObject<Record<string, ZodType>>, plan: SplitPlan): DecomposedSchema[]
```

### suggestDecompositionPlan

*Function* — `packages/decompose-zod-schema/src/split-suggestions.ts`

Default size-based suggestion function

```ts
suggestDecompositionPlan(schema: ZodObject<Record<string, ZodType>>, options: SizeBasedOptions): SplitPlan
```

### suggestWithStrategy

*Function* — `packages/decompose-zod-schema/src/split-suggestions.ts`

Convenience function that uses the default registry

```ts
suggestWithStrategy(strategyName: string, schema: ZodObject<Record<string, ZodType>>, options: unknown): SplitPlan
```

### conditionalEnumSplit

*Function* — `packages/decompose-zod-schema/src/utils.ts`

Helper function to create conditional enum splits based on enum size

```ts
conditionalEnumSplit(path: string, maxSize: number, schema: ZodObject<Record<string, ZodType>>): string[]
```

### applyPartialUpdate

*Variable* — `packages/decompose-zod-schema/src/apply.ts`

```ts
unknown
```

### splitSchema

*Variable* — `packages/decompose-zod-schema/src/schemas.ts`

A split can be of the following types:
- string // Simple path like 'user' or 'profile.bio'
- `${string}[${number}]` // Enum split into equal max. sized subarrays 'category[50]'
- `${string}[${number}:${number}]` // Enum slice like 'category[0:50]'
- `${string}[${number}:]` // Enum slice from index to end like 'category[50:]'
- `${string}[:${number}]` // Enum slice from start to index like 'category[:50]'
- `${string}[:]` // Entire enum (equivalent to just the path)
- `${string}[]` // Array split - transforms z.array(T) to z.object({ index: number, value: T })
- `${string}{}`; // Record split - transforms z.record(K, V) to z.object({ key: K, value: V })

### defaultStrategyRegistry

*Variable* — `packages/decompose-zod-schema/src/split-suggestions.ts`

Default registry instance

### setNestedValue

*Variable* — `packages/decompose-zod-schema/src/utils.ts`

```ts
unknown
```

### evenChunk

*Variable* — `packages/decompose-zod-schema/src/utils.ts`

```ts
unknown
```

### parseEnumSplit

*Variable* — `packages/decompose-zod-schema/src/utils.ts`

```ts
unknown
```

### getSchemaAtPath

*Variable* — `packages/decompose-zod-schema/src/utils.ts`

```ts
unknown
```

### extractSchemaForPaths

*Variable* — `packages/decompose-zod-schema/src/utils.ts`

```ts
unknown
```

### estimateTokensByJsonSchema

*Variable* — `packages/decompose-zod-schema/src/utils.ts`

```ts
unknown
```

### validatePlan

*Variable* — `packages/decompose-zod-schema/src/validate.ts`

```ts
unknown
```

### validateSliceCompleteness

*Variable* — `packages/decompose-zod-schema/src/validate.ts`

```ts
unknown
```
