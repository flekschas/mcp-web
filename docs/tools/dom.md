# DOM Query Tool

The DOM query tool lets AI inspect your page's markup. AI passes a CSS
selector, and the tool returns every matching element with its tag name, ID,
class, text content, and attributes.

## Using the DOM Query Tool

```typescript
import { DOMQueryTool } from '@mcp-web/tools/dom';

mcp.addTool(new DOMQueryTool());
```

The tool is named `dom-query`. Without a selector, it returns the `body`
element.

::: tip Prefer State Tools
The DOM shows what your app renders, not what it means. When AI needs to read
or change your app's data, expose it with [state tools](/efficient-state-tools)
instead. The DOM query tool is most useful for questions about the page itself,
such as which elements are visible.
:::

Every match includes its full text content, so a broad selector on a large page
can return a lot of text. Point AI to specific selectors in your tool or app
description.
