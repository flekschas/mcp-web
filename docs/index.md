---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "MCP-Web"
  text: "Expose frontend state as MCP tools"
  tagline: "Integrate AI through structured function calls"
  actions:
    - theme: brand
      text: Get Started
      link: /get-started
    - theme: alt
      text: API Reference
      link: /api-reference

features:
  - title: AI Control of Your Frontend
    details: Directly expose UI state and actions as MCP tools without backend changes — AI agents can read and manipulate your app through type-safe schemas.
    icon:
      dark: https://storage.googleapis.com/jupyter-scatter/dev/images/icon-feature-interactive-dark.svg
      light: https://storage.googleapis.com/jupyter-scatter/dev/images/icon-feature-interactive-light.svg

  - title: Frontend-Triggered AI Queries
    details: Your app can query AI agents using the same tools it exposes, enabling bidirectional integration from a single interface.
    icon:
      dark: https://storage.googleapis.com/jupyter-scatter/dev/images/icon-feature-interactive-dark.svg
      light: https://storage.googleapis.com/jupyter-scatter/dev/images/icon-feature-interactive-light.svg

  - title: Human-AI Parity
    details: Both humans and AI interact through the same state interface, preserving user agency while enabling automation.
    icon:
      dark: https://storage.googleapis.com/jupyter-scatter/dev/images/icon-feature-interactive-dark.svg
      light: https://storage.googleapis.com/jupyter-scatter/dev/images/icon-feature-interactive-light.svg

  - title: Auto-Generate Efficient Tools
    details: Generate targeted CRUD tools from Zod schemas — token-efficient operations for arrays, records, and complex state.

  - title: Multiple Browser Sessions
    details: Let AI interact with multiple browser sessions independently.

  - title: Framework Agnostic
    details: Works with React, Vue, Svelte, vanilla JS — any framework that runs in a browser.
---
