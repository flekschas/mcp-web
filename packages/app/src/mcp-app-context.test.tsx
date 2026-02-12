import { describe, expect, mock, test, beforeEach } from 'bun:test';
import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';

// --- Mocks ---

// Track calls to ext-apps hooks
let mockUseAppReturn = {
  app: null as unknown,
  isConnected: false,
  error: null as Error | null,
};
let mockUseAppOptions: unknown = null;
let mockUseHostStylesCalls: unknown[][] = [];
let mockUseDocumentThemeReturn: 'light' | 'dark' = 'light';

// Mock `@modelcontextprotocol/ext-apps/react` before importing our module
mock.module('@modelcontextprotocol/ext-apps/react', () => ({
  useApp: (options: unknown) => {
    mockUseAppOptions = options;
    return mockUseAppReturn;
  },
  useHostStyles: (...args: unknown[]) => {
    mockUseHostStylesCalls.push(args);
  },
  useDocumentTheme: () => mockUseDocumentThemeReturn,
}));

// Import after mocking
const {
  MCPAppProvider,
  useMCPAppContext,
  useMCPHostContext,
  useMCPHostTheme,
} = await import('./mcp-app-context.js');

// --- Helpers ---

/** Decode HTML entities produced by renderToString. */
function decodeHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

/** Render a component inside MCPAppProvider and return the HTML string. */
function renderWithProvider(children: ReactNode): string {
  return renderToString(
    createElement(MCPAppProvider, null, children)
  );
}

/** Render with provider and extract the decoded text content. */
function renderText(component: () => ReactNode): string {
  const html = renderWithProvider(createElement(component));
  return decodeHtml(html);
}

/** Component that reads context and renders its values for assertion. */
function ContextReader() {
  const ctx = useMCPAppContext();
  return createElement(
    'div',
    { 'data-testid': 'context' },
    JSON.stringify({
      hasApp: ctx.app !== null,
      isConnected: ctx.isConnected,
      hasError: ctx.error !== null,
      hasHostContext: ctx.hostContext !== undefined,
    })
  );
}

/** Component that reads host context and renders it. */
function HostContextReader() {
  const hostContext = useMCPHostContext();
  return createElement(
    'div',
    null,
    hostContext ? JSON.stringify(hostContext) : 'undefined'
  );
}

/** Component that reads theme and renders it. */
function ThemeReader() {
  const theme = useMCPHostTheme();
  return createElement('div', null, theme);
}

// --- Tests ---

beforeEach(() => {
  mockUseAppReturn = {
    app: null,
    isConnected: false,
    error: null,
  };
  mockUseAppOptions = null;
  mockUseHostStylesCalls = [];
  mockUseDocumentThemeReturn = 'light';
});

describe('MCPAppProvider', () => {
  test('renders children', () => {
    const html = renderWithProvider(
      createElement('span', null, 'hello world')
    );
    expect(html).toContain('hello world');
  });

  test('calls useApp with correct appInfo', () => {
    renderWithProvider(createElement('div'));
    expect(mockUseAppOptions).toBeDefined();
    const options = mockUseAppOptions as {
      appInfo: { name: string; version: string };
      capabilities: Record<string, unknown>;
      onAppCreated: (app: unknown) => void;
    };
    expect(options.appInfo).toEqual({
      name: 'mcp-web-app',
      version: '0.1.0',
    });
    expect(options.capabilities).toEqual({});
    expect(typeof options.onAppCreated).toBe('function');
  });

  test('calls useHostStyles with app and initial context', () => {
    mockUseAppReturn = {
      app: { getHostContext: () => null },
      isConnected: true,
      error: null,
    };

    renderWithProvider(createElement('div'));
    expect(mockUseHostStylesCalls.length).toBeGreaterThan(0);

    const lastCall = mockUseHostStylesCalls[mockUseHostStylesCalls.length - 1];
    // First arg is app, second is initial context
    expect(lastCall[0]).toBe(mockUseAppReturn.app);
  });

  test('provides context with disconnected state initially', () => {
    mockUseAppReturn = {
      app: null,
      isConnected: false,
      error: null,
    };

    const text = renderText(ContextReader);
    const parsed = JSON.parse(text);
    expect(parsed).toEqual({
      hasApp: false,
      isConnected: false,
      hasError: false,
      hasHostContext: false,
    });
  });

  test('provides context with connected state and app', () => {
    const mockHostContext = { theme: 'dark', displayMode: 'inline' };
    mockUseAppReturn = {
      app: { getHostContext: () => mockHostContext },
      isConnected: true,
      error: null,
    };

    const text = renderText(ContextReader);
    const parsed = JSON.parse(text);
    expect(parsed).toEqual({
      hasApp: true,
      isConnected: true,
      hasError: false,
      hasHostContext: true,
    });
  });

  test('provides context with error state', () => {
    mockUseAppReturn = {
      app: null,
      isConnected: false,
      error: new Error('Connection failed'),
    };

    const text = renderText(ContextReader);
    const parsed = JSON.parse(text);
    expect(parsed).toEqual({
      hasApp: false,
      isConnected: false,
      hasError: true,
      hasHostContext: false,
    });
  });

  test('sets initial host context from app.getHostContext()', () => {
    const mockHostContext = {
      theme: 'dark',
      displayMode: 'inline',
      locale: 'en-US',
    };
    mockUseAppReturn = {
      app: { getHostContext: () => mockHostContext },
      isConnected: true,
      error: null,
    };

    const text = renderText(HostContextReader);
    const parsed = JSON.parse(text);
    expect(parsed).toEqual(mockHostContext);
  });

  test('host context is undefined when app has no context', () => {
    mockUseAppReturn = {
      app: { getHostContext: () => null },
      isConnected: true,
      error: null,
    };

    const text = renderText(HostContextReader);
    expect(text).toBe('undefined');
  });

  test('onAppCreated callback registers onhostcontextchanged handler', () => {
    renderWithProvider(createElement('div'));

    const options = mockUseAppOptions as {
      onAppCreated: (app: {
        onhostcontextchanged?: (params: unknown) => void;
      }) => void;
    };

    // Simulate what useApp does: call onAppCreated with an app instance
    const fakeApp: { onhostcontextchanged?: (params: unknown) => void } = {};
    options.onAppCreated(fakeApp);

    // The handler should be registered
    expect(typeof fakeApp.onhostcontextchanged).toBe('function');
  });
});

describe('useMCPAppContext', () => {
  test('throws when used outside MCPAppProvider', () => {
    expect(() => {
      renderToString(createElement(ContextReader));
    }).toThrow('useMCPAppContext must be used within an MCPAppProvider');
  });

  test('error message includes guidance about renderMCPApp', () => {
    try {
      renderToString(createElement(ContextReader));
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toContain('renderMCPApp');
      expect((error as Error).message).toContain('MCPAppProvider');
    }
  });
});

describe('useMCPHostContext', () => {
  test('throws when used outside MCPAppProvider', () => {
    expect(() => {
      renderToString(createElement(HostContextReader));
    }).toThrow('useMCPAppContext must be used within an MCPAppProvider');
  });

  test('returns undefined when not connected', () => {
    mockUseAppReturn = {
      app: null,
      isConnected: false,
      error: null,
    };

    const text = renderText(HostContextReader);
    expect(text).toBe('undefined');
  });

  test('returns host context when connected', () => {
    const context = {
      theme: 'light',
      displayMode: 'full',
      platform: 'darwin',
    };
    mockUseAppReturn = {
      app: { getHostContext: () => context },
      isConnected: true,
      error: null,
    };

    const text = renderText(HostContextReader);
    expect(JSON.parse(text)).toEqual(context);
  });
});

describe('useMCPHostTheme', () => {
  test('returns light theme by default', () => {
    mockUseDocumentThemeReturn = 'light';

    const text = renderText(ThemeReader);
    expect(text).toBe('light');
  });

  test('returns dark theme when host is dark', () => {
    mockUseDocumentThemeReturn = 'dark';

    const text = renderText(ThemeReader);
    expect(text).toBe('dark');
  });

  test('delegates to useDocumentTheme from ext-apps', () => {
    // The mock already tracks that useDocumentTheme is called.
    // If it weren't called, useMCPHostTheme would not return the mock value.
    mockUseDocumentThemeReturn = 'dark';

    const text = renderText(ThemeReader);
    // This confirms useMCPHostTheme delegates to our mocked useDocumentTheme
    expect(text).toBe('dark');
  });
});
