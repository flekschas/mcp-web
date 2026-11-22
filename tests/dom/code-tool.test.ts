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

test('propagates tool handler errors with function name and args', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    return window.__test.execute(`
      await fail({ message: 'something broke' })
    `);
  });

  expect(result.error).toBeDefined();
  // Error should include function name, args, and original message
  expect(result.error).toContain('fail(');
  expect(result.error).toContain('something broke');
  expect(result.error).toContain('failed:');
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

test('calls a function only once its signature is looked up', async ({
  page,
}) => {
  const before = await page.evaluate(async () => {
    return window.__test.executeLookup('await double({ n: 21 })');
  });

  expect(before.error).toContain('double has not been looked up');

  const after = await page.evaluate(async () => {
    window.__test.lookUp(['double']);
    return window.__test.executeLookup('await double({ n: 21 })');
  });

  expect(after.error).toBeUndefined();
  expect(after.result).toBe(42);
});

test('fails on an error without a message', async ({ page }) => {
  const fromProgram = await page.evaluate(async () => {
    return window.__test.execute('throw new Error()');
  });
  const fromHandler = await page.evaluate(async () => {
    return window.__test.execute('await silent_fail()');
  });

  expect(fromProgram.error).toMatch(/^Error/);
  expect(fromHandler.error).toBeDefined();
  expect(fromHandler.result).toBeUndefined();
});
