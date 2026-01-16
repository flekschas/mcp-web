# Decompose Zod Schema

## Classes

### PlanBuilder

Defined in: [plan-builder.ts:8](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L8)

Plan builder for more ergonomic plan construction

#### Constructors

##### Constructor

```ts
new PlanBuilder(): PlanBuilder;
```

###### Returns

[`PlanBuilder`](#planbuilder)

#### Methods

##### addArraySplit()

```ts
addArraySplit(path: string): this;
```

Defined in: [plan-builder.ts:41](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L41)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

###### Returns

`this`

##### addConditionalEnumSplit()

```ts
addConditionalEnumSplit(
   path: string, 
   maxSize: number, 
   schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>): this;
```

Defined in: [plan-builder.ts:51](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L51)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `maxSize` | `number` |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> |

###### Returns

`this`

##### addEntireEnumSlice()

```ts
addEntireEnumSlice(path: string): this;
```

Defined in: [plan-builder.ts:36](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L36)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

###### Returns

`this`

##### addEnumSlice()

```ts
addEnumSlice(
   path: string, 
   start: number, 
   end: number): this;
```

Defined in: [plan-builder.ts:21](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L21)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `start` | `number` |
| `end` | `number` |

###### Returns

`this`

##### addEnumSliceFromIndex()

```ts
addEnumSliceFromIndex(path: string, start: number): this;
```

Defined in: [plan-builder.ts:26](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L26)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `start` | `number` |

###### Returns

`this`

##### addEnumSliceToIndex()

```ts
addEnumSliceToIndex(path: string, end: number): this;
```

Defined in: [plan-builder.ts:31](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L31)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `end` | `number` |

###### Returns

`this`

##### addEnumSplit()

```ts
addEnumSplit(path: string, chunkSize: number): this;
```

Defined in: [plan-builder.ts:16](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L16)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `chunkSize` | `number` |

###### Returns

`this`

##### addRecordSplit()

```ts
addRecordSplit(path: string): this;
```

Defined in: [plan-builder.ts:46](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L46)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

###### Returns

`this`

##### addSplit()

```ts
addSplit(path: string): this;
```

Defined in: [plan-builder.ts:11](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L11)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

###### Returns

`this`

##### build()

```ts
build(): SplitPlan;
```

Defined in: [plan-builder.ts:61](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/plan-builder.ts#L61)

###### Returns

[`SplitPlan`](#splitplan)

***

### SemanticSuggestionStrategy

Defined in: [split-suggestions.ts:217](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L217)

Future strategy example: Semantic-based suggestion
This could analyze schema property names, types, and relationships
to create more intelligent groupings

#### Implements

- [`SuggestionStrategy`](#suggestionstrategy)

#### Constructors

##### Constructor

```ts
new SemanticSuggestionStrategy(): SemanticSuggestionStrategy;
```

###### Returns

[`SemanticSuggestionStrategy`](#semanticsuggestionstrategy)

#### Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="name"></a> `name` | `string` | `'semantic'` | [split-suggestions.ts:218](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L218) |

#### Methods

##### suggest()

```ts
suggest(schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>, _options?: unknown): SplitPlan;
```

Defined in: [split-suggestions.ts:220](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L220)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> |
| `_options?` | `unknown` |

###### Returns

[`SplitPlan`](#splitplan)

###### Implementation of

[`SuggestionStrategy`](#suggestionstrategy).[`suggest`](#suggest-6)

***

### SizeBasedSuggestionStrategy

Defined in: [split-suggestions.ts:12](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L12)

Size-based suggestion strategy that splits schemas based on token count and enum size limits

#### Implements

- [`SuggestionStrategy`](#suggestionstrategy)

#### Constructors

##### Constructor

```ts
new SizeBasedSuggestionStrategy(): SizeBasedSuggestionStrategy;
```

###### Returns

[`SizeBasedSuggestionStrategy`](#sizebasedsuggestionstrategy)

#### Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="name-1"></a> `name` | `string` | `'size-based'` | [split-suggestions.ts:13](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L13) |

#### Methods

##### suggest()

```ts
suggest(schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>, options: SizeBasedOptions): SplitPlan;
```

Defined in: [split-suggestions.ts:15](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L15)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> |
| `options` | [`SizeBasedOptions`](#sizebasedoptions) |

###### Returns

[`SplitPlan`](#splitplan)

###### Implementation of

[`SuggestionStrategy`](#suggestionstrategy).[`suggest`](#suggest-6)

***

### SuggestionStrategyRegistry

Defined in: [split-suggestions.ts:163](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L163)

Registry of available suggestion strategies for future extensibility

#### Constructors

##### Constructor

```ts
new SuggestionStrategyRegistry(): SuggestionStrategyRegistry;
```

Defined in: [split-suggestions.ts:166](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L166)

###### Returns

[`SuggestionStrategyRegistry`](#suggestionstrategyregistry)

#### Methods

##### get()

```ts
get(name: string): SuggestionStrategy | undefined;
```

Defined in: [split-suggestions.ts:175](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L175)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

###### Returns

[`SuggestionStrategy`](#suggestionstrategy) \| `undefined`

##### list()

```ts
list(): string[];
```

Defined in: [split-suggestions.ts:179](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L179)

###### Returns

`string`[]

##### register()

```ts
register(strategy: SuggestionStrategy): void;
```

Defined in: [split-suggestions.ts:171](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L171)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `strategy` | [`SuggestionStrategy`](#suggestionstrategy) |

###### Returns

`void`

##### suggest()

```ts
suggest(
   strategyName: string, 
   schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>, 
   options: unknown): SplitPlan;
```

Defined in: [split-suggestions.ts:183](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L183)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `strategyName` | `string` |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> |
| `options` | `unknown` |

###### Returns

[`SplitPlan`](#splitplan)

## Interfaces

### DecomposedSchema

Defined in: [types.ts:5](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L5)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="name-2"></a> `name` | `string` | [types.ts:6](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L6) |
| <a id="schema"></a> `schema` | `ZodObject` | [types.ts:7](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L7) |
| <a id="targetpaths"></a> `targetPaths` | `string`[] | [types.ts:8](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L8) |

***

### DecompositionOptions

Defined in: [types.ts:40](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L40)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="maxoptionsperenum"></a> `maxOptionsPerEnum?` | `number` | [types.ts:42](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L42) |
| <a id="maxtokensperschema"></a> `maxTokensPerSchema?` | `number` | [types.ts:41](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L41) |

***

### SizeBasedOptions

Defined in: [types.ts:55](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L55)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="maxoptionsperenum-1"></a> `maxOptionsPerEnum` | `number` | [types.ts:57](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L57) |
| <a id="maxtokensperschema-1"></a> `maxTokensPerSchema` | `number` | [types.ts:56](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L56) |

***

### SuggestionStrategy

Defined in: [types.ts:46](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L46)

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="name-3"></a> `name` | `string` | [types.ts:47](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L47) |

#### Methods

##### suggest()

```ts
suggest(schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>, options?: unknown): SplitPlan;
```

Defined in: [types.ts:48](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L48)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> |
| `options?` | `unknown` |

###### Returns

[`SplitPlan`](#splitplan)

## Type Aliases

### Split

```ts
type Split = z.infer<typeof splitSchema>;
```

Defined in: [types.ts:29](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L29)

Split types for the decompose function

#### Example

```ts
const splits: Split[] = [
 'user', // simple path
 'profile.bio', // nested path
 'category[50]', // enum split into equal max. sized subarrays
 'category[0:50]', // enum slice
 'category[50:]', // enum slice from index to end
 'category[:50]', // enum slice from start to index
 'category[:]', // entire enum (same as 'category')
 'items[]', // array split
 'records{}' // record split
]
```

***

### SplitPlan

```ts
type SplitPlan = Split[];
```

Defined in: [types.ts:37](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/types.ts#L37)

## Variables

### defaultStrategyRegistry

```ts
const defaultStrategyRegistry: SuggestionStrategyRegistry;
```

Defined in: [split-suggestions.ts:199](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L199)

Default registry instance

## Functions

### applyPartialUpdate()

```ts
function applyPartialUpdate(
   currentState: unknown, 
   targetPaths: string[], 
   partialUpdate: unknown): unknown;
```

Defined in: [apply.ts:15](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/apply.ts#L15)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `currentState` | `unknown` |
| `targetPaths` | `string`[] |
| `partialUpdate` | `unknown` |

#### Returns

`unknown`

***

### conditionalEnumSplit()

```ts
function conditionalEnumSplit(
   path: string, 
   maxSize: number, 
   schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>): string[];
```

Defined in: [utils.ts:191](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/utils.ts#L191)

Helper function to create conditional enum splits based on enum size

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |
| `maxSize` | `number` |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> |

#### Returns

`string`[]

***

### decomposeSchema()

```ts
function decomposeSchema(schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>, planOrOptions: 
  | DecompositionOptions
  | SplitPlan): DecomposedSchema[];
```

Defined in: [decompose.ts:19](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/decompose.ts#L19)

Convenience wrapper function that allows either manual split plan or automatic suggestion

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> | The Zod schema to decompose |
| `planOrOptions` | \| [`DecompositionOptions`](#decompositionoptions) \| [`SplitPlan`](#splitplan) | Either a SplitPlan for manual decomposition or options for automatic suggestion |

#### Returns

[`DecomposedSchema`](#decomposedschema)[]

Array of decomposed schemas

***

### suggestDecompositionPlan()

```ts
function suggestDecompositionPlan(schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>, options: SizeBasedOptions): SplitPlan;
```

Defined in: [split-suggestions.ts:152](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L152)

Default size-based suggestion function

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> |
| `options` | [`SizeBasedOptions`](#sizebasedoptions) |

#### Returns

[`SplitPlan`](#splitplan)

***

### suggestWithStrategy()

```ts
function suggestWithStrategy(
   strategyName: string, 
   schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>, 
   options: unknown): SplitPlan;
```

Defined in: [split-suggestions.ts:204](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/split-suggestions.ts#L204)

Convenience function that uses the default registry

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `strategyName` | `string` |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> |
| `options` | `unknown` |

#### Returns

[`SplitPlan`](#splitplan)

***

### validatePlan()

```ts
function validatePlan(plan: SplitPlan, schema: ZodObject<Record<string, ZodType<unknown, unknown, $ZodTypeInternals<unknown, unknown>>>>): string[];
```

Defined in: [validate.ts:6](https://github.com/flekschas/mcp-web/blob/701d3fe1d1596d40b539aa6f6fd07b3675badb7f/packages/decompose-zod-schema/src/validate.ts#L6)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `plan` | [`SplitPlan`](#splitplan) |
| `schema` | `ZodObject`\<`Record`\<`string`, `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>\>\> |

#### Returns

`string`[]
