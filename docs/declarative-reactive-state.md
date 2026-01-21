# Declarative & Reactive State

A clean way to ensure parity between human and AI when interacting with your
web app, is to model interactions as declarative state changes if they lead to
persistent settings, express transient operations as imperative actions, and
move imperative operations into reactive computation.

::: info Prerequisites
Examples assume you have React and Zod installed:
```tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { z } from 'zod';
import { MCPWeb } from '@mcp-web/core';
```
:::

## Modelling Declarative State

To illustrate this point, let's say we build a todo app with React. We'll need a
state storing the todos. To add a todo you might have a simple form with text
input and an add button:

```jsx
const Todos = () => {
  const [todos, setTodos] = useState([]);

  const newTodoInput = useRef(null);

  function handleClick() {
    if (!newTodoInput.current?.value) return;
    const newTodo = {
      value: newTodoInput.current.value, done: false, date: Date.now(), show: true
    };
    setTodos((currTodos) => [...currTodos, newTodo]);
  }

  return (
    <div>
      <input type="text" ref={newTodoInput} />
      <button onClick={handleClick}>Add</button>
    </div>
  )
}
```

::: info
This is a toy example and for brevity I left out all interactions but those
used for demonstrating the state management. In a real example you'd first load
todos asynchronously and offer ways to close and organize todos. See
[the todo demo](demos/todo) for a complete example.
:::

To expose the same action as an MCP tool with MCP-Web to AI you'd then do:

```jsx{1,14-28}
const mcp = new MCPWeb(MCP_WEB_CONFIG);

const Todos = () => {
  const [todos, setTodos] = useState([]);

  const newTodoInput = useRef(null);

  function handleAddTodo() {
    if (!newTodoInput.current?.value) return;
    const newTodo = {
      value: newTodoInput.current.value, done: false, date: Date.now(), show: true
    };
    setTodos((currTodos) => [...currTodos, newTodo]);
  }

  useEffect(() => {
    const tool = mcp.addTool({
      name: 'add_todo',
      description: 'Add a new todo',
      handler: ({ value }) => {
        const newTodo = { value, done: false, date: Date.now(), show: true };
        setTodos((currTodos) => [...currTodos, newTodo]);
      },
      inputSchema: z.object({ value: z.string() })
    });

    return () => {
      mcp.removeTool(tool.name);
    }
  }, []);

  return (
    <div>
      <input type="text" ref={newTodoInput} />
      <button onClick={handleAddTodo}>Add</button>
    </div>
  );
}
```

For displaying the todos, we might want to allow the user to sort the todos
by date and offering the ability to show or hide todos marked done. We could do
this as follows:

```jsx
const Todos = () => {
  const [todos, setTodos] = useState([]);

  // ...same code as above...

  const [showDone, setShowDone] = useState(false);
  const [sortByDate, setSortByDate] = useState('');

  function handleSortByDateAsc() {
    setTodos([...todos].sort((a, b) => a.date - b.date));
  }

  function handleSortByDateDesc() {
    setTodos([...todos].sort((a, b) => b.date - a.date));
  }

  function handleShowDone() {
    setTodos(todos.map((todo) => { todo.show = !todo.done; return todo; }));
  }

  function handleShowAll() {
    setTodos(todos.map((todo) => { todo.show = true; return todo; }));
  }

  return (
    <div>
      <header>
        <button onClick={handleSortByDateAsc}>Sort by date (asc)</button>
        <button onClick={handleSortByDateDesc}>Sort by date (desc)</button>
        <button onClick={handleShowDone}>Show active todos only</button>
        <button onClick={handleShowAll}>Show all todos</button>
      </header>
      <ol>{todos.map(({ value }) => (<li>{value}</li>))}</ol>
      <footer>
        <input type="text" ref={newTodoInput} />
        <button onClick={handleAddTodo}>Add</button>
      </footer>
    </div>
  );
}
```

While this approach works fine, to expose those settings as MCP tools as well
we'd need to repeat the handler functions, which becomes tedious. It also
doesn't allow us to easily persist the view state as everything is imperatively
computed.

A more elegant solution is to model persistent settings as declarative state
and reactively compute derived values. That way, it becomes trivial to handle
state changes via event (e.g., onClick callbacks) and tool handlers.

See how we refactor the todos

```tsx
const SettingsSchema = z.object({
  sortByDate: z.enum(['asc', 'desc']).default('asc').describe('Todos sort order'),
  showDone: z.bool().default(false).describe('If `true`, show completed todos'),
}).describe('Todo settings');

const AddTodoSchema = z.object({
  value: z.string().describe('Todo value'),
}).describe('Add new todo');

const defaultSettings = SettingsSchema.parse({});

const Todos = () => {
  // Declarative states:
  // these represent the atomic values, i.e., values that cannot be derived from
  // other states
  const [todos, setTodos] = useState([]);
  const [settings, setSettings] = useState<z.infer<typeof SettingsSchema>>(
    defaultSettings
  );

  // Imperative actions:
  // these are operations that change the shape of declarative state above
  function addTodo({ value }: z.input<typeof AddTodoSchema>) {
    const newTodo = { value, done: false, date: Date.now() };
    setTodos((currTodos) => [...currTodos, newTodo]);
  }

  // Reactively derived value:
  // Note how reactively deriving the displayed todos allows us to completely
  // get rid of the `show` property.
  const displayedTodos = useMemo(
    () =>
      todos
        .filter(({ done }) => settings.showDone || !done)
        .sort((a, b) => {
          if (settings.sortByDate === 'asc') return a.date - b.date;
          if (settings.sortByDate === 'desc') return b.date - a.date;
          return 0;
        }),
    [todos, settings]
  );

  useEffect(() => {
    // Expose settings as a state setter and getter tool. Since this is such
    // a common task, MCP-Web offers the `addStateTools` helper.
    // See: /api-reference#addstatetools
    const [
      getSettings,
      setSettings,
      cleanupSettings
    ] = mcp.addStateTools({
      name: 'todos_settings',
      description: 'Todos settings like sorting and showing completed todos',
      get: () => settings,
      set: (newSettings) => { setSettings(newSettings); },
      schema: SettingsSchema
    });

    // Expose the add todo action as a tool
    // See: /api-reference#addtool
    const addTodoTool = mcp.addTool({
      name: 'add_todo',
      description: 'Add a new todo',
      handler: ({ value }) => {
        const newTodo = { value, done: false, date: Date.now() };
        setTodos((currTodos) => [...currTodos, newTodo]);
      },
      inputSchema: AddTodoSchema
    });

    return () => {
      cleanupSettings();
      mcp.removeTool(addTodoTool.name);
    }
  }, []);

  const newTodoInput = useRef(null);

  function handleAddTodo() {
    if (newTodoInput.current?.value) {
      addTodo({ value: newTodoInput.current.value });
    }
  }

  function handleSortByDateAsc() {
    setSettings((curr) => ({ ...curr, sortByDate: 'asc' }));
  }

  function handleSortByDateDesc() {
    setSettings((curr) => ({ ...curr, sortByDate: 'desc' }));
  }

  function handleShowDone() {
    setSettings((curr) => ({ ...curr, showDone: false }));
  }

  // Same as before
  return (...)
}
```

A key insight here is that declarative+reactive approach isn't more complex. We
just move imperative logic from event handlers into two clear places:
1. action functions (for shape changes)
2. derived computations (for computed values)

::: info
Typically, derived values should not be exposed to AI. However, in cases where
the derived value is useful and non-trivial to infer, it can make sense to
expose a getter tool.
:::

You might wonder if we could similarly represent the _add todo_ action as
declarative state. While technically possible, it's better to model operations
that change the shape of state as actions for scalability reasons.

For instance, imagine we expose a todo setter tool. This would allow AI to add
new todos by reading the current state and then setting a new state with an
additional todo. While this works it can be brittle and waste tokens as
unchanged todos would have to be re-generated.

It'd be similarly wasteful to ask AI to sort the list of todos directly. It's
much more efficient to just set the sort order and reactively derive a sorted
array of todos.

In summary, the following is a simple guideline one can follow:

::: tip Rules of Thumb
If an operation changes the shape of declarative state (e.g., add/remove
elements), it's an action. If an operation just changes the value while
preserving the shape, it's a state setter.

Anything that can be derived, should be modeled as derived values.

Expose declarative state and accompanying actions as MCP tools.
:::

The action vs setter also nicely maps to zod schemas:

**Fixed-shape schemas → state setters:**

- `z.object()`: fixed keys, just changing properties
- `z.tuple([z.number(), z.number()])`: fixed length, just changing elements
- `z.literal()`, `z.enum()`, `z.string()`: just changing primitive values

**Dynamic-shape schemas → actions:**

- `z.record(z.string(), z.any())`: keys can be added/removed
- `z.array(z.any())`: length can varies
- `z.map()`, `z.set()`: items can be added/removed

::: tip Expanded Tools for Large Schemas
For schemas with collections (arrays, records) that grow over time, consider
using `expand: true` to generate targeted tools for efficient state
manipulation.

See our [Expanded Tools Guide](/expanded-state-tools) for details.
:::

::: tip Handling Optional Fields
JSON doesn't support `undefined`, which makes `optional()` problematic for
partial updates. Use `nullable().default(null)` instead, and consider sentinel
values like `'auto'` for computed defaults.

See [Handling Optional and Default Values](/designing-state-tools#handling-optional-and-default-values)
for patterns and examples.
:::

## State vs Action Tools

### Use State Tools (Direct Access)

For semantically related declarative state where the shape of the state is
fixed, expose the state directly as a state tool.

```typescript
const [getTheme, setTheme] = mcp.addStateTools({
  name: 'theme',
  description: 'Application theme',
  get: () => settings.theme,
  set: (value) => { settings.theme = value; },
  schema: z.enum(['light', 'dark']),
});
```

**Best for:**
- Simple values (strings, numbers, booleans)
- Objects without complex validation
- State that doesn't require coordination

### Use Action Tools (Explicit Commands)

When operations change the shape of declarative state (e.g., adding a record to
an object or an item to an array) or when operations involve logic, validation,
or multiple state updates:

```typescript
mcp.addTool({
  name: 'make_move',
  description: 'Make a chess move',
  handler: (move) => {
    // 1. Validate move is legal
    if (!isValidMove(move)) {
      throw new Error('Illegal move');
    }

    // 2. Update multiple state variables
    state.board = applyMove(state.board, move);
    state.moveHistory.push(move);
    state.currentPlayer = switchPlayer(state.currentPlayer);

    // 3. Check game end conditions
    state.gameStatus = checkGameStatus(state.board);

    return { success: true, gameStatus: state.gameStatus };
  },
  inputSchema: MoveSchema,
});
```

**Best for:**
- Complex validation logic
- Multi-step/state operations
- Side effects (logging, analytics, etc.)

**Example:** HiGlass viewconf is very complex—better to expose actions like
`add_track` than letting AI set the entire config.
