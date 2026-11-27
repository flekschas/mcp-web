import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/elicitation.html');
  await page.waitForFunction(() => window.__elicit !== undefined);
});

test('a confirmation is true on Yes and false on No or Escape', async ({
  page,
}) => {
  let answer = page.evaluate(() => window.__elicit.confirm());
  await expect(
    page.getByRole('dialog', { name: 'Delete 12 todos?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Yes' }).click();
  expect(await answer).toBe(true);

  answer = page.evaluate(() => window.__elicit.confirm());
  await page.getByRole('button', { name: 'No' }).click();
  expect(await answer).toBe(false);

  answer = page.evaluate(() => window.__elicit.confirm());
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await answer).toBe(false);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a choice is the selected option, or undefined when declined', async ({
  page,
}) => {
  let answer = page.evaluate(() => window.__elicit.choose());
  // The message labels the choice.
  await page
    .getByRole('combobox', { name: 'Which language?' })
    .selectOption('German');
  await page.getByRole('button', { name: 'OK' }).click();
  expect(await answer).toBe('German');

  answer = page.evaluate(() => window.__elicit.choose());
  await page.getByRole('button', { name: 'Decline' }).click();
  expect(await answer).toBeUndefined();
});

test('a form returns its fields, with defaults filled in', async ({ page }) => {
  const answer = page.evaluate(() => window.__elicit.region());
  await page.getByLabel('chrom').selectOption('chr2');
  await expect(page.getByLabel('start')).toHaveValue('0');
  await page.getByLabel('email').fill('user@example.com');
  await page.getByLabel('peaks').check();

  // Required fields are checked before the form is accepted.
  await page.getByLabel('email').fill('');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('email').fill('user@example.com');
  await page.getByRole('button', { name: 'OK' }).click();

  expect(await answer).toEqual({
    chrom: 'chr2',
    start: 0,
    email: 'user@example.com',
    visible: false,
    tracks: ['peaks'],
  });
});

test('a multi-select keeps the dialog open until enough is selected', async ({
  page,
}) => {
  const answer = page.evaluate(() => window.__elicit.tracks());
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByLabel('genes').check();
  await page.getByRole('button', { name: 'OK' }).click();
  expect(await answer).toEqual({ tracks: ['genes'] });
});

test('fields named like form properties, optional groups and precise defaults', async ({
  page,
}) => {
  const answer = page.evaluate(() => window.__elicit.tricky());
  await expect(page.getByLabel('append')).toHaveValue('yes');
  await page.getByRole('button', { name: 'OK' }).click();
  expect(await answer).toEqual({
    append: 'yes',
    at: '2026-05-04T12:34:56.789Z',
  });
});

test('the dialog closes when nobody waits for the answer any more', async ({
  page,
}) => {
  const answer = page.evaluate(() => window.__elicit.abortable());
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => window.__elicit.abort());
  expect(await answer).toBe(false);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
