import { chromium } from 'playwright';

// DEF-030 UI verification: cross-currency accounts must not be selectable as the opposite
// leg of a transaction (the server rejects every cross-currency pair with "account currency
// mismatch"). With FROM = mc-usd-asset (USD) the TO dropdown must hide uat-eur-card (EUR);
// symmetrically, with TO picked first the FROM dropdown must hide USD accounts. A same-
// currency control submit still commits and is deleted via the API afterwards to restore the
// seeded balances.
const baseUrl = process.env.GAAP_UAT_BASE_URL ?? 'https://gaap.local';

const results = [];
const record = (id, pass, detail) => {
  const entry = { id, status: pass ? 'PASS' : 'FAIL', detail };
  results.push(entry);
  console.log(`GAAP_UAT_BROWSER_GATE=${JSON.stringify(entry)}`);
  return pass;
};

const browser = await chromium.launch();
const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'en-US' });
const page = await context.newPage();

page.on('console', (message) => console.log(`[browser:${message.type()}] ${message.text()}`));
page.on('pageerror', (error) => console.log(`[browser:pageerror] ${String(error)}`));

// Hard navigations can race the client router's post-login handoff (ERR_ABORTED); retry.
const go = async (path) => {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      return;
    } catch (error) {
      if (!/ERR_ABORTED|net::ERR/u.test(String(error)) || attempt === 4) throw error;
      console.log(`GAAP_UAT_BROWSER_NAV_RETRY=${path} attempt=${attempt}`);
      await page.waitForTimeout(1_500);
    }
  }
};

const readToasts = async () => page.evaluate(() => Array.from(document.querySelectorAll('[data-sonner-toast], [role=alert]'))
  .map((el) => el.textContent?.trim() ?? '').filter(Boolean)).catch(() => []);

try {
  // --- Login as the online demo user (bootstrap ALE, no password). ---
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: /try the demo user/iu }).click({ timeout: 30_000 });
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 });
  console.log(`GAAP_UAT_BROWSER_LOGIN=OK url=${page.url()}`);
  await page.waitForTimeout(2_000);

  const openDialog = async () => {
    await go('/transactions');
    await page.getByRole('button', { name: /add transaction/iu }).click();
    const dialog = page.locator('[role=dialog]').first();
    await dialog.waitFor({ state: 'visible', timeout: 60_000 });
    return dialog;
  };

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

  // Opens a select (FROM = combobox 0, TO = combobox 1) and returns the visible option names.
  const openAndListOptions = async (dialog, index) => {
    await dialog.getByRole('combobox').nth(index).click();
    await page.waitForTimeout(400);
    const options = page.getByRole('option');
    const count = await options.count();
    const names = [];
    for (let i = 0; i < count; i += 1) {
      if (await options.nth(i).isVisible()) names.push((await options.nth(i).textContent().catch(() => '')) ?? '');
    }
    // Close the select again by pressing Escape.
    await page.keyboard.press('Escape');
    return names;
  };

  const closeDialog = async (dialog) => {
    for (let i = 0; i < 3 && (await dialog.isVisible().catch(() => false)); i += 1) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
    if (await dialog.isVisible().catch(() => false)) throw new Error('could not close the add-transaction dialog');
  };

  // --- Dialog #1: baseline TO list, then USD source must hide the EUR asset. ---
  const dialogA = await openDialog();

  const toBefore = await openAndListOptions(dialogA, 1);
  console.log(`GAAP_UAT_BROWSER_TO_OPTIONS_BEFORE=${JSON.stringify(toBefore)}`);
  record(
    'BROWSER-DEF030-BASELINE',
    toBefore.some((n) => n.includes('mc-usd-asset')) && toBefore.some((n) => n.includes('uat-eur-card')),
    `before any selection the TO list offers both currencies: ${JSON.stringify(toBefore)}`,
  );

  await dialogA.getByRole('combobox').nth(0).click();
  await page.waitForTimeout(300);
  await pickOption('mc-usd-asset'); // FROM
  const toAfterUsd = await openAndListOptions(dialogA, 1);
  console.log(`GAAP_UAT_BROWSER_TO_OPTIONS_AFTER_USD_FROM=${JSON.stringify(toAfterUsd)}`);
  record(
    'BROWSER-DEF030-CROSSCCY-HIDDEN',
    !toAfterUsd.some((n) => n.includes('uat-eur-card')) && toAfterUsd.some((n) => n.includes('UAT SameCcy Expense')) && toAfterUsd.some((n) => /new expense account/iu.test(n)),
    `with FROM=mc-usd-asset the EUR asset is unavailable: uatEurCard=${toAfterUsd.some((n) => n.includes('uat-eur-card'))}`,
  );

  await closeDialog(dialogA);

  // --- Dialog #2: TO picked first must hide USD assets in the FROM list (symmetric), then a
  // same-currency control submit proves usable pairs still commit. ---
  const dialogB = await openDialog();
  const comboboxesB = dialogB.getByRole('combobox');
  await comboboxesB.nth(1).click();
  await pickOption('UAT SameCcy Expense'); // TO (USD expense account)

  const fromAfterUsdTo = await openAndListOptions(dialogB, 0);
  console.log(`GAAP_UAT_BROWSER_FROM_OPTIONS_AFTER_USD_TO=${JSON.stringify(fromAfterUsdTo)}`);
  record(
    'BROWSER-DEF030-CROSSCCY-HIDDEN-SYMMETRIC',
    fromAfterUsdTo.some((n) => n.includes('mc-usd-asset')) && !fromAfterUsdTo.some((n) => n.includes('uat-eur-card')),
    `with TO=UAT SameCcy Expense (USD) the FROM list hides the EUR asset: uatEurCard=${fromAfterUsdTo.some((n) => n.includes('uat-eur-card'))}`,
  );

  await comboboxesB.nth(0).click();
  await pickOption('mc-usd-asset'); // FROM — same-currency pair
  const numberInput = dialogB.locator('input[type="number"]');
  await numberInput.fill('1');
  await dialogB.locator('input[type="text"]').last().fill('def030-control');

  const confirm = dialogB.getByRole('button', { name: /confirm/iu });
  for (let i = 0; i < 12 && !(await confirm.isEnabled().catch(() => false)); i += 1) await page.waitForTimeout(500);
  if (!(await confirm.isEnabled())) throw new Error('Confirm button stayed disabled');

  const deadline = Date.now() + 20_000;
  // Click once, then poll for the committed evidence (toast or list row).
  void confirm.click().catch(() => {});
  let successToast = false;
  let rowSeen = false;
  while (Date.now() < deadline && !(successToast || rowSeen)) {
    if (!successToast) for (const text of await readToasts()) if (/success|created/iu.test(text)) successToast = true;
    if (!rowSeen) rowSeen = await page.evaluate(() => Array.from(document.querySelectorAll('main *'))
      .some((el) => el.children.length === 0 && (el.textContent ?? '').trim() === 'def030-control')).catch(() => false);
    await page.waitForTimeout(800);
  }
  record(
    'BROWSER-DEF030-SAMECCY-STILL-USABLE',
    successToast || rowSeen,
    `same-currency US$1 expense committed: successToast=${successToast} rowSeen=${rowSeen}`,
  );

  console.log('GAAP_UAT_BROWSER_DEMO_NOTE=control run added one US$1 expense txn (note def030-control) to UAT SameCcy Expense; delete it via GAAP_UAT_DELETE_TXN_ID after verification');

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`GAAP_UAT_BROWSER_ALL=${allPassed ? 'PASS' : 'FAIL'}`);
  process.exitCode = allPassed ? 0 : 1;
} catch (error) {
  console.error('DEF-030 browser verification failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
