import { chromium } from 'playwright';

// DEF-029 UI verification: the Settings -> Currency Management base-currency switch must
// persist through POST /v1/user/update-profile (was 404 "feature unavailable in beta" for
// every user on production runtimes because BetaScopeMiddleware deferred all
// /v1/user/update-* paths). Acceptance: switch CNY -> USD succeeds (toast + users.main_currency),
// dashboard aggregates in USD, and switching back to CNY works. No demo data is mutated.
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

  // --- Enter Currency Management (double-click confirm flow on the base-currency buttons). ---
  const switchBaseCurrency = async (id, target) => {
    apiResponses.length = 0;
    // First click arms the double-click confirm flow; the button label then flips to "Confirm".
    await page.getByRole('button', { name: target, exact: true }).click({ timeout: 15_000 });
    const confirming = page.getByRole('button', { name: /confirm/iu }).first();
    await confirming.waitFor({ state: 'visible', timeout: 8_000 })
      .catch(() => {
        throw new Error(`${target}: button did not enter confirm state`);
      });

    const toastTexts = new Set();
    let expectedSeen = false;
    const deadline = Date.now() + 15_000;
    await Promise.all([
      (async () => {
        while (!expectedSeen && Date.now() < deadline) {
          for (const text of await readToasts()) toastTexts.add(text);
          if ([...toastTexts].some((t) => t.includes('Base currency updated'))) expectedSeen = true;
          await page.waitForTimeout(400);
        }
      })(),
      confirming.click({ timeout: 10_000 }),
    ]);

    const toasts = [...toastTexts];
    const profileCalls = apiResponses.filter((r) => r.includes('update-profile'));
    console.log(`GAAP_UAT_BROWSER_${id}_TOASTS=${JSON.stringify(toasts)} API=${JSON.stringify(profileCalls)}`);

    // After a successful switch the re-rendered, now-selected currency button is disabled.
    const selectedDisabled = await page.getByRole('button', { name: target, exact: true })
      .first()
      .isDisabled().catch(() => false);
    record(
      `BROWSER-DEF029-${id}`,
      expectedSeen && profileCalls.some((r) => r.startsWith('200 ')) && selectedDisabled,
      `expected="Base currency updated" toast=${JSON.stringify(toasts)} profileCalls=${JSON.stringify(profileCalls)} targetSelectedDisabled=${selectedDisabled}`,
    );
  };

  await go('/settings');
  await page.getByText('Currency Management', { exact: true }).first().click({ timeout: 15_000 });
  await page.getByRole('heading', { name: 'Base Currency' }).waitFor({ state: 'visible', timeout: 30_000 });

  // 1) Switch CNY -> USD (current documented demo base is CNY).
  await switchBaseCurrency('SWITCH-TO-USD', 'USD');

  // 2) Dashboard must aggregate in the new base currency ($ symbols via Intl zh-CN USD).
  await go('/dashboard');
  let usdTotalSeen = false;
  const dashDeadline = Date.now() + 20_000;
  while (!usdTotalSeen && Date.now() < dashDeadline) {
    usdTotalSeen = /\$\d[\d,]*\.\d{2}/u.test(await page.evaluate(() => document.body.innerText).catch(() => ''));
    await page.waitForTimeout(1_000);
  }
  const dashText = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(0, 600);
  console.log(`GAAP_UAT_BROWSER_DASHBOARD_TEXT_HEAD=${JSON.stringify(dashText)}`);
  record(
    'BROWSER-DEF029-DASH-USD',
    /\$\d[\d,]*\.\d{2}/u.test(String(usdTotalSeen)) || /\$\d/u.test(dashText),
    `dashboard body (first 600 chars) inspected for USD-formatted totals: ${/\$\d/u.test(dashText)}`,
  );

  // 3) Switch back USD -> CNY and confirm it works.
  await go('/settings');
  await page.getByText('Currency Management', { exact: true }).first().click({ timeout: 15_000 });
  await page.getByRole('heading', { name: 'Base Currency' }).waitFor({ state: 'visible', timeout: 30_000 });
  await switchBaseCurrency('SWITCH-BACK-CNY', 'CNY');

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`GAAP_UAT_BROWSER_ALL=${allPassed ? 'PASS' : 'FAIL'}`);
  process.exitCode = allPassed ? 0 : 1;
} catch (error) {
  console.error('DEF-029 browser verification failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
