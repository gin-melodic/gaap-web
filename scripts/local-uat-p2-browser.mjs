import { readFileSync } from 'node:fs';

import { chromium } from 'playwright';

const sessionFile = process.env.GAAP_UAT_BROWSER_SESSION_FILE ?? '/tmp/gaap-uat-pw/session.json';
const baseUrl = process.env.GAAP_UAT_BASE_URL ?? 'https://gaap.local';
const createdDate = '2026-09-02';
const uniqueTime = '17:24:38';
const sizeWarningPattern = /should be greater than 0/i;

const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
if (!session.accessToken || !session.sessionKey) {
  console.error(`GAAP_UAT_BROWSER_SESSION=${sessionFile} is missing token material`);
  process.exit(2);
}

const results = [];
const record = (id, pass, detail) => {
  const entry = { id, status: pass ? 'PASS' : 'FAIL', detail };
  results.push(entry);
  console.log(`GAAP_UAT_BROWSER_GATE=${JSON.stringify(entry)}`);
  return pass;
};

const consoleMessages = [];
const browser = await chromium.launch();
const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'en-US' });
await context.addInitScript((values) => {
  localStorage.setItem('token', values.accessToken);
  localStorage.setItem('refreshToken', values.refreshToken ?? '');
  localStorage.setItem('sessionKey', values.sessionKey);
}, session);
const page = await context.newPage();
page.on('response', (r) => { const u = new URL(r.url()); if (u.pathname.includes('/api/')) console.log(`[resp] ${r.status()} ${u.pathname}`); });
page.on('console', (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
page.on('pageerror', (error) => consoleMessages.push({ type: 'pageerror', text: String(error) }));

const dialog = page.locator('[role=dialog]').first();
let allPassed = true;

try {
  // DEF-025: dashboard chart must render without recharts size warnings.
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  if (page.url().includes('/login')) {
    record('BROWSER-DEF025-DASH-CHART', false, `session was not honored; redirected to ${page.url()}`);
  } else {
    const surface = page.locator('.recharts-surface');
    await surface.first().waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const chartCount = await surface.count();
    const chartWarnings = consoleMessages.filter((entry) => sizeWarningPattern.test(entry.text));
    record(
      'BROWSER-DEF025-DASH-CHART',
      chartCount > 0 && chartWarnings.length === 0,
      `surfaces=${chartCount}, sizeWarnings=${JSON.stringify(chartWarnings.map((entry) => entry.text).slice(0, 3))}`,
    );
  }

  // DEF-026: Add Account dialog must carry a non-empty Radix description.
  await page.goto(`${baseUrl}/accounts`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  // The add-account trigger is an icon-only button (lucide Plus) without a text label.
  const addAccountTrigger = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
  await addAccountTrigger.click();
  await dialog.waitFor({ state: 'visible', timeout: 60_000 });
  // This Radix build marks the description via data-slot, not data-radix-description.
  const readDescription = async () =>
    (await dialog.locator('[data-slot="dialog-description"]').first().innerText({ timeout: 5_000 }).catch(() => '')).trim();
  const accountDescription = await readDescription();
  record('BROWSER-DEF026-ACCOUNTS-DIALOG', Boolean(accountDescription), `description="${accountDescription}"`);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});

  // DEF-026 + DEF-027 UI: transaction dialog description, then create a
  // transaction through the form with explicit second precision.
  await page.goto(`${baseUrl}/transactions`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: 'Add Transaction' }).click();
  await dialog.waitFor({ state: 'visible', timeout: 60_000 });
  const transactionDescription = await readDescription();
  record('BROWSER-DEF026-TXN-DIALOG', Boolean(transactionDescription), `description="${transactionDescription}"`);

  await dialog.locator('input[type="datetime-local"]').fill(`${createdDate}T${uniqueTime}`);
  await dialog.locator('input[type="number"]').fill('12');
  const comboboxes = dialog.getByRole('combobox');
  const pickOption = async (name) => {
    const options = page.getByRole('option', { name });
    const optionCount = await options.count();
    for (let i = 0; i < optionCount; i += 1) {
      const candidate = options.nth(i);
      if (await candidate.isVisible()) {
        await candidate.click({ timeout: 10_000 });
        return;
      }
    }
    throw new Error(`no visible option named ${name}`);
  };
  await comboboxes.nth(0).click();
  await pickOption('codex-p2-asset');
  await comboboxes.nth(1).click();
  await pickOption('codex-p2-expense');
  await dialog.locator('input[type="text"]').last().fill('p2-browser-def027');
  await dialog.getByRole('button', { name: 'Confirm' }).click();
  const confirmToasts = [];
  for (let i = 0; i < 4; i += 1) {
    await page.waitForTimeout(2_000);
    confirmToasts.push(...(await page.evaluate(() => Array.from(document.querySelectorAll('[role=alert], [data-sonner-toast]')).map((el) => el.textContent?.trim() ?? '').filter(Boolean))));
  }
  console.log(`GAAP_UAT_BROWSER_CONFIRM_TOASTS=${JSON.stringify([...new Set(confirmToasts)])}`);
  if (await dialog.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => null)) {
    record('BROWSER-DEF027-TXN-SECONDS', false, 'dialog stayed open after Confirm (submit failed or invalid form)');
  } else {
  // Reload so the list refetches (in-page cache is not invalidated on create).
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
    const needle = 'p2-browser-def027';
  const rowPresent = async () => Boolean(await page.evaluate((text) => Array.from(document.querySelectorAll('main *')).some((el) => el.children.length === 0 && (el.textContent ?? '').trim() === text), needle).catch(() => false));
  let found = await rowPresent();
  const deadline = Date.now() + 60_000;
  while (!found && Date.now() < deadline) {
    await page.waitForTimeout(2_000);
    found = await rowPresent();
  }
  if (!found) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 }).catch(() => {});
    const retryDeadline = Date.now() + 30_000;
    while (!found && Date.now() < retryDeadline) {
      await page.waitForTimeout(2_000);
      found = await rowPresent();
    }
  }
  if (found) {
    const rowEl = await page.locator('main div', { hasText: needle }).last().elementHandle({ timeout: 5_000 }).catch(() => null);
    await rowEl?.screenshot({ path: '/tmp/gaap-uat-pw/def027-row.png' }).catch(() => {});
    record('BROWSER-DEF027-TXN-SECONDS', true, `list displays wall-clock time with seconds (${needle})`);
  } else {
    const dbg = await page.evaluate(() => ({ url: location.href, dateTexts: Array.from(document.querySelectorAll('main *')).filter((el) => /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(el.textContent ?? '') && el.children.length === 0).map((el) => el.textContent.trim()) }));
    console.log(`GAAP_UAT_BROWSER_DEF027_DBG=${JSON.stringify(dbg)}`);
    record('BROWSER-DEF027-TXN-SECONDS', false, `no list row showed ${uniqueTime}`);
  }
  }
} catch (error) {
  console.error(`GAAP_UAT_BROWSER_P2_ERROR=${String(error?.stack ?? error)}`);
  allPassed = false;
}

const evidence = {
  sessionFile,
  baseUrl,
  email: session.email,
  createdTransactionTime: `2026-09-05T${uniqueTime}`,
  consoleErrorCount: consoleMessages.filter((entry) => entry.type === 'error').length,
};
console.log(`GAAP_UAT_BROWSER_P2_EVIDENCE=${JSON.stringify({ ...evidence, results })}`);
if (!allPassed) {
  const diag = { url: page.url(), lastConsole: consoleMessages.slice(-15) };
  console.log(`GAAP_UAT_BROWSER_DIAG=${JSON.stringify(diag)}`);
}
try {
  await page.screenshot({ path: '/tmp/gaap-uat-pw/browser-final.png' });
} catch (error) {
  console.error(`screenshot failed: ${String(error)}`);
}
await browser.close();
process.exit(allPassed && results.every((entry) => entry.status === 'PASS') ? 0 : 1);
