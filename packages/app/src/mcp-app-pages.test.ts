import { expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { findMCPAppPages } from './mcp-app-pages';

function createProject(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-app-pages-'));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  }
  return root;
}

test('finds the pages that mcpApp opens', () => {
  const root = createProject({
    'index.html': '',
    'admin.html': '',
    'mcp-web.config.ts': "export default { name: 'Todo', mcpApp: true };",
    'src/admin.ts':
      "new MCPWeb({ name: 'Admin', mcpApp: { page: './admin.html' } });",
    'src/other.ts': "new MCPWeb({ name: 'Other', mcpApp: false });",
    'node_modules/lib/index.js': "({ mcpApp: { page: 'lib.html' } })",
  });
  try {
    expect(findMCPAppPages(root).sort()).toEqual(['admin.html', 'index.html']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('skips pages that do not exist or are not written as a string', () => {
  const root = createProject({
    'src/a.ts': "new MCPWeb({ mcpApp: { page: 'missing.html' } });",
    'src/b.ts': 'new MCPWeb({ mcpApp: { page: PAGE } });',
  });
  try {
    expect(findMCPAppPages(root)).toEqual([]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('ignores comments, tests and fixtures', () => {
  const root = createProject({
    'index.html': '',
    'admin.html': '',
    'src/config.ts': `// To open the app in chat, set mcpApp: true.
/* Or open another page: mcpApp: { page: 'admin.html' } */
export default { mcpApp: false };`,
    'src/config.test.ts': "({ mcpApp: { page: 'admin.html' } })",
    'src/__fixtures__/config.ts': '({ mcpApp: true })',
  });
  try {
    expect(findMCPAppPages(root)).toEqual([]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('warns when no page is found because mcpApp is not written inline', () => {
  const root = createProject({
    'index.html': '',
    'src/config.ts': 'export default { mcpApp: enabled };',
  });
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (message: string) => warnings.push(message);
  try {
    expect(findMCPAppPages(root)).toEqual([]);
    expect(warnings).toEqual([
      expect.stringContaining('No page is built for `mcpApp` in src/config.ts'),
    ]);
  } finally {
    console.warn = warn;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('skips pages that are not HTML files in the project', () => {
  const root = createProject({
    'project/package.json': '{}',
    'project/src/a.ts': "({ mcpApp: { page: '../outside.html' } })",
    'project/src/b.ts': "({ mcpApp: { page: 'package.json' } })",
    'outside.html': '',
  });
  try {
    expect(findMCPAppPages(path.join(root, 'project'))).toEqual([]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('reads page after other properties, and skips strings', () => {
  const root = createProject({
    'index.html': '',
    'admin.html': '',
    'src/config.ts': `export default {
  mcpApp: {
    csp: { connectDomains: ['https://api.example.com'] },
    page: 'admin.html',
  },
};
throw new Error('Set mcpApp: true to open the app in chat');`,
  });
  try {
    expect(findMCPAppPages(root)).toEqual(['admin.html']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('warns when an earlier quote hides mcpApp', () => {
  const root = createProject({
    'index.html': '',
    'src/app.tsx': `export const Note = () => <p>Don't close this tab.</p>;
export const mcp = new MCPWeb({ mcpApp: true });`,
  });
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (message: string) => warnings.push(message);
  try {
    expect(findMCPAppPages(root)).toEqual([]);
    expect(warnings).toEqual([
      expect.stringContaining('Could not read `mcpApp` in src/app.tsx'),
    ]);
  } finally {
    console.warn = warn;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
