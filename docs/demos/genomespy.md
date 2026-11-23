# Spec Editor Demo: GenomeSpy :telescope:

The _GenomeSpy_ demo is a [GenomeSpy](https://genomespy.app) spec editor next to the rendered chart. You can
write the spec yourself, or have AI generate or edit it through MCP. Both work
on the same spec: when you type valid JSON, the chart re-renders, and when AI
changes the spec, the editor shows it.

**Live Version:** https://genomespy.demo.mcp-web.dev

**Code:** https://github.com/flekschas/mcp-web/tree/main/demos/genomespy

## Key Components

- `src/spec/tools.ts`: Exposes the spec as state with `addStateTools()`, plus a
  `get_render_status` tool that reports errors from the renderer.

- `src/spec/schema.ts`: The Zod schema of the spec. It describes the top level
  of the spec for AI and validates the whole spec against the official
  GenomeSpy JSON Schema.

- `src/editor/spec-editor.tsx`: A CodeMirror JSON editor bound to the same
  state. Invalid JSON shows an error and leaves the last valid spec in place.

- `src/mcp/code-mode.ts`: The **Code mode** switch. With code mode on, AI
  changes the spec with a short program instead of sending the whole spec back
  (see the [code tool](/tools/code)). The browser remembers the mode.
  Switching reloads the page and keeps the spec, and the connector URL stays
  the same.

## From JSON Schema to Zod

GenomeSpy defines its grammar as a large JSON Schema, while state tools need a
Zod schema. The demo doesn't convert one into the other. Instead, it combines
a small hand-written Zod object for the top level of the spec with a
synchronous refinement that checks the whole spec against the JSON Schema with
Ajv. AI sees a compact description of the spec, while validation covers the
full grammar, and its errors point to the exact place in the spec.

Code mode passes [error hints](/tools/code#adding-hints) for GenomeSpy: 23 schema contracts that specs often got wrong go into the tool description, and 50 are shown below a failed call whose error names their schema location. In normal mode, the 23 contracts are part of the `set_spec` description.
