import { expect, test } from '@playwright/test';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Only Chromium is launched with WebMCP enabled',
);

test.beforeEach(async ({ page }) => {
  await page.goto('/webmcp.html');
  await page.waitForFunction(() => window.__webmcp !== undefined);
});

test('lists the tools with their annotations', async ({ page }) => {
  const tools = await page.webmcp.tools();

  expect(tools.map((tool) => tool.name).sort()).toEqual([
    'fail',
    'get_todos',
    'set_todos',
  ]);
  const getter = tools.find((tool) => tool.name === 'get_todos');
  expect(getter?.annotations?.readOnly).toBe(true);
});

test('calls tools that change and read the page state', async ({ page }) => {
  await page.webmcp.callTool('set_todos', { value: ['Buy milk'] });
  const result = await page.webmcp.callTool('get_todos');

  expect(result).toEqual({
    content: [{ type: 'text', text: JSON.stringify(['Buy milk'], null, 2) }],
  });
});

test('returns failures as error results', async ({ page }) => {
  const result = (await page.webmcp.callTool('fail')) as {
    content: { text: string }[];
    isError?: boolean;
  };

  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('Something broke');
});

test('removing a tool unregisters it', async ({ page }) => {
  await page.evaluate(() => window.__webmcp.removeTool('fail'));
  const tools = await page.webmcp.tools();

  expect(tools.map((tool) => tool.name)).not.toContain('fail');
});
