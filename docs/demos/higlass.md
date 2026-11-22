# Large Tool Schema Demo: HiGlass :dna:

The _HiGlass_ demo shows how to integrate MCP-Web with a **legacy application**
that has a large, complex view schema. We use schema decomposition and wrap
the existing state with [Jotai](https://jotai.org/) to make it AI-controllable.

<video autoplay loop muted playsinline width="1256" data-name="higlass">
  <source
    src="https://storage.googleapis.com/mcp-web/higlass-1080p.mp4"
    type="video/mp4"
  />
</video>

[HiGlass](https://higlass.io) is a genomics visualization tool with a rich
configuration schema. This demo demonstrates how MCP-Web can tame complex
schemas by decomposing them into manageable tool definitions.

**Live Version:** https://higlass.demo.mcp-web.dev

**Code:** https://github.com/flekschas/mcp-web/tree/main/demos/higlass

## Key Components

- `src/tools.ts`: Uses `@mcp-web/decompose-zod-schema` to break down the large
   HiGlass view config into focused, AI-friendly tools.

- `src/state.ts`: Wraps the HiGlass view state with Jotai atoms for reactive
   state management that MCP-Web can observe and control.

- `src/mcp/code-mode.ts`: Reads and sets the code mode switch.

## Code Mode

The **Code mode** switch in the header offers the HiGlass tools through one
[code tool](/tools/code), `higlass_code`, instead of one by one. AI then
changes the view with a short program, for example:

```javascript
const { genes } = await higlass_gene_search({ gene: 'MYC' });
const center = (genes[0].absoluteStart + genes[0].absoluteEnd) / 2;
await higlass_set_view({
  viewIndex: 0,
  initialXDomain: [center - 1e6, center + 1e6],
});
```

All tools that change something only change the view config, so the demo
wraps them in a `stateTransaction()` over the view config atom. If a program
fails, the view config is restored. If a search is still running when a
program times out, a later `higlass_code` call restores the view config once
the search finishes.

The read-only tools, `higlass_get_view_config`, `higlass_tileset_search`, and
`higlass_gene_search`, are also registered on their own, like the getter of
[state tools in code mode](/efficient-state-tools#code-mode). Picking a
tileset or gene often takes reading the results first, and that shouldn't need
a program. `higlass_screenshot` stays outside the code tool, because a program
can't return an image to AI.

Switching reloads the page, because the tools are registered once at startup.
The mode is set by `?codeMode=1` in the URL.
