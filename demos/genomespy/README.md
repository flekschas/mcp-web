# GenomeSpy Demo

A [GenomeSpy](https://genomespy.app) spec editor next to the rendered chart.
Write the spec yourself, or let an AI agent generate and edit it through MCP.
You and the agent work on the same spec:

- Valid JSON you type in the editor re-renders the chart.
- Invalid JSON shows an error and leaves the last valid spec and chart in place.
- When the agent changes the spec, the editor shows the new spec.

## Running the Demo

1. In the repository root, install and build: `pnpm install && pnpm build:packages`
2. Start the app and the bridge: `pnpm --filter @mcp-web/demos/genomespy dev`
3. Open http://localhost:3040 (the bridge listens on port 3041)
4. Add the MCP config shown in the app's help panel to your AI agent

Examples use small inline datasets on hg38 chr1:1,000,000–1,100,000.

## Example Prompts

- "Make the points larger and add a rule at score 5"
- "Show the variants as ticks on a separate track below the points"
- "Use a colorblind-safe palette and show a legend for the consequences"
- "Zoom to chr1:1,030,000-1,070,000"

## Tools

The spec is app state, exposed with `addStateTools` (`src/spec/tools.ts`):

| Mode      | Tools                                        |
| --------- | -------------------------------------------- |
| Normal    | `get_spec`, `set_spec`, `get_render_status`  |
| Code mode | `get_spec`, `code_spec`, `get_render_status` |

`get_render_status` reports whether the current spec rendered, and the error
from the renderer if it didn't. Schema validation can't catch every mistake.

### Code Mode

The **Code mode** switch in the header turns code mode on or off. In code
mode, the agent gets one `code_spec` tool instead of `set_spec`: it changes
the spec with a JavaScript program that calls `get_spec` and `set_spec`, so it
only writes the change instead of sending the whole spec back.

The browser remembers the mode in localStorage. Switching reloads the page,
since tools are registered once at startup. The spec and the editor's text, including an
unfinished edit, are kept across the reload, and the connector URL, including
its token, stays the same. Remote MCP clients get the new tool list
automatically. With the stdio client, the list refreshes if `@mcp-web/client`
forwards tool list changes. After the reload, a dialog reminds you to refresh
the tool list or start a new conversation if your agent still shows the old
tools.

## How the Spec Schema Works

State tools need a Zod schema, but GenomeSpy 0.88.1 ships its grammar as a large JSON
Schema (`@genome-spy/core/schema.json`). The demo combines two parts (`src/spec/schema.ts`):

- **A small hand-written Zod object** for the top level of the spec. Each
  property is `unknown`, with a short description of its shape. This is what the
  agent sees in the tool schema, so it stays small.
- **A synchronous refinement** that validates the whole spec against the
  official JSON Schema with Ajv (`src/spec/json-schema-check.ts`). Its problems
  become Zod issues, with the spec path and the JSON Schema locations they come
  from.

So validation covers the full grammar, but the types the agent sees cover only
the top level. Nested shapes are described in prose, not typed. Zod's `z.fromJSONSchema()` doesn't
help here: it fails on the schema's percent-encoded `$ref`s.

The editor shows the same schema problems as warnings, but a spec you type
only has to be valid JSON: the chart renders whatever the renderer accepts.
`get_spec` returns such a spec too, so the agent can fix it; only writes must
pass the schema.

### Hints

Code mode passes error hints learned from GenomeSpy specs that models got wrong (`src/spec/learned-hints.ts`): 23 schema contracts that models often got wrong go into the tool description, and 50 are shown below a failed call whose error names their schema location. `@genome-spy/core` is pinned to 0.88.1, the version the hints were learned on. In normal mode, the 23 contracts are part of the `set_spec` description instead.
