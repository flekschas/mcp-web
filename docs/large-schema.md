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

## Framework Examples

### React with `useTool`

```typescript
import { useTool } from '@mcp-web/react';
import { z } from 'zod';

function GameApp() {
  const [gameState, setGameState] = useState<GameState>(initialState);

  useTool({
    mcp,
    name: 'game_state',
    description: 'Current game state',
    value: gameState,
    setValue: setGameState,
    valueSchema: GameStateSchema,
    valueSchemaSplit: [
      'board',
      'currentPlayer',
      ['score.red', 'score.black'],
    ],
  });

  return <Game state={gameState} />;
}
```

### Jotai with `addAtomTool`

```typescript
import { addAtomTool } from '@mcp-web/web/integrations/jotai';
import { atom } from 'jotai';

const gameStateAtom = atom<GameState>(initialState);

addAtomTool({
  mcp,
  atom: gameStateAtom,
  name: 'game_state',
  description: 'Current game state',
  atomSchema: GameStateSchema,
  atomSchemaSplit: [
    'board',
    'currentPlayer',
    ['score.red', 'score.black'],
  ],
});
```

### Vue with Pinia

```typescript
import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameState>(initialState);

  return { gameState };
});

// In MCP setup
const store = useGameStore();

mcp.addStateTools({
  name: 'game_state',
  description: 'Current game state',
  get: () => store.gameState,
  set: (value) => { store.gameState = value; },
  schema: GameStateSchema,
  schemaSplit: [
    'board',
    'currentPlayer',
    ['score.red', 'score.black'],
  ],
});
```

### Svelte 5 Runes

```typescript
// state.svelte.ts
let gameState = $state<GameState>(initialState);

export const state = {
  get gameState() { return gameState; },
  set gameState(value: GameState) { gameState = value; },
};

// mcp.ts
import { state } from './state.svelte';

mcp.addStateTools({
  name: 'game_state',
  description: 'Current game state',
  get: () => state.gameState,
  set: (value) => { state.gameState = value; },
  schema: GameStateSchema,
  schemaSplit: [
    'board',
    'currentPlayer',
    ['score.red', 'score.black'],
  ],
});
```

## Real-World Example: HiGlass Configuration

The [HiGlass genome browser](https://higlass.io) has a complex nested configuration:

```typescript
const HiglassConfigSchema = z.object({
  editable: z.boolean(),
  views: z.array(z.object({
    uid: z.string(),
    tracks: z.object({
      top: z.array(TrackSchema),
      center: z.array(TrackSchema),
      bottom: z.array(TrackSchema),
      left: z.array(TrackSchema),
      right: z.array(TrackSchema),
    }),
    layout: z.object({ w: z.number(), h: z.number(), x: z.number(), y: z.number() }),
  })),
  zoomLocks: z.record(z.string()),
  locationLocks: z.record(z.string()),
  trackSourceServers: z.array(z.string()),
});
```

This could result in 1000+ lines of JSON. With decomposition:

```typescript
addAtomTool({
  mcp,
  atom: higlassConfigAtom,
  name: 'higlass_config',
  description: 'HiGlass visualization configuration',
  atomSchema: HiglassConfigSchema,
  atomSchemaSplit: [
    'views[]',                  // Add/update individual views
    'views[].tracks.top[]',     // Add/update top tracks
    'views[].tracks.center[]',  // Add/update center tracks
    'views[].tracks.bottom[]',  // Add/update bottom tracks
    'zoomLocks',               // Update zoom synchronization
    'locationLocks',           // Update position synchronization
    'trackSourceServers',      // Update data sources
  ],
});
```

Now AI agents can efficiently:
- Add a single track: `set_higlass_config_views_tracks_top({ viewId: "view1", track: {...} })`
- Synchronize zoom: `set_higlass_config_zoom_locks({ view1: "lock1", view2: "lock1" })`
- Add a view: `set_higlass_config_views({ uid: "view3", ... })`

All without fetching or modifying the entire 1000-line config!

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
get_game_state() � { board: [...], currentPlayer: 0, score: {...}, ... }

// Setters are focused
set_game_state_board(newBoard)
set_game_state_current_player(playerId)
set_game_state_score({ red: 10, black: 8 })
```

## When NOT to Use Schema Decomposition

### Small, Flat Objects
```typescript
// No need to decompose - already simple
const UserSchema = z.object({
  name: z.string(),
  email: z.string(),
  age: z.number(),
});
```

### Atomic Updates
When fields must always be updated together:
```typescript
// Position should be updated atomically
const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

// Don't split - always update together
mcp.addStateTools({
  name: 'position',
  description: 'Player position',
  get: () => position,
  set: (value) => { position = value; },
  schema: PositionSchema,
  // No schemaSplit
});
```

### Read-Only State
```typescript
// Derived/computed atoms don't need splitting
const statisticsAtom = atom((get) => {
  const todos = get(todosAtom);
  return {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
  };
});

// Read-only - no setters needed
addAtomTool({
  mcp,
  atom: statisticsAtom,
  name: 'statistics',
  description: 'Todo statistics',
  atomSchema: StatisticsSchema,
  // No atomSchemaSplit - read-only
});
```

## Combining with Expanded Tools

Schema splitting can be combined with [expanded tools](/expanded-state-tools)
for maximum efficiency. When you use both `schemaSplit` and `expandedTools: true`,
the order of operations is:

1. **Split first**: Extract the specified props into separate tool groups
2. **Expand second**: Generate expanded tools for each part (including the remainder)

### When to Use Both

Use schema splitting **with** expanded tools when you have:
- Large schemas with both settings objects and collections
- Semantically related props that should be grouped (e.g., display settings)
- Collections (arrays/records) that benefit from targeted add/set/delete tools

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
  appSettings: z.object({
    theme: z.enum(['system', 'light', 'dark']),
    notifications: z.boolean(),
  }),
});

mcp.addStateTools({
  name: 'app',
  description: 'Todo application state',
  get: () => store.app,
  set: (value) => { store.app = value; },
  schema: AppSchema,
  schemaSplit: [
    'displaySettings',  // Creates: get_app_display_settings, set_app_display_settings
    'appSettings',      // Creates: get_app_app_settings, set_app_app_settings
  ],
  expandedTools: true,  // Expands collections into targeted tools
});
```

This generates:

| Part | Tools | Count |
|------|-------|-------|
| `displaySettings` (split) | get + set | 2 |
| `appSettings` (split) | get + set | 2 |
| Remaining root | get only (collections have no fixed props) | 1 |
| `todos` array | get + set + add + delete | 4 |
| `projects` record | get + set + delete | 3 |
| **Total** | | **12** |

::: note
The root setter is omitted when the remaining schema contains only collections,
since there are no fixed-shape props to set directly.
:::

### When to Use Schema Splitting Alone

Use schema splitting **without** expanded tools when you want:
- Fine-grained control over exactly which setters are created
- To target specific nested paths (e.g., `score.red`, `settings.theme`)
- Simpler tool signatures without collection-specific operations

```typescript
// Without expandedTools - just creates focused setters for paths you specify
mcp.addStateTools({
  name: 'game_state',
  description: 'Game state',
  get: () => state,
  set: (value) => { state = value; },
  schema: GameStateSchema,
  schemaSplit: [
    'currentPlayer',
    ['score.red', 'score.black'],  // Grouped setter for scores
    'settings',
  ],
  // No expandedTools - collections stay as single get/set
});
```

## Performance Benefits

Schema decomposition provides:

1. **Reduced Token Usage**: AI only processes relevant fields
2. **Faster Responses**: Smaller payloads transfer faster
3. **Better AI Understanding**: Focused tools are easier for AI to reason about
4. **Fewer Errors**: Less chance of accidentally modifying unrelated fields
5. **Clearer Intent**: Tool names clearly describe what changes

## Summary

- Use `schemaSplit` / `valueSchemaSplit` / `atomSchemaSplit` for complex nested state
- Split by use case, not arbitrary structure
- Group related fields that change together
- Use `[]` for array element operations
- Keep getters simple, decompose setters
- Skip decomposition for small/flat objects
- Combine with `expandedTools: true` for automatic collection tools (add/set/delete)
