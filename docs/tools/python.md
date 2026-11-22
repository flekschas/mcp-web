# Python Tool

The Python tool lets AI analyze your app's data with Python. It runs scripts in
the browser with [Pyodide](https://pyodide.org), in a Web Worker so the page
stays responsive.

::: warning Experimental
The Python tool is experimental. Its options and behavior may change, and it
has known rough edges, such as scripts failing while Pyodide is still loading.
:::

## Using the Python Tool

Pass a function that returns the data scripts can use, keyed by the variable
name each value gets in Python:

```typescript
import { PythonTool } from '@mcp-web/tools/python';

const pythonTool = new PythonTool(
  () => ({ todos: store.app.todos }),
  {
    name: 'analyze_todos',
    description: 'Analyze the todos with Python',
  },
);

mcp.addTool(pythonTool);
```

The function is called for every script, so scripts always see the current
data. The tool returns the value of the script's last expression as a string.

Packages a script imports, such as `pandas`, are loaded automatically.

When you no longer need the tool, stop its worker:

```typescript
mcp.removeTool('analyze_todos');
pythonTool.destroy();
```

## Things to Know

- **Scripts time out after 30 seconds.**
- **Pyodide loads from a CDN.** The worker downloads Pyodide from jsDelivr when
  the tool is created, and your page's content security policy has to allow
  it. A script that arrives before Pyodide has loaded fails with "Pyodide not
  initialized", and AI has to try again.
- **Scripts can't change your app.** They only see a copy of the data you pass
  in. To let AI change state with a program, use the [code tool](/tools/code).
