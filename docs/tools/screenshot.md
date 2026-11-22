# Screenshot Tool

The screenshot tool lets AI see your app. It captures the page, or an element
of it, as an image. The tool returns the image as a data URL, and the bridge
turns it into an MCP image, so AI sees the screenshot rather than text.

## Using the Screenshot Tool

```typescript
import { ScreenshotTool } from '@mcp-web/tools/screenshot';

mcp.addTool(new ScreenshotTool({
  name: 'screenshot',
  description: 'Take a screenshot of the app or one of its elements',
}));
```

AI can pass a CSS selector as `elementSelector` to capture one element. Without
one, or when no element matches, the tool captures the whole page.

## Options

| Option | Default | Description |
|---|---|---|
| `name` | `'screenshot'` | The tool name. |
| `description` | `'Take a screenshot of the web page'` | The tool description. |
| `format` | `'png'` | `'png'`, `'jpeg'`, or `'webp'`. |

The tool renders the page with
[html-to-image](https://github.com/bubkoo/html-to-image), and also accepts its
options, such as `quality`, `pixelRatio`, or `backgroundColor`.
