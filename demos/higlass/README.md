# HiGlass Demo

Demonstrates how to make an existing web app AI-controllable by exposing its view state as MCP tools.

## Running the Demo

1. Install dependencies: `pnpm install`
2. Start the bridge: `pnpm bridge`
3. Start the frontend: `pnpm dev`
4. Add the MCP config to Claude Desktop (shown in the app's help modal)

## Code Mode

The **Code mode** switch in the header chooses how the tools are offered to AI.
Switching reloads the page.

- **Off** (default): every tool is registered on its own, e.g.,
  `higlass_add_track` or `higlass_set_view`.
- **On**: the tools are offered as functions of one code tool, `higlass_code`,
  that runs a JavaScript program calling them. If a program fails, the view
  config is restored to what it was before the program ran. If a search is
  still running when a program times out, a later `higlass_code` call restores
  the view config once the search finishes.

In both modes, `higlass_get_view_config`, `higlass_tileset_search`,
`higlass_gene_search`, and `higlass_screenshot` are also registered on their
own, so AI can look things up or take a screenshot without writing a program.

The browser remembers the mode in localStorage. After the reload, a dialog
reminds you to refresh the tool list or start a new conversation if your agent
still shows the old tools.

See [Recording Demo Videos](../README.md#recording-demo-videos) for what a
connected AI app sees after switching.
