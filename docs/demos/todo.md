# Getting Started Demo: a Todo App :check:

To get familiar with MCP-Web, the _Todo App_ demo shows how we can make a todo
app fully AI controllable by exposing its state as tools using a single function
(`mcpWeb.addStateTools()`).

<video autoplay loop muted playsinline width="1256" data-name="todo">
  <source
    src="https://storage.googleapis.com/mcp-web/todo-1080p.mp4"
    type="video/mp4"
  />
</video>

In addition, this demo also shows how you can expose parts of your UI to AI
using a `<Statistics />` component that we turn into an MCP App with our
`@mcp-web/app` package.

**Live Version:** https://todo.demo.mcp-web.dev

**Code:** https://github.com/flekschas/mcp-web/tree/main/demos/todo

## Key Components

- `src/tools.ts`: This file contains everything you need to make the Todo App
   controllable by AI.

- `src/mcp-apps.ts`: This file contains everything you need to turn the
   `<Statistics />` component into an MCP App.
