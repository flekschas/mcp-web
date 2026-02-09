# Working with Large State Schemas

When working with complex state objects, exposing the entire state as a single
tool can lead to poor performance. Large schemas can make it difficult for the
AI to stay focused and understand what exactly it needs to be changed to
fulfill a prompt. Moreover, large schemas can be inefficient in terms of the
input and output tokens.

**Schema splitting** solves this by creating focused setter tools that target
specific parts of your state while maintaining a single getter for the complete
state.

::: warning When Do You Need This?
Schema splitting is primarily useful for **legacy apps** built around a
monolithic state object that can't easily be refactored.

**Building a new app?** You likely don't need schema splitting. Instead:
- Design your state with logical groupings from the start
  (see [Structuring Your App](/structuring-your-app))
- Use [Expanded State Tools](/expanded-state-tools) which automatically
  generates efficient tools based on your schema structure

The opposite problem—having too many small state variables—is better solved by
grouping related state into well-designed objects, not by splitting.
:::

## The Problem

Consider a game state with multiple nested structures:

```typescript
interface GameState {
  board: string[][];           // 8x8 grid
  players: Player[];           // 2 players with stats
  currentPlayer: number;       // Current turn
  score: {
    red: number;
    black: number;
  };
  moveHistory: Move[];         // All previous moves
  settings: GameSettings;      // UI preferences
}
```

Without decomposition, the AI must:
1. Fetch the entire 500+ line state object
2. Understand all fields even if only updating the score
3. Send back the entire modified state
4. Risk accidentally modifying unrelated fields

## The Solution: Schema Decomposition

Schema decomposition creates **multiple setter tools** from a single schema:

```typescript
const [getGameState, setGameState] = mcp.addStateTools({
  name: 'game_state',
  description: 'Current game state',
  get: () => state,
  set: (value) => { state = value; },
  schema: GameStateSchema,
  schemaSplit: [
    'board',                     // Creates: set_game_state_board
    'currentPlayer',             // Creates: set_game_state_current_player
    ['score.red', 'score.black'], // Creates: set_game_state_score
    'settings',                  // Creates: set_game_state_settings
  ],
});
```

Now the AI can:
- Call `get_game_state()` to see the full state
- Call `set_game_state_score({ red: 10, black: 8 })` to update just the score
- Call `set_game_state_current_player(1)` to switch turns
- Call `set_game_state_board(newBoard)` to update the board

## Split Patterns

### Single Field Split

Target individual top-level fields:

```typescript
schemaSplit: ['board', 'currentPlayer', 'settings']
```

Creates:
- `set_game_state_board(board: string[][])`
- `set_game_state_current_player(currentPlayer: number)`
- `set_game_state_settings(settings: GameSettings)`

### Grouped Field Split

Combine related nested fields into one setter:

```typescript
schemaSplit: [
  ['score.red', 'score.black'],  // Single setter for both scores
  ['settings.theme', 'settings.sound'], // Single setter for settings
]
```

Creates:
- `set_game_state_score({ red: number, black: number })`
- `set_game_state_settings({ theme: string, sound: boolean })`

### Array Element Split

Target individual array elements with `[]`:

```typescript
const ConfigSchema = z.object({
  views: z.array(ViewSchema),
  tracks: z.object({
    top: z.array(TrackSchema),
    bottom: z.array(TrackSchema),
  }),
});

schemaSplit: [
  'views[]',              // Add/update single view
  'tracks.top[]',         // Add/update single top track
  'tracks.bottom[]',      // Add/update single bottom track
]
```

Creates:
- `set_config_views(view: View)` - AI specifies which view by ID/index
- `set_config_tracks_top(track: Track)` - Add/update single top track
- `set_config_tracks_bottom(track: Track)` - Add/update single bottom track

## Usage Example

Here's how to use schema splitting with `addStateTools`:

```typescript
import { MCPWeb } from '@mcp-web/core';
import { z } from 'zod';

const mcp = new MCPWeb({ name: 'My App' });

const GameStateSchema = z.object({
  board: z.array(z.array(z.string())),
  currentPlayer: z.number(),
  score: z.object({
    red: z.number(),
    black: z.number(),
  }),
  settings: z.object({
    theme: z.string(),
    sound: z.boolean(),
  }),
});

let state = { /* initial state */ };

mcp.addStateTools({
  name: 'game_state',
  description: 'Current game state',
  get: () => state,
  set: (value) => { state = value; },
  schema: GameStateSchema,
  schemaSplit: [
    'board',
    'currentPlayer',
    ['score.red', 'score.black'],  // Grouped setter
    'settings',
  ],
});
```

This creates:
- `get_game_state()` - Returns full state
- `set_game_state_board(board)` - Update board only
- `set_game_state_current_player(player)` - Update current player
- `set_game_state_score({ red, black })` - Update both scores together
- `set_game_state_settings(settings)` - Update settings

::: tip Real-World Example
See the [HiGlass demo](/demos/higlass) for schema splitting in a complex
genome browser configuration with deeply nested tracks and views.
:::

## Best Practices

### 1. Split by Use Case
Think about how the AI will modify your state:
```typescript
// Good - splits align with user actions
schemaSplit: [
  'currentPlayer',    // "Switch to next player"
  'score',           // "Update the score"
  'board',           // "Make a move"
]

// Bad - arbitrary technical splits
schemaSplit: [
  ['currentPlayer', 'moveHistory'],  // Unrelated fields
]
```

### 2. Group Related Fields
```typescript
// Good - theme settings updated together
schemaSplit: [
  ['settings.theme', 'settings.colorScheme', 'settings.fontSize'],
]

// Bad - split theme settings
schemaSplit: [
  'settings.theme',
  'settings.colorScheme',
  'settings.fontSize',
]
```

### 3. Use Array Splits for Collections
```typescript
// Good - update individual items
schemaSplit: ['todos[]', 'groups[]']

// Bad - replace entire arrays
schemaSplit: ['todos', 'groups']
```

### 4. Keep Getters Simple
The getter always returns the complete state. Only decompose setters:

```typescript
// The getter remains simple
get_game_state() → { board: [...], currentPlayer: 0, score: {...}, ... }

// Setters are focused
set_game_state_board(newBoard)
set_game_state_current_player(playerId)
set_game_state_score({ red: 10, black: 8 })
```

## Combining with Expanded Tools

Schema splitting can be combined with [expanded tools](/expanded-state-tools)
for maximum efficiency. When you use both `schemaSplit` and `expandedTools: true`:

1. **Split first**: Extract the specified props into separate tool groups
2. **Expand second**: Generate expanded tools for each part (including the remainder)

```typescript
const AppSchema = z.object({
  // Collections - will get expanded tools (get/add/set/delete)
  todos: z.array(TodoSchema),
  projects: z.record(z.string(), ProjectSchema),
  // Settings - will get grouped tools via split
  displaySettings: z.object({
    sortBy: z.enum(['created_at', 'priority']),
    sortOrder: z.enum(['asc', 'desc']),
    showCompleted: z.boolean(),
  }),
});

mcp.addStateTools({
  name: 'app',
  description: 'Todo application state',
  get: () => store.app,
  set: (value) => { store.app = value; },
  schema: AppSchema,
  schemaSplit: ['displaySettings'],  // Group settings together
  expandedTools: true,               // Expand collections
});
```

This generates focused tools for both the grouped settings and individual
collection operations (add/set/delete for todos and projects).

## Summary

- Use `schemaSplit` for complex nested state in legacy apps
- Split by use case, not arbitrary structure
- Group related fields that change together
- Use `[]` for array element operations
- Keep getters simple, decompose setters
- Combine with `expandedTools: true` for automatic collection tools
