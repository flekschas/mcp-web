# Code Tool

The code tool lets AI write a short JavaScript program that calls your tools as
functions. MCP-Web runs the program in a sandbox and returns the result. This
pattern is often called _code mode_, and it helps in two ways:

- **Changing large state.** A program can read the state, change it, and write
  it back, so the state never has to pass through AI.
- **Combining many tools.** A request that takes several tool calls, some
  depending on others, becomes one program instead of several turns.

::: info Prior Knowledge
This guide assumes you know how to expose state with
[efficient state tools](/efficient-state-tools).
:::

## What the Code Tool Does

Take the todo app from the [efficient state tools](/efficient-state-tools)
guide with `codeMode`. AI sees a tool named `code_app` whose description lists
the state tools as typed functions:

```typescript
/**
 * Get the current value of app. Todo app
 */
async function get_app(): Promise<GetAppOutput>

/**
 * Set the value of app. Todo app
 */
async function set_app(params: SetAppInput): Promise<SetAppOutput>
```

The description also defines the types, such as `SetAppInput`, from your
schema. To make all errands urgent and sort by priority, AI sends one program:

```javascript
const app = await get_app();

for (const todo of app.todos) {
  if (todo.tags.includes('errand')) todo.priority = 5;
}
app.sortBy = 'priority';

await set_app(app);
```

Each function call goes through the same handler and Zod validation as a direct
tool call would, so the program can't do anything the tools don't allow.

The program runs in a sandboxed iframe that can only run scripts. It can't
access your page, and it reaches your app only through the functions it was
given.

## When to Use the Code Tool

Use the code tool when AI changes **large state** or has to **combine many
tools** for one request.

::: tip What We Measured
We compared interfaces on generating chart specifications in three chart
grammars with several models, scoring each chart with automated checks and a
judged comparison to a reference chart. Wrapping many small tools in a code
tool cut total tokens by about 90%, mostly at similar quality. When AI wrote a
whole chart specification at once, sending it as JSON or building it with a
program scored about the same. We haven't measured edits to existing state,
where the savings come from the state staying in the sandbox.
:::

A few things to consider:

- **Weaker models gain and lose the most.** The choice of interface mattered
  most for small models, in both directions. Test with the weakest model you
  plan to support.
- **Keep action tools for domain logic.** Hand-crafted tools such as a
  checkers `make_move` still encode rules AI shouldn't have to know. Wrap them
  in the code tool alongside your state tools (see
  [Any Tools](#any-tools)).
- **AI changes state only through programs.** The wrapped tools aren't
  registered on their own, so even a single change takes a short program.

## Using the Code Tool

### State Tools

Add `codeMode` to your state tools, as shown in
[efficient state tools](/efficient-state-tools#code-mode):

```typescript{1,9}
import { createCodeMode } from '@mcp-web/tools/code';

mcp.addStateTools({
  name: 'app',
  description: 'Todo app',
  get: () => store.app,
  set: (value) => { store.app = value; },
  schema: AppSchema,
  codeMode: createCodeMode(),
});
```

MCP-Web registers a `code_app` tool that offers the state tools as functions.
Only the getter, `get_app`, is also registered on its own: reading the state
doesn't need a program, and since it can't change anything, users can allow it
without reviewing each call.

The generated description of the code tool asks AI to read the state with
`get_app` before changing it, so its programs build on the actual state, such
as the IDs of existing todos.

`addStateTools()` returns the getter, the code tool, and a function that
removes both. `codeMode` works the same way with `createStateTools()`, and with
`expand: true` the program calls the expanded tools instead.

`createCodeMode()` accepts the options described in the rest of this guide, for
example `createCodeMode({ signatures: 'lookup' })`.

### Failed Programs Are Rolled Back

In code mode, MCP-Web snapshots the state before a program runs and restores
the snapshot if the program fails.

Without this, a program whose fourth call fails would keep the first three. AI
would then have to figure out what already happened and write a different
program for what remains. With the snapshot restored, AI can fix its program
and simply run it again.

The snapshot covers the state behind `get` and `set`, nothing else. While the
program runs, its changes are live: your app renders them, and anything your
`set` triggers, such as saving or syncing, happens and isn't undone by the
rollback.

::: warning The State Must Be Cloneable
MCP-Web takes the snapshot with `structuredClone(get())`. If `get` returns
something that can't be cloned, such as a reactive proxy, every program fails.
Return a plain copy instead, e.g. `get: () => $state.snapshot(app)` with
Svelte.
:::

::: warning One Writer at a Time
A rollback restores the whole snapshot. Any change your app made to the same
state while the program ran is undone with it. Avoid writing the state from
elsewhere while a program runs. If a program times out while one of its tool
calls is still running, MCP-Web restores the snapshot when AI next calls the
code tool, once that call has finished.
:::

### Any Tools

Each `codeMode` creates its own code tool, and a program can only call the
tools of that one state. To combine several states, or state tools with
hand-crafted tools, wrap them all in one `CodeTool` and register it with
`addCodeTool()`:

```typescript
import {
  CodeTool,
  combineTransactions,
  stateTransaction,
} from '@mcp-web/tools/code';

const todoTools = createStateTools({ name: 'todos', /* ... */ });
const settingsTools = createStateTools({ name: 'settings', /* ... */ });

mcp.addCodeTool(new CodeTool({
  tools: [
    ...todoTools.tools,
    ...settingsTools.tools,
    archiveCompleted.definition, // from createTool()
  ],
  transaction: combineTransactions(
    stateTransaction(() => store.todos, (value) => { store.todos = value; }),
    stateTransaction(() => store.settings, (value) => { store.settings = value; }),
  ),
}));
```

Here you supply the transaction yourself. `stateTransaction(get, set)` covers
one state, and `combineTransactions()` snapshots and restores several together.
`CodeTool` takes the same options as `createCodeMode()`, except that its
`executor` is an instance (see [Where Programs Run](#where-programs-run)).

## Handling Invalid Calls

When a call's arguments don't match its schema, the code tool skips the call
and keeps running the program. When the program ends, AI gets every problem of
every invalid call at once, so it can fix all of them in one attempt:

```
1 call(s) were invalid and skipped:

Call 2 to set_app:
✖ Invalid option: expected one of "created_at"|"completed_at"|"priority"
  → at sortBy
✖ Too big: expected number to be <=5
  → at todos[0].priority

Its 1 tool call(s) were rolled back, so nothing changed.
```

If you'd rather stop the program at the first invalid call, set
`validationErrors: 'throw'`. The invalid call then throws an error, which the
program can catch.

::: tip Schemas Must Be Synchronous
The code tool validates every call before it runs the handler. Input schemas
must be Zod schemas whose checks are synchronous, so avoid async refinements.
:::

### Adding Hints

If you know mistakes AI tends to make with your tools, you can tell it. The
`description` hint is added to the tool description. `onError` is called for
each problem a failed run reports and can return a hint to show below it:

```typescript
createCodeMode({
  hints: {
    description: 'Priorities range from 1 (lowest) to 5 (highest).',
    onError: (problem, name) => {
      if (name === 'set_app' && problem.includes('priority')) {
        return 'Use 5 for urgent todos and 1 for todos that can wait.';
      }
    },
  },
});
```

Hints help most for state models don't know well. Learn them from the errors AI
actually makes, and check that they help: in our experiments, the same kind of
hint improved results on one chart grammar and hurt them on another.

## Large Tool Sets

By default, the tool description contains the signature of every function.
With many tools or large schemas, that description gets long. Set
`signatures: 'lookup'` to list only the function names and let AI look up the
signatures it needs:

```typescript
createCodeMode({ signatures: 'lookup' });
```

This adds a second tool, `get_code_app_signature`, which MCP-Web registers and
removes together with the code tool. A program can only call a
function after AI has looked it up.

## Fixing Failed Programs

AI usually fixes a failed program by sending it again with a few lines changed.
With `patch: { enabled: true }`, AI can send just those edits instead. Failed
runs then show the program with line numbers, and the `code` input also accepts
a list of line edits:

```json
[{ "op": "replace", "lines": [4, 4], "value": "  if (todo.tags.includes('errand')) todo.priority = 5;" }]
```

AI can only patch a program whose run changed nothing, either because no call
ran or because a transaction rolled the calls back. Otherwise, it must send a
new program covering only the work that remains, and the error message tells it
so.

## Where Programs Run

| Executor | Import | Use |
|---|---|---|
| `IframeExecutor` | `@mcp-web/tools/code` | Default. A sandboxed iframe in the browser. |
| `WorkerExecutor` | `@mcp-web/tools/code/worker` | Node. A worker thread that can be stopped when a program never ends. |
| `FunctionExecutor` | `@mcp-web/tools/code` | Tests. Runs in the same process. |

```typescript
import { WorkerExecutor } from '@mcp-web/tools/code/worker';

createCodeMode({ executor: () => new WorkerExecutor() });
```

`createCodeMode()` takes a function that creates the executor, so every code
tool it creates gets its own. `new CodeTool()` takes the executor itself.

::: danger Only the Iframe Is a Sandbox
`WorkerExecutor` and `FunctionExecutor` run programs with full access to their
process, including the file system and network in Node. Only use them with
models and prompts you trust.
:::

Programs time out after 30 seconds by default. Change this with `timeout` (in
milliseconds).
