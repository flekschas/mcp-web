---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "MCP-Web"
  text: "Expose frontend state, actions, and UIs as tools"
  tagline: "Integrate AI through structured function calls"
  actions:
    - theme: brand
      text: Get Started
      link: /get-started
    - theme: alt
      text: API Reference
      link: /api-reference

features:
  - title: AI Controllable Frontend Apps
    details: Expose state, actions, and UIs as MCP tools and apps without backend changes to enable AI agents to control your app.
    icon:
      light: https://storage.googleapis.com/mcp-web/ai-to-frontend-light.svg
      dark: https://storage.googleapis.com/mcp-web/ai-to-frontend-dark.svg

  - title: Frontend-Triggered AI Queries
    details: Query AI agents from your frontend using the same tools it exposes, enabling bidirectional integration from a single interface.
    icon:
      light: https://storage.googleapis.com/mcp-web/frontend-to-ai-light.svg
      dark: https://storage.googleapis.com/mcp-web/frontend-to-ai-dark.svg

  - title: Human-AI Parity
    details: Ensure both humans and AI interact through the same state interface to preserve user agency while enabling automation.
    icon:
      light: https://storage.googleapis.com/mcp-web/human-ai-parity-light.svg
      dark: https://storage.googleapis.com/mcp-web/human-ai-parity-dark.svg

  - title: Auto-Generate Efficient Tools
    details: Generate targeted CRUD tools from Zod schemas for token-efficient operations.

  - title: Multiple Browser Sessions
    details: Let AI interact with multiple browser sessions of your frontend app independently.

  - title: Framework Agnostic
    details: Works with React, Vue, Svelte, or any other frontend framework that runs in the browser.
---
