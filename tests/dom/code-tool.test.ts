import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Wait for setup.ts to initialize CodeTool and expose __test
  await page.waitForFunction(() => window.__test !== undefined);
});

test('executes code that calls a tool and returns result', async ({ page }) => {
  const result = await page.evaluate(async () => {
    return window.__test.execute(`
      const result = await double({ n: 21 });
      result
    `);
  });

  expect(result.error).toBeUndefined();
  expect(result.result).toBe(42);
});

test('returns validation error for invalid JavaScript', async ({ page }) => {
  const result = await page.evaluate(async () => {
    return window.__test.execute('const x = {');
  });

  expect(result.error).toBeDefined();
  expect(result.error).toContain('Validation error');
});

test('propagates tool handler errors', async ({ page }) => {
  const result = await page.evaluate(async () => {
    return window.__test.execute(`
      await fail({ message: 'something broke' })
    `);
  });

  expect(result.error).toBeDefined();
  expect(result.error).toContain('something broke');
});

test('times out on long-running execution', async ({ page }) => {
  const result = await page.evaluate(async () => {
    return window.__test.executeTimeout(`
      await slow()
    `);
  });

  expect(result.error).toBeDefined();
  expect(result.error).toContain('timed out');
});
