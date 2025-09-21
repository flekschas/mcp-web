# Schema Decomposition for AI Tools

Large schemas create two fundamental challenges when working with AI systems:

## 1. Descriptive Complexity
When schemas have too many properties, the AI might struggle to understand and work with all concepts simultaneously. Complex schemas can exceed context limits and reduce the AI's ability to generate accurate, focused responses.

**Solution: Schema Decomposition**
- Split large objects into semantically-coherent sub-schemas
- This results in focused schemas that handle specific domains of properties
- Each sub-schema can be processed independently, improving AI accuracy and efficiency
- Perfect for breaking down complex forms, configuration objects, or data models

## 2. Generative Complexity  
When schemas contain unbounded collections (arrays, records, maps), the AI might need to manage many items at once, which can lead to errors and inefficiency. Generating or updating large collections can overwhelm AI systems and result in incomplete or incorrect data.

**Solution: Value Generation Decomposition**
- Transform collections into single-item + indexing operations
- AI generates/updates one item at a time with precise targeting
- Supports both arrays (`items[]`) and records/maps (`configs{}`)
- Enables incremental updates to large datasets without losing context

---

This utility provides both types of decomposition through a flexible, type-safe API that works seamlessly with Zod schemas and maintains full TypeScript support.

## Features

- **Manual Decomposition**: Use split plans to precisely control how schemas are decomposed
- **Automatic Suggestions**: Size-based algorithms to suggest optimal decomposition plans
- **Enum Splitting**: Automatically splits large enums into smaller chunks with flexible notation
- **Array Decomposition**: Transform arrays into single-item schemas with `items[]` notation
- **Record Decomposition**: Transform records/maps into key-value pairs with `configs{}` notation
- **Plan Validation**: Validate split plans against schemas before decomposition
- **Partial Updates**: Apply updates from decomposed schemas to complete objects
- **Extensible Strategy System**: Plugin architecture for custom decomposition algorithms
- **Type Safety**: Maintains full TypeScript type safety throughout

## Usage

### Automatic Decomposition (Size-based)

```typescript
import { decomposeSchema, applyPartialUpdate } from '@your-company/decompose-zod-schema';
import { z } from 'zod';

// Define a complex schema
const userSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
  }),
  profile: z.object({
    bio: z.string(),
    avatar: z.string().url().optional(),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    language: z.enum(['en', 'es', 'fr', 'de']),
  }),
  // Large enum for testing
  category: z.enum(Array.from({ length: 200 }, (_, i) => `cat-${i}`) as [string, ...string[]]),
});

// Automatic decomposition with size constraints
const decomposed = decomposeSchema(userSchema, {
  maxTokensPerSchema: 1500,
  maxOptionsPerEnum: 50,
});

console.log(decomposed);
// [
//   { name: "user", schema: z.object({...}), targetPaths: ["user.id", "user.name", "user.email"] },
//   { name: "profile", schema: z.object({...}), targetPaths: ["profile.bio", "profile.avatar"] },
//   { name: "preferences", schema: z.object({...}), targetPaths: ["preferences.theme", "preferences.language"] },
//   { name: "category-1", schema: z.object({...}), targetPaths: ["category[0:50]"] },
//   { name: "category-2", schema: z.object({...}), targetPaths: ["category[50:100]"] },
//   // ... more category chunks
// ]
```

### Manual Decomposition (Split Plans)

```typescript
import { decomposeSchema, PlanBuilder } from '@your-company/decompose-zod-schema';

// Simple static plan
const plan = [
  'user',
  'profile', 
  'preferences',
  'category[50]',  // Split category enum into chunks of 50
];

const decomposed = decomposeSchema(userSchema, plan);

// Using the plan builder for more complex scenarios
const builderPlan = new PlanBuilder()
  .addSplit('user')
  .addSplit('profile')
  .addConditionalEnumSplit('preferences.language', 10, userSchema)
  .addEnumSplit('category', 50)
  .build();

const decomposedFromBuilder = decomposeSchema(userSchema, builderPlan);
```

### Array and Record Decomposition

Transform collections into manageable single-item operations:

```typescript
import { decomposeSchema, applyPartialUpdate } from '@your-company/decompose-zod-schema';
import { z } from 'zod';

// Schema with arrays and records
const dataSchema = z.object({
  users: z.array(z.object({
    name: z.string(),
    email: z.string(),
    roles: z.array(z.string())
  })),
  settings: z.record(z.string(), z.object({
    enabled: z.boolean(),
    value: z.string()
  })),
  metadata: z.string()
});

// Decompose collections into single-item schemas
const plan = [
  'metadata',     // Regular property
  'users[]',      // Array decomposition: z.array(T) → z.object({ index: number, value: T })
  'settings{}'    // Record decomposition: z.record(K, V) → z.object({ key: K, value: V })
];

const decomposed = decomposeSchema(dataSchema, plan);
console.log(decomposed);
// [
//   { name: "metadata", schema: z.object({ metadata: z.string() }), targetPaths: ["metadata"] },
//   { name: "users-item", schema: z.object({ index: z.number(), value: UserSchema }), targetPaths: ["users[]"] },
//   { name: "settings-entry", schema: z.object({ key: z.string(), value: SettingSchema }), targetPaths: ["settings{}"] }
// ]

// Apply single-item updates
const currentData = {
  users: [
    { name: 'Alice', email: 'alice@example.com', roles: ['user'] },
    { name: 'Bob', email: 'bob@example.com', roles: ['admin'] }
  ],
  settings: {
    theme: { enabled: true, value: 'dark' },
    debug: { enabled: false, value: 'off' }
  },
  metadata: 'User Management System'
};

// Update a specific array element
const usersSchema = decomposed.find(s => s.name === 'users-item');
const arrayUpdate = { 
  index: 0, 
  value: { name: 'Alice Updated', email: 'alice.new@example.com', roles: ['user', 'moderator'] }
};
const updatedData = applyPartialUpdate(currentData, usersSchema.targetPaths, arrayUpdate);

// Update a specific record entry
const settingsSchema = decomposed.find(s => s.name === 'settings-entry');
const recordUpdate = { 
  key: 'debug', 
  value: { enabled: true, value: 'verbose' }
};
const finalData = applyPartialUpdate(updatedData, settingsSchema.targetPaths, recordUpdate);
```

### Split Plan Validation

```typescript
import { validatePlan } from '@your-company/decompose-zod-schema';

const plan = ['user', 'profile', 'nonexistent.path', 'category[1000]'];
const errors = validatePlan(plan, userSchema);

if (errors.length > 0) {
  console.log('Plan validation errors:', errors);
  // ["Path 'nonexistent.path' does not exist in schema", "Invalid slice range..."]
}
```

### Advanced Strategy System

```typescript
import { 
  suggestWithStrategy, 
  SuggestionStrategyRegistry,
  SemanticSuggestionStrategy 
} from '@your-company/decompose-zod-schema';

// Use different suggestion strategies
const sizeBasedPlan = suggestWithStrategy('size-based', userSchema, {
  maxTokensPerSchema: 1500,
  maxOptionsPerEnum: 50
});

// Register custom strategies
const registry = new SuggestionStrategyRegistry();
registry.register(new SemanticSuggestionStrategy());

const semanticPlan = registry.suggest('semantic', userSchema, {});
```

### Partial Updates

```typescript
const currentUser = {
  user: { id: '123', name: 'John', email: 'john@example.com' },
  profile: { bio: 'Developer', avatar: 'https://example.com/avatar.jpg' },
  preferences: { theme: 'light', language: 'en' },
};

// Apply a partial update for just the user information
const updatedUser = applyPartialUpdate(
  currentUser,
  ['user.id', 'user.name', 'user.email'],
  { id: '456', name: 'Jane', email: 'jane@example.com' }
);

console.log(updatedUser);
// {
//   user: { id: '456', name: 'Jane', email: 'jane@example.com' },
//   profile: { bio: 'Developer', avatar: 'https://example.com/avatar.jpg' },  // unchanged
//   preferences: { theme: 'light', language: 'en' }  // unchanged
// }
```

## Command Line Interface

A Node.js CLI is provided for testing and analyzing schema decomposition:

```bash
# Run tests
npm test

# Analyze a schema
npm run example

# Custom analysis
node decompose-cli.js -i schema.ts -s mySchema -t 1000 -v
```

### CLI Options

- `-i, --input <file>`: Input TypeScript file containing schema
- `-s, --schema <name>`: Name of the schema variable to decompose
- `-o, --output <file>`: Output JSON file for results
- `-t, --tokens <number>`: Maximum tokens per decomposed schema (default: 2000)
- `-e, --enum-size <number>`: Maximum enum size before splitting (default: 200)
- `-v, --verbose`: Verbose output
- `-h, --help`: Show help

## Testing

Comprehensive tests are provided using Node.js test frameworks:

```bash
cd packages/decompose-zod-schema
npm test
```

Tests cover:
- Basic schema decomposition
- Nested object handling
- Large enum splitting
- Partial update functionality
- Round-trip validation (ensuring decomposed updates maintain schema validity)

## Implementation Details

### Architecture Overview

The library is structured into distinct modules for maximum flexibility:

1. **Types** (`types.ts`): Core type definitions including `SplitPlan`, `DecomposedSchema`, and strategy interfaces
2. **Utils** (`utils.ts`): Internal utility functions for path manipulation, schema extraction, and validation
3. **Manual Decompose** (`manual-decompose.ts`): Core decomposition logic using explicit split plans
4. **Decompose** (`decompose.ts`): Main entry point that delegates to manual decomposition
5. **Split Suggestions** (`split-suggestions.ts`): Strategy system for automatic plan generation
6. **Index** (`index.ts`): Public API with convenience wrapper function

### Split Plan System

Split plans use a simple string-based notation:

```typescript
type SplitPlan = Array<
  | string                    // Simple path: 'user' or 'profile.bio'
  | `${string}[${number}]`    // Chunk notation: 'category[50]'
  | `${string}[${number}:${number}]`  // Slice notation: 'category[0:50]'
>;
```

Examples:
- `'user'` - Extract the entire 'user' object
- `'profile.bio'` - Extract just the bio field from profile
- `'category[50]'` - Split category enum into chunks of 50 items each
- `'category[0:50]'` - Extract specific slice from category enum

### Strategy Pattern for Suggestions

The suggestion system uses a plugin architecture:

```typescript
interface SuggestionStrategy {
  name: string;
  suggest(schema: ZodObject<Record<string, ZodType>>, options?: unknown): SplitPlan;
}
```

Built-in strategies:
- **Size-based**: Groups schemas by token count limits and enum size constraints
- **Semantic**: (Future) Groups by property name patterns and domain semantics

### Enum Handling

Enums support multiple splitting approaches:
- **Even chunking**: Distributes enum options evenly across chunks
- **Size-based chunking**: Creates chunks with maximum size limits
- **Explicit slicing**: Allows precise control over enum ranges

```typescript
// Original enum
z.enum(['opt1', 'opt2', ..., 'opt100'])

// Chunked with bracket notation
'category[25]' → [
  'category[0:25]',   // opts 1-25
  'category[25:50]',  // opts 26-50
  'category[50:75]',  // opts 51-75
  'category[75:100]'  // opts 76-100
]
```

## TypeScript Support

All types are properly defined with generic constraints:
- `DecomposedSchema`: Represents a decomposed schema with metadata
- `DecompositionOptions`: Configuration options for decomposition
- Full type inference for schema shapes and validation results

## Error Handling

The utility provides comprehensive error handling:
- Schema validation errors during decomposition
- Invalid partial update attempts
- Type mismatches and constraint violations
- Detailed error messages for debugging