# Gosling Demo

A [Gosling](https://gosling-lang.org) spec editor next to the rendered chart.
Write the spec yourself, or let an AI agent generate and edit it through MCP.
You and the agent work on the same spec:

- Valid JSON you type in the editor re-renders the chart.
- Invalid JSON shows an error and leaves the last valid spec and chart in place.
- When the agent changes the spec, the editor shows the new spec.

## Running the Demo

1. In the repository root, install and build: `pnpm install && pnpm build:packages`
2. Start the app and the bridge: `pnpm --filter @mcp-web/demos/gosling dev`
3. Open http://localhost:3030 (the bridge listens on port 3031)
4. Add the MCP config shown in the app's help panel to your AI agent

Examples use small inline datasets on hg38 chr1:1,000,000–1,100,000.

## Example Prompts

- "Add a second track below that shows the same intervals as a bar chart"
- "Color the intervals by category with a colorblind-safe palette and show a legend"
- "Turn this into a circular layout"
- "Zoom the view to chr1:1,020,000-1,080,000"

## Tools

The spec is app state, exposed with `addStateTools` (`src/spec/tools.ts`):

| Mode      | Tools                                        |
| --------- | -------------------------------------------- |
| Normal    | `get_spec`, `set_spec`, `get_render_status`  |
| Code mode | `get_spec`, `code_spec`, `get_render_status` |

`get_render_status` reports whether the current spec rendered, and the error
from the renderer if it didn't. Schema validation can't catch every mistake.
For Gosling, `rendered` means it compiled the spec into a view: drawing the
view and loading its data happen after that, and their errors are not
reported.

### Code Mode

The **Code mode** switch in the header turns code mode on or off. In code
mode, the agent gets one `code_spec` tool instead of `set_spec`: it changes
the spec with a JavaScript program that calls `get_spec` and `set_spec`, so it
only writes the change instead of sending the whole spec back.

The mode is set by the URL: `?codeMode=1` opens code mode, and the switch adds
or removes the parameter. Switching reloads the page, since tools are
registered once at startup. The spec and the editor's text, including an
unfinished edit, are kept across the reload, and the connector URL, including
its token, stays the same. Remote MCP clients get the new tool list
automatically. With the stdio client, the list refreshes if `@mcp-web/client`
forwards tool list changes; otherwise, start a new conversation or reconnect.

## How the Spec Schema Works

State tools need a Zod schema, but Gosling 1.0.7 ships its grammar as a large JSON
Schema (`GoslingSchema`, exported by `gosling.js`). The demo combines two parts (`src/spec/schema.ts`):

- **A small hand-written Zod object** for the top level of the spec. Each
  property is `unknown`, with a short description of its shape. This is what the
  agent sees in the tool schema, so it stays small.
- **A synchronous refinement** that validates the whole spec against the
  official JSON Schema with Ajv (`src/spec/json-schema-check.ts`). Its problems
  become Zod issues, with the spec path and the JSON Schema locations they come
  from.

So validation covers the full grammar, but the types the agent sees cover only
the top level. Nested shapes are described in prose, not typed. Zod's `z.fromJSONSchema()` doesn't
help here. It imports the schema, but the result converts back to about 9 MB
of JSON Schema, far too much to describe to an agent, and reports every error
at the root of the spec.

The editor shows the same schema problems as warnings, but a spec you type
only has to be valid JSON: the chart renders whatever the renderer accepts.
`get_spec` returns such a spec too, so the agent can fix it; only writes must
pass the schema.

### Hints

No error hints: learned hints lowered the quality of the Gosling specs models wrote. `gosling.js` is pinned to 1.0.7, its latest stable release, which the tool description names.
