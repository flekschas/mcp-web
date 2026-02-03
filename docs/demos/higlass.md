# Large Tool Schema Demo: HiGlass :dna:

The _HiGlass_ demo shows how to integrate MCP-Web with a **legacy application**
that has a large, complex view schema. We use schema decomposition and wrap
the existing state with [Jotai](https://jotai.org/) to make it AI-controllable.

<video autoplay loop muted playsinline width="1256" data-name="higlass">
  <source
    src="https://storage.googleapis.com/mcp-web/higlass-light.mp4"
    type="video/mp4"
  />
</video>

[HiGlass](https://higlass.io) is a genomics visualization tool with a rich
configuration schema. This demo demonstrates how MCP-Web can tame complex
schemas by decomposing them into manageable tool definitions.

**Live Version:** https://higlass.demos.mcp-web.dev

**Code:** https://github.com/flekschas/mcp-web/tree/main/demos/higlass

## Key Components

- `src/tools.ts`: Uses `@mcp-web/decompose-zod-schema` to break down the large
   HiGlass view config into focused, AI-friendly tools.

- `src/state.ts`: Wraps the HiGlass view state with Jotai atoms for reactive
   state management that MCP-Web can observe and control.

<script setup>
  import { videoColorModeSrcSwitcher } from './utils';
  videoColorModeSrcSwitcher();
</script>
