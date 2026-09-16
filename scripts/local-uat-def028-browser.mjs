import { chromium } from 'playwright';

// DEF-028 UI verification: server-side ALE error responses must surface the real
// validation message in a toast (not the generic "Unable to verify secure API response").
// Repros (transfer mode, demo user with restored multi-currency accounts):
//   A. mc-usd-asset -> uat-eur-card      => "account currency mismatch"
//   B. mc-usd-asset -> mc-usd-asset      => "source and destination accounts must differ"
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

const apiResponses = [];
page.on('response', (r) => {
  const u = new URL(r.url());
  if (u.pathname.includes('/api/')) apiResponses.push(`${r.status()} ${u.pathname}`);
});
page.on('console', (message) => console.log(`[browser:${message.type()}] ${message.text()}`));
page.on('pageerror', (error) => console.log(`[browser:pageerror] ${String(error)}`));

// Hard navigations can race the client router's post-login handoff (ERR_ABORTED);
// retry a bounded number of times.
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

try {
  // --- Login as the online demo user (bootstrap ALE, no password). ---
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: /try the demo user/iu }).click({ timeout: 30_000 });
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 });
  console.log(`GAAP_UAT_BROWSER_LOGIN=OK url=${page.url()}`);
  await page.waitForTimeout(2_000); // let post-login hydration settle before the first hard navigation

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

  // Runs one transfer repro in a fresh dialog and asserts the toast content.
  const runTransferRepro = async (id, fromName, toName, expectMessage) => {
    apiResponses.length = 0;
    await go('/transactions');
    await page.getByRole('button', { name: /add transaction/iu }).click();
    const dialog = page.locator('[role=dialog]').first();
    await dialog.waitFor({ state: 'visible', timeout: 60_000 });

    const comboboxes = dialog.getByRole('combobox');
    await comboboxes.nth(0).click();
    await pickOption(fromName);
    await comboboxes.nth(1).click();
    await pickOption(toName);
    await dialog.locator('input[type="number"]').fill('1');
    await dialog.locator('input[type="text"]').last().fill(`def028-${id}`);

    const confirm = dialog.getByRole('button', { name: /confirm/iu });
    await expectEnabled(confirm, 5_000);
    const toastTexts = new Set();
    let expectedSeen = false;
    const deadline = Date.now() + 12_000;

    // Click confirm, then poll for the toast until the message appears or time runs out.
    await Promise.all([
      (async () => {
        while (!expectedSeen && Date.now() < deadline) {
          const texts = await page.evaluate(() => Array.from(document.querySelectorAll('[data-sonner-toast], [role=alert]'))
            .map((el) => el.textContent?.trim() ?? '').filter(Boolean)).catch(() => []);
          for (const text of texts) toastTexts.add(text);
          if ([...toastTexts].some((text) => text.includes(expectMessage))) expectedSeen = true;
          await page.waitForTimeout(500);
        }
      })(),
      confirm.click({ timeout: 10_000 }),
    ]);

    const dialogStillOpen = (await dialog.isVisible().catch(() => false)) === true;
    const toasts = [...toastTexts];
    console.log(`GAAP_UAT_BROWSER_${id}_TOASTS=${JSON.stringify(toasts)}`);
    console.log(`GAAP_UAT_BROWSER_${id}_API=${JSON.stringify(apiResponses.filter((r) => r.includes('create-transaction')))} dialogStillOpen=${dialogStillOpen}`);

    const sawExpected = toasts.some((text) => text.includes(expectMessage));
    const sawGenericFallback = toasts.some((text) => text.includes('Unable to verify secure API response'));
    return record(
      `BROWSER-DEF028-${id}`,
      sawExpected && !sawGenericFallback,
      `expected="${expectMessage}" dialogStillOpen=${dialogStillOpen} genericFallbackSeen=${sawGenericFallback}`,
    );
  };

  const expectEnabled = async (locator, timeout) => {
    await locator.waitFor({ state: 'visible', timeout });
    for (let i = 0; i < 12 && !(await locator.isEnabled().catch(() => false)); i += 1) {
      await page.waitForTimeout(500);
    }
    if (!(await locator.isEnabled().catch(() => false))) throw new Error('Confirm button stayed disabled');
  };

  // Sequential: one page, one dialog at a time.
  const controlOnly = process.env.GAAP_UAT_DEF028_CONTROL_ONLY === '1';
  if (!controlOnly) {
    await runTransferRepro('CROSS-CCY', 'mc-usd-asset', 'uat-eur-card', 'account currency mismatch');
    await runTransferRepro('SAME-ACCT', 'mc-usd-asset', 'mc-usd-asset', 'source and destination accounts must differ');
  }

  // A successful same-currency control submit proves the happy path is untouched:
  // mc-usd-asset -> UAT SameCcy Expense for US$1 should commit (dialog closes).
  await go('/transactions');
  await page.getByRole('button', { name: /add transaction/iu }).click();
  const dialog = page.locator('[role=dialog]').first();
  await dialog.waitFor({ state: 'visible', timeout: 60_000 });
  const comboboxes = dialog.getByRole('combobox');
  await comboboxes.nth(0).click();
  await pickOption('mc-usd-asset');
  await comboboxes.nth(1).click();
  await pickOption('UAT SameCcy Expense');
  await dialog.locator('input[type="number"]').fill('1');
  await dialog.locator('input[type="text"]').last().fill('def028-control-usable');
  const controlApi = apiResponses.length;
  await expectEnabled(dialog.getByRole('button', { name: /confirm/iu }), 5_000);
  await dialog.getByRole('button', { name: /confirm/iu }).click({ timeout: 10_000 });

  // Wait up to 20s for committed evidence: success toast, closed dialog, or the new
  // note text appearing in the list. (Dialog close alone is not sufficient proof.)
  const controlDeadline = Date.now() + 20_000;
  let successToast = false;
  let rowSeen = false;
  let dialogClosedAt = null;
  while (Date.now() < controlDeadline) {
    if (!successToast) {
      const toasts = await page.evaluate(() => Array.from(document.querySelectorAll('[data-sonner-toast], [role=alert]'))
        .map((el) => el.textContent?.trim() ?? '').filter(Boolean)).catch(() => []);
      for (const text of toasts) if (/success|created/iu.test(text)) successToast = true;
    }
    if (!rowSeen) {
      rowSeen = await page.evaluate((needle) => Array.from(document.querySelectorAll('main *'))
        .some((el) => el.children.length === 0 && (el.textContent ?? '').trim() === needle), 'def028-control-usable').catch(() => false);
    }
    if (!dialogClosedAt && !(await dialog.isVisible().catch(() => true))) dialogClosedAt = Date.now();
    if (successToast || rowSeen) break;
    await page.waitForTimeout(1_000);
  }

  const controlEvidence = successToast || rowSeen;
  console.log(`GAAP_UAT_BROWSER_CONTROL_EVIDENCE successToast=${successToast} rowSeen=${rowSeen} dialogClosedAt=${dialogClosedAt ? 'yes' : 'no'} apiTail=${JSON.stringify(apiResponses.slice(controlApi))}`);
  record(
    'BROWSER-DEF028-CONTROL-USABLE',
    Boolean(controlEvidence),
    `same-currency submit evidence successToast=${successToast} rowSeen=${rowSeen}; dialogClosed=${dialogClosedAt ? 'yes' : 'no'}`,
  );

  // NOTE: the control creates one extra US$1 expense txn on top of the seeded state;
  // clean it up through the API afterwards (GAAP_UAT_DELETE_TXN_ID) to restore US$95.
  console.log(`GAAP_UAT_BROWSER_DEMO_NOTE=control run added a US$1 expense txn (def028-control-usable); delete via GAAP_UAT_DELETE_TXN_ID after verification`);

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`GAAP_UAT_BROWSER_ALL=${allPassed ? 'PASS' : 'FAIL'}`);
  process.exitCode = allPassed ? 0 : 1;
} catch (error) {
  console.error('DEF-028 browser verification failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
