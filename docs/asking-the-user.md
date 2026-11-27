# Asking the User

A tool handler can ask the user a question in the middle of a call and wait for
the answer, for example "Delete these 12 todos?" or "Which dataset did you
mean?". MCP calls this _elicitation_. Since MCP-Web tools run in the browser,
the web app asks the question itself, in the page. The AI app doesn't show the
question, even if it supports MCP elicitation, so the user has to switch to
the page to answer.

Handlers get `elicit` as part of their second argument:

```typescript
import { MCPWeb } from '@mcp-web/core';
import { z } from 'zod';

const mcp = new MCPWeb({ name: 'My App', description: 'A greeting app' });

mcp.addTool({
  name: 'get_greeting',
  description: 'Greet the user in their language',
  outputSchema: z.object({ greeting: z.string() }),
  handler: async (_input, { elicit }) => {
    const language = await elicit('Which language?', ['English', 'German']);
    return { greeting: language === 'German' ? 'Hallo!' : 'Hello!' };
  },
});
```

Handlers can leave out the second argument. It also has a `signal` that
aborts once nobody waits for the result any more, for example because the call
timed out. Check it before changing anything after a long wait.

## Three Kinds of Questions

```typescript
// Yes or no: true for yes, false when the user says no or cancels.
const ok = await elicit('Delete 12 todos?');

// One of several choices: 'English' | 'German' | undefined
const language = await elicit('Which language?', ['English', 'German']);

// A form: the parsed fields, or undefined
const region = await elicit('Which region?', z.object({
  chrom: z.enum(['chr1', 'chr2']),
  start: z.number().default(0),
  tracks: z.array(z.enum(['genes', 'peaks'])), // multi-select
}));
```

When the user declines or cancels a choice or a form, `elicit` returns
`undefined`. Form answers are parsed with the schema, so defaults are filled in.

### What a Form Can Ask For

MCP elicitation only allows flat forms. Each field must be a string (including
string formats such as `z.email()`), number, boolean, enum of strings, or array
of such enums, optionally wrapped in `.optional()` or `.default()`. TypeScript
rejects other schemas, such as nested objects or arrays of strings, and
`elicit` throws a clear error for them at runtime.

A field can only have the rules MCP elicitation can show to the user: a
minimum and maximum length for strings, a minimum and maximum for numbers, and
a minimum and maximum number of selected options for multi-selects. `elicit`
throws for other rules, such as `z.number().positive()`, `.regex()` or
`z.iso.datetime({ precision: 0 })`, since the user couldn't see them and their
answer would fail the tool call. Check those in the handler instead.
Refinements with `.refine()` can't be detected, so an answer that fails one
fails the tool call. Of a field's metadata, only `title` and `description`
reach the user, and `elicit` throws for other `.meta()` keys.

## Showing the Question

Without any setup, the page asks in a plain native `<dialog>`. To use your own
UI, set a handler with `onElicit()`. It gets the question in the shape of MCP's
`elicitation/create` request and returns the answer in the shape of its result:

```typescript
const removeHandler = mcp.onElicit(async ({ message, requestedSchema }) => {
  // A yes-or-no question has no fields in `requestedSchema.properties`. A
  // choice has one required enum field named `choice`.
  const answer = await showMyModal(message, requestedSchema);
  if (!answer) return { action: 'cancel' };
  return { action: 'accept', content: answer };
});
```

Return `{ action: 'decline' }` when the user says no. When several handlers are
set, the latest one answers.

The handler's second argument has a `signal` that aborts if nobody waits for
the answer any more while the question is open, for example because the tool
call timed out. Hide the question then.

In React, `useElicitation()` from `@mcp-web/react` gives you the question that
is waiting and a way to answer it. Questions still open when the component
unmounts are cancelled, and a question goes away by itself when nobody waits
for its answer any more.

```tsx
import { useElicitation } from '@mcp-web/react';

function Question() {
  const { request, respond } = useElicitation();
  if (!request) return null;
  return (
    <dialog open>
      <p>{request.message}</p>
      <button onClick={() => respond({ action: 'accept', content: {} })}>
        Yes
      </button>
      <button onClick={() => respond({ action: 'decline' })}>No</button>
    </dialog>
  );
}
```

## Asking Before State Changes

[State tools](./designing-state-tools) are generated, so there's no handler to
call `elicit` in. Instead, `onBeforeChange` runs before a generated tool stores
a change. It gets the state before (`prev`) and after (`next`) the change, and
`elicit` to ask the user:

```typescript
const projectTools = createStateTools({
  name: 'projects',
  description: 'Projects for grouping related todos',
  get: () => store.get(projectsAtom),
  set: (value) => store.set(projectsAtom, value),
  schema: ProjectsSchema,
  expand: true,
  onBeforeChange: async ({ prev, next }, { elicit }) => {
    const removed = Object.keys(prev).filter((id) => !(id in next));
    if (removed.length === 0) return;
    const titles = removed.map((id) => prev[id].title).join(', ');
    if (!(await elicit(`Delete ${titles}?`))) {
      throw new Error('The user chose not to delete.');
    }
  },
});
```

- Return nothing to store `next`.
- Return another state to store that instead. It must match the schema, and
  the AI is told that a different value was stored.
- Throw to reject the change. The error message is what the AI sees.

If the state changes while the user answers, for example because the user
edits it in your UI, `elicit` throws once the user answers and the change is
rejected, so it can't undo the other change. The AI is told to get the state
again and retry. So code after `await elicit(…)` only runs if the state is
still as it was when the question was asked. The state can still change after
that, before the change is stored, which rejects the change too. So don't
change other state in the hook, because it would stay changed. Have the hook
decide what to change, and change it in `set` right after storing the state,
as the demo does with the todos of a deleted project. Check that the other
state is still as you expect, since it may have changed while the user
answered.

A change whose tool call is cancelled before it is stored, for example because
the bridge timed out the call while it waited for another question, is not
stored, so a retry can't store it twice.

Changes to the same state wait for each other: a second tool call that changes
the projects starts once the first one is stored or rejected, so it asks about
the state as it is then. Reading the state doesn't wait.

`get` must return a value that `structuredClone` can copy, and the state must
consist of JSON-compatible values and dates, so changes can be compared.

`onBeforeChange` only runs for changes made by the tools, not for changes made
elsewhere in your app. The [todo demo](./demos/todo) uses it to ask before
deleting a project, and whether to delete its todos or move them to the inbox.

## Timeouts

The bridge stops a tool call after 30 seconds, but the time the user spends
answering doesn't count. The user has 5 minutes in total to answer a call's
questions. When the bridge stops waiting, the AI app cancels the call, or the
page loses its connection to the bridge, the question closes and `elicit`
throws, so a late answer can't change anything. The local
`@mcp-web/client` waits up to 6 minutes for a tool call, unless its `timeout`
option or `TIMEOUT` sets another limit.

The AI app has its own time limit for a tool call, which MCP-Web can't change.
Claude Desktop reportedly stops waiting after about 60 seconds. If the AI app
stops waiting without cancelling the call, MCP-Web doesn't learn about it: if
the user answers later, the tool still runs, but the AI doesn't get the result.
So keep questions quick to answer.

## Limits

- Tools called from a [code tool](./tools/code) program can't ask the user,
  since programs run with a time limit. `elicit` throws there, including in
  `onBeforeChange`.
- The question is always answered in the web page. The `elicitation` option
  of `MCPWeb` sets where questions are answered, and `'page'` is its only
  value.
