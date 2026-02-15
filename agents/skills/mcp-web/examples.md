@ -1,442 +0,0 @@
# MCP-Web Examples

Detailed examples and patterns for building MCP-Web applications.

## Common Patterns

### Pattern 1: Settings Object

Fixed-shape configuration exposed as state tools:

```typescript
const SettingsSchema = z.object({
  sortBy: z.enum(['date', 'priority']).describe('Field to sort by'),
  sortOrder: z.enum(['asc', 'desc']).describe('Sort direction'),
  showCompleted: z.boolean().describe('Whether to show completed items'),
}).describe('Display settings');

const [getSettings, setSettings, cleanup] = mcp.addStateTools({
  name: 'settings',
  description: 'Display settings for the todo list',
  schema: SettingsSchema,
  get: () => settings,
  set: (value) => { Object.assign(settings, value); },
});
```

### Pattern 2: Collection with Expanded Tools

Arrays or records that grow over time:

```typescript
import { id, system } from '@mcp-web/core';

// Mark id field for ID-based tools (instead of index-based)
const TodoSchema = z.object({
  id: id(system(z.string().default(() => crypto.randomUUID()))),
  title: z.string().describe('Todo title'),
  completed: z.boolean().default(false),
}).describe('A todo item');

const TodoListSchema = z.array(TodoSchema);

const [getTodos, todoTools, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'List of all todo items',
  schema: TodoListSchema,
  get: () => todos,
  set: (value) => { todos = value; },
  expand: true,  // Generates add/update/delete tools
});

// With id() marker, creates ID-based tools:
// get_todos({ id?: string })
// set_todos({ id: string, value: Partial<Todo> })
// add_todos({ value: { title: string, completed?: boolean } })
// delete_todos({ id: string } | { all: true })

// Without id() marker, creates index-based tools:
// get_todos({ index?: number })
// set_todos({ index: number, value: Partial<Todo> })
// add_todos({ value: Todo, index?: number })
// delete_todos({ index: number } | { all: true })
```

### Pattern 3: Complex Operation with Validation

Multi-step operations that require business logic:

```typescript
const PaymentSchema = z.object({
  orderId: z.string().describe('Order to pay for'),
  amount: z.number().describe('Payment amount'),
  method: z.enum(['card', 'bank']).describe('Payment method'),
}).describe('Payment request');

mcp.addTool({
  name: 'process_payment',
  description: 'Process payment and update order status',
  handler: async (payment) => {
    // Validate
    if (payment.amount < order.total) {
      return { error: 'Insufficient amount' };
    }

    // Multi-step operation
    const result = await processPayment(payment);
    order.status = 'paid';
    order.paymentId = result.id;
    inventory.reserve(order.items);

    return { success: true, orderId: order.id };
  },
  inputSchema: PaymentSchema,
  outputSchema: z.union([
    z.object({ success: z.literal(true), orderId: z.string() }),
    z.object({ error: z.string() }),
  ]),
});
```

### Pattern 4: Frontend Queries to AI

Allow frontend to ask AI for help. Requires `agentUrl` in config.

```typescript
// Option 1: Provide getter tool as context (pre-computed, recommended)
export async function askAIForMove() {
  const query = mcp.query({
    prompt: 'Analyze the board and make your move',
    context: [getGameStateToolDefinition],  // Tool value is pre-computed
    responseTool: makeMoveToolDefinition,   // AI must call this tool
  });

  // Use query.stream for fine-grained event handling
  for await (const event of query.stream) {
    switch (event.type) {
      case 'query_accepted':
        console.log('Query accepted:', event.uuid);
        break;
      case 'query_progress':
        console.log('Progress:', event.message);
        break;
      case 'query_complete':
        return event.toolCalls;  // Array of tool calls made
      case 'query_failure':
        throw new Error(event.error);
    }
  }
}

// Option 2: Provide ephemeral context (ad-hoc data)
const query = mcp.query({
  prompt: 'Summarize this data',
  context: [
    {
      name: 'custom_data',
      value: { someKey: 'someValue' },
      description: 'Custom context for this query',
    },
  ],
});

// Option 3: Simple await for result
const result = await query.result;  // Returns complete or failure event

// Option 4: Cancel a query
const query = mcp.query({ prompt: 'Long running task' });
query.cancel();  // Cancels the query

// Option 5: Cancel with AbortController
const abortController = new AbortController();
const query = mcp.query({ prompt: 'Task' }, abortController.signal);
setTimeout(() => abortController.abort(), 30000);  // Auto-cancel after 30s
```

### Pattern 5: Grouped State with `groupState`

Group semantically related atomic state variables into a single tool set.
Useful when using declarative reactive state (atoms, refs, signals).

```typescript
import { groupState } from '@mcp-web/core';

// Each entry: [getter, setter, schema]
const settingsGroup = groupState({
  sortBy: [getSortBy, setSortBy, SortBySchema],
  sortOrder: [getSortOrder, setSortOrder, SortOrderSchema],
  showCompleted: [getShowCompleted, setShowCompleted, ShowCompletedSchema],
  theme: [getTheme, setTheme, ThemeSchema],
});

// groupState returns { schema, get, set } - spreads into addStateTools
const [getSettings, setSettings, cleanup] = mcp.addStateTools({
  name: 'settings',
  description: 'Display and app settings',
  ...settingsGroup,  // Spreads schema, get, set
});

// The generated setter accepts partial updates:
// set_settings({ sortBy: 'priority' })  // Only updates sortBy
// set_settings({ sortBy: 'date', theme: 'dark' })  // Updates both
```

### Pattern 6: Split Large Schemas

For large state objects, create focused setters with `schemaSplit`:

```typescript
const [getGameState, setters, cleanup] = mcp.addStateTools({
  name: 'game_state',
  description: 'Complete game state',
  schema: GameStateSchema,
  get: () => state,
  set: (value) => { Object.assign(state, value); },
  schemaSplit: [
    'currentPlayer',               // Individual setter
    ['score.red', 'score.black'],  // Grouped setter
    'settings',                    // Nested object setter
  ],
});

// Creates one getter + multiple focused setters:
// get_game_state() - returns everything
// set_game_state_current_player({ value: 'red' })
// set_game_state_score({ value: { red: 5, black: 3 } })
// set_game_state_settings({ value: { ... } })

// setters is an array of ToolDefinition[]
```

### Pattern 7: Sentinel Values for Computed Defaults

When `null` could mean multiple things:

```typescript
const ColorRangeSchema = z.object({
  min: z.union([
    z.number(),
    z.literal('auto')
  ]).describe('Min value or "auto" for 1st percentile'),

  max: z.union([
    z.number(),
    z.literal('auto')
  ]).describe('Max value or "auto" for 99th percentile'),
});

// Usage
set_color_range({ min: 0, max: 100 })         // Explicit values
set_color_range({ min: 'auto', max: 'auto' }) // Auto-compute
```

### Pattern 8: Game Action with Context Return

Return useful context from actions to help AI understand results:

```typescript
mcp.addTool({
  name: 'make_move',
  description: 'Make a move in the game',
  handler: (move) => {
    // Validate
    if (!isValidMove(move)) {
      return { error: 'Invalid move' };
    }

    // Update multiple states atomically
    state.board = applyMove(state.board, move);
    state.moveHistory.push(move);
    state.currentPlayer = switchPlayer();
    state.gameStatus = checkGameStatus();

    // Return useful context
    return {
      success: true,
      numCapturedPieces: 2,
      gameStatus: state.gameStatus,
      nextPlayer: state.currentPlayer,
    };
  },
  inputSchema: MoveSchema,
});
```

### Pattern 9: Named Sessions for Multi-Tab Apps

When multiple tabs of your app connect simultaneously, use `sessionName` so
Claude can identify them by human-readable labels instead of UUIDs:

```typescript
// game-names.ts — localStorage slot allocator
const STORAGE_KEY = 'game-slots';

export function claimGameName(): { name: string; release: () => void } {
  const slots: (string | null)[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || '[]'
  );
  let index = slots.findIndex((s) => s === null);
  if (index === -1) index = slots.length;
  const id = crypto.randomUUID();
  slots[index] = id;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));

  return {
    name: `Game ${index + 1}`,
    release: () => {
      const current: (string | null)[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );
      const i = current.indexOf(id);
      if (i !== -1) {
        current[i] = null;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      }
    },
  };
}

// mcp-tools.ts
import { claimGameName } from './game-names';

const { name, release } = claimGameName();
export const releaseGameName = release;

export const mcpWeb = new MCPWeb({
  name: 'Checkers',
  description: 'Interactive checkers game',
  sessionName: name,  // e.g. "Game 1", "Game 2"
});

// App.svelte — release slot on teardown
import { onDestroy } from 'svelte';
import { releaseGameName } from './mcp-tools';

onDestroy(() => releaseGameName());
```

Session names must be unique per auth token. If a second tab tries to claim
the same name, `connect()` rejects with an error and no reconnection is
attempted. The slot allocator above prevents this by assigning the first
available slot.

## Demo: Checkers Game

The checkers demo (`demos/checkers/`) exemplifies these patterns:

### State Structure

```typescript
// state.svelte.ts - Declarative state with derived values
import type { GameState } from './types';
import { getLegalMoves } from './game-logic';

let gameState = $state<GameState>(createInitialState());

// Derived values computed reactively
const allValidMoves = $derived(getLegalMoves(gameState));

export const state = {
  get gameState() { return gameState; },
  set gameState(value) { gameState = value; },
  get allValidMoves() { return allValidMoves; },
};
```

### Schema Design

```typescript
// schemas.ts - Rich descriptions for AI understanding
export const PlayerSchema = z.enum(['red', 'black'])
  .describe('The player color');

export const PositionSchema = z.object({
  row: z.number().min(0).max(7).describe('Row index (0-7)'),
  col: z.number().min(0).max(7).describe('Column index (0-7)'),
}).describe('Board position');

export const GameStateSchema = z.object({
  board: z.array(z.array(CellSchema))
    .describe('8x8 board, row-major order'),
  currentPlayer: PlayerSchema,
  moveHistory: z.array(MoveSchema),
  gameStatus: GameStatusSchema,
}).describe('Complete game state');
```

### Tool Registration

```typescript
// mcp.ts - Getter for state, action for moves
export const mcpWeb = new MCPWeb(MCP_WEB_CONFIG);

// Getter exposes state + derived values (useful for query context)
export const getGameStateToolDefinition = mcpWeb.addTool({
  name: 'get_game_state',
  description: 'Get current game state including valid moves',
  handler: () => ({
    ...state.gameState,
    valid_moves: state.allValidMoves,
  }),
  outputSchema: GameStateSchema,
});

// Action tool with validation (can be used as responseTool)
export const makeMoveToolDefinition = mcpWeb.addTool({
  name: 'make_move',
  description: 'Make a move (must be in valid_moves)',
  handler: (move) => {
    const isValid = state.allValidMoves.some(m =>
      m.from.row === move.from.row &&
      m.from.col === move.from.col &&
      m.to.row === move.to.row &&
      m.to.col === move.to.col
    );
    
    if (!isValid) {
      return { error: 'Invalid move - not in valid moves list' };
    }
    
    const newState = makeMove(state.gameState, move);
    Object.assign(state.gameState, newState);
    
    return {
      numCapturedPieces: /* captured count */,
      gameStatus: state.gameState.gameStatus,
    };
  },
  inputSchema: MoveSchema,
  outputSchema: z.union([
    z.object({ numCapturedPieces: z.number(), gameStatus: GameStatusSchema }),
    z.object({ error: z.string() }),
  ]),
});
```

## Framework Examples

### Vue with Pinia

```typescript
// stores/app.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAppStore = defineStore('app', () => {
  const todos = ref<Todo[]>([]);
  
  // Derived state (stays in frontend, not exposed to AI)
  const activeTodos = computed(() => 
    todos.value.filter(t => !t.completed)
  );
  
  return { todos, activeTodos };
});

// mcp.ts
const store = useAppStore();

const [getTodos, todoTools, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'All todo items in the app',
  schema: TodoListSchema,
  get: () => store.todos,
  set: (value) => { store.todos = value; },
  expand: true,
});

// Remember to call cleanup() when component unmounts
```

### React with Zustand

```typescript
// store.ts
import { create } from 'zustand';

interface AppState {
  todos: Todo[];
  setTodos: (todos: Todo[]) => void;
}

export const useStore = create<AppState>((set) => ({
  todos: [],
  setTodos: (todos) => set({ todos }),
}));

// mcp.ts (outside component for global state)
const [getTodos, todoTools, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'All todo items in the app',
  schema: TodoListSchema,
  get: () => useStore.getState().todos,
  set: (value) => useStore.getState().setTodos(value),
  expand: true,
});
```

### Svelte with Runes

```typescript
// state.svelte.ts
let todos = $state<Todo[]>([]);
const activeTodos = $derived(todos.filter(t => !t.completed));

export const state = {
  get todos() { return todos; },
  set todos(value) { todos = value; },
  get activeTodos() { return activeTodos; },  // Not exposed to AI
};

// mcp.ts
const [getTodos, todoTools, cleanup] = mcp.addStateTools({
  name: 'todos',
  description: 'All todo items in the app',
  schema: TodoListSchema,
  get: () => state.todos,
  set: (value) => { state.todos = value; },
  expand: true,
});
```
