# MCP-Web Decompose Zod Schema API

### PlanBuilder

*Class* — `packages/decompose-zod-schema/src/plan-builder.ts`

Fluent builder for constructing schema decomposition plans.

Provides a more ergonomic API for building complex split plans compared
to manually constructing arrays. Array and record paths are auto-detected
from the schema — use `addSplit()` for all path types.

**Methods:**

```ts
addSplit(path: string): this
```

Adds a path split. Works for all property types — objects, arrays,
records, and nested paths through collections.

```ts
addEnumSplit(path: string, chunkSize: number): this
```

Adds an enum split that chunks the enum into equal-sized groups.

```ts
addEnumSlice(path: string, start: number, end: number): this
```

Adds an enum slice from start to end index.

```ts
addEnumSliceFromIndex(path: string, start: number): this
```

Adds an enum slice from start index to end.

```ts
addEnumSliceToIndex(path: string, end: number): this
```

Adds an enum slice from start to end index.

```ts
addEntireEnumSlice(path: string): this
```

Adds a slice for the entire enum (equivalent to just the path).

```ts
addConditionalEnumSplit(path: string, maxSize: number, schema: ZodObject<Record<string, ZodType>>): this
```

Adds a conditional enum split based on size.
Only splits if enum exceeds maxSize, otherwise adds simple path.

```ts
build(): SplitPlan
```

Builds and returns the split plan.

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

A decomposed schema segment with metadata about its source.

**Properties:**

```ts
name: string
```

Generated name for this schema segment.

```ts
schema: ZodObject
```

The Zod schema for this segment.

```ts
targetPaths: string[]
```

Original paths from the source schema included in this segment.

### DecompositionOptions

*Interface* — `packages/decompose-zod-schema/src/types.ts`

Options for automatic schema decomposition.

**Properties:**

```ts
maxTokensPerSchema?: number
```

Maximum estimated tokens per decomposed schema.

```ts
maxOptionsPerEnum?: number
```

Maximum options per enum before splitting.

### SuggestionStrategy

*Interface* — `packages/decompose-zod-schema/src/types.ts`

Strategy interface for suggesting decomposition plans.

**Properties:**

```ts
name: string
```

Name identifier for the strategy.

**Methods:**

```ts
suggest(schema: ZodObject<Record<string, ZodType>>, options?: unknown): SplitPlan
```

Generates a split plan for the given schema.

### SizeBasedOptions

*Interface* — `packages/decompose-zod-schema/src/types.ts`

Options for size-based decomposition strategy.

**Properties:**

```ts
maxTokensPerSchema: number
```

Maximum estimated tokens per decomposed schema.

```ts
maxOptionsPerEnum: number
```

Maximum options per enum before splitting.

### SplitGroup

*Interface* — `packages/decompose-zod-schema/src/types.ts`

Internal grouping of related splits.

**Properties:**

```ts
name: string
```

Group name.

```ts
paths: string[]
```

Paths included in this group.

```ts
schemas: Record<string, ZodType>
```

Schemas for each path.

### DeepPathSegment

*Interface* — `packages/decompose-zod-schema/src/utils.ts`

Metadata about a segment encountered during deep path traversal.

**Properties:**

```ts
key: string
```

The property key at this path segment

```ts
collectionType: 'array' | 'record' | 'none'
```

Whether this segment is an array, record, or regular object property

### DeepPathResult

*Interface* — `packages/decompose-zod-schema/src/utils.ts`

Result of deep path traversal.

**Properties:**

```ts
schema: ZodType
```

The schema at the target path

```ts
segments: DeepPathSegment[]
```

Information about each segment in the path

### Split

*Type* — `packages/decompose-zod-schema/src/types.ts`

Split specification for decomposing schemas.

Supports various notations:
- Simple path: `'user'` - Extract the 'user' property
- Nested path: `'profile.bio'` - Extract nested property
- Collection path: `'todos'` - Array/record type auto-detected from schema
- Deep path: `'views.tracks.top'` - Path through array elements
- Enum chunking: `'category[50]'` - Split enum into chunks of 50
- Enum slice: `'category[0:50]'` - Extract enum options 0-49

### SplitPlan

*Type* — `packages/decompose-zod-schema/src/types.ts`

Array of split specifications defining how to decompose a schema.

### decomposeSchema

*Function* — `packages/decompose-zod-schema/src/decompose.ts`

Decomposes a Zod schema into smaller schemas based on a split plan or options.

This function supports two modes:
1. **Manual decomposition**: Pass a SplitPlan array to control exactly how the schema is split
2. **Automatic decomposition**: Pass options to automatically suggest splits based on size

```ts
decomposeSchema(schema: ZodObject<Record<string, ZodType>>, planOrOptions: SplitPlan | DecompositionOptions): DecomposedSchema[]
```

### decomposeSchemaWithPlan

*Function* — `packages/decompose-zod-schema/src/decompose.ts`

Manually decompose a schema using a predefined split plan.

For paths that traverse through collections (e.g., 'views.tracks.top' where
'views' is an array), the decomposed schema extracts the top-level property
and preserves the full path in `targetPaths` for downstream consumers.

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
- string // Simple path like 'user', 'profile.bio', 'views', or 'views.tracks.top'
- `${string}[${number}]` // Enum split into equal max. sized subarrays 'category[50]'
- `${string}[${number}:${number}]` // Enum slice like 'category[0:50]'
- `${string}[${number}:]` // Enum slice from index to end like 'category[50:]'
- `${string}[:${number}]` // Enum slice from start to index like 'category[:50]'
- `${string}[:]` // Entire enum (equivalent to just the path)

Array and record paths are auto-detected from the schema — no special notation needed.
Simply use the property path (e.g., 'todos' for an array, 'configs' for a record).

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

### getSchemaAtDeepPath

*Variable* — `packages/decompose-zod-schema/src/utils.ts`

Traverse a dot-path through a schema, following through array elements
and record values. This allows resolving paths like 'views.tracks.top'
where 'views' is an array.

Returns the schema at the target path and metadata about each segment
(including whether it's a collection that needs indexing).

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
