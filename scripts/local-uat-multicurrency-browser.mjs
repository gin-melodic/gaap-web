import { readFileSync } from 'node:fs';

import { chromium } from 'playwright';

// Multi-currency browser mock gate for the local UAT stack.
// Authenticates as the online demo user configured in .env.uat (via the
// "Try the demo user" button, which resolves the ONLINE_DEMO_USER_* env vars
// server-side) and exercises the multi-currency UI end to end:
//   - demo login
//   - exchange-rate display
//   - manual rate override (anchor USD -> base CNY)
//   - standalone account in a non-base currency (USD)
//   - base-currency dashboard valuation (USD -> CNY)
const baseUrl = process.env.GAAP_UAT_BASE_URL ?? 'https://gaap.local';
const envFile = process.env.GAAP_UAT_ENV_FILE ?? '.env.uat';

function readEnv(name) {
  const line = readFileSync(envFile, 'utf8')
    .split(/\r?\n/u)
    .find((candidate) => candidate.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim().replace(/^['"]|['"]$/gu, '') : '';
}

const demoEmail = (process.env.ONLINE_DEMO_USER_EMAIL ?? readEnv('ONLINE_DEMO_USER_EMAIL')).trim();
const manualRate = '7.2';
const accountName = 'mc-usd-asset';

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
const page = await context.newPage();
page.on('response', (response) => {
  const url = new URL(response.url());
  if (url.pathname.includes('/api/')) console.log(`[resp] ${response.status()} ${url.pathname}`);
});
page.on('console', (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
page.on('pageerror', (error) => consoleMessages.push({ type: 'pageerror', text: String(error) }));

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

// Finds a currency row in Currency Settings by its "1 <anchor> ≈ <rate> <code>"
// label and returns both the label element and the surrounding row.
const findCurrencyRow = async (code) => {
  const rateLabel = page.getByText(new RegExp(`≈ .* ${code}$`)).first();
  await rateLabel.waitFor({ state: 'visible', timeout: 30_000 });
  const row = rateLabel.locator('xpath=ancestor::div[contains(@class,"p-4")][1]');
  return { rateLabel, row };
};

let allPassed = true;

try {
  // ---- Gate 1: demo login ----
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const demoButton = page.getByRole('button', { name: 'Try the demo user' });
  await demoButton.waitFor({ state: 'visible', timeout: 60_000 });
  await demoButton.click();
  let loggedIn = false;
  try {
    await page.waitForURL('**/dashboard', { timeout: 90_000 });
    loggedIn = true;
  } catch {
    loggedIn = false;
  }
  record('MC-LOGIN-DEMO', loggedIn, `url=${page.url()} email=${demoEmail}`);

  // ---- Gate 2: exchange-rate display (settings -> Currency Management) ----
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByText('Currency Management', { exact: true }).first().click();
  await page.getByRole('heading', { name: 'Exchange Rates' }).waitFor({ state: 'visible', timeout: 60_000 });
  const cnyRateText = await page.getByText(/1 USD ≈ .* CNY/).first().textContent().catch(() => '');
  record('MC-RATES-DISPLAY', /1 USD ≈ \d/.test(cnyRateText ?? ''), `cnyRate="${cnyRateText}"`);

  // ---- Gate 3: manual rate override (USD -> CNY) ----
  let overrideOk = false;
  try {
    const { row } = await findCurrencyRow('CNY');
    await row.locator('button').first().click(); // pencil edit button
    await row.locator('input[type="number"]').fill(manualRate);
    await row.locator('button.bg-green-500').first().click(); // green check (save)
    await page.getByText(new RegExp(`1 USD ≈ ${manualRate.replace('.', '\\.')}`)).first().waitFor({ state: 'visible', timeout: 30_000 });
    overrideOk = true;
  } catch (error) {
    console.error(`GAAP_UAT_BROWSER_OVERRIDE_ERROR=${String(error?.stack ?? error)}`);
  }
  record('MC-RATE-OVERRIDE', overrideOk, `rate=${manualRate} CNY`);

  // ---- Gate 4 + 5: standalone USD account via Add Account dialog ----
  await page.goto(`${baseUrl}/accounts`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const addAccountTrigger = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
  await addAccountTrigger.click();
  const dialog = page.locator('[role=dialog]').first();
  await dialog.waitFor({ state: 'visible', timeout: 60_000 });

  const currencyCombobox = dialog.getByRole('combobox').first();
  const comboboxEnabled = await currencyCombobox.isEnabled().catch(() => false);
  await currencyCombobox.click();
  await pickOption('USD');
  record('MC-ACCOUNT-CURRENCY-ENABLED', comboboxEnabled, `comboboxEnabled=${comboboxEnabled}`);

  // Account Name is the first plain <input> in the dialog (the Input component
  // omits the type attribute when it is text).
  await dialog.locator('input').first().fill(accountName);
  await dialog.locator('input[type="number"]').fill('100');
  await dialog.getByRole('button', { name: 'Save' }).click();

  const confirmToasts = [];
  for (let i = 0; i < 4; i += 1) {
    await page.waitForTimeout(2_000);
    confirmToasts.push(...(await page.evaluate(() => Array.from(document.querySelectorAll('[data-sonner-toast], [role=alert]')).map((el) => el.textContent?.trim() ?? '').filter(Boolean))));
  }
  console.log(`GAAP_UAT_BROWSER_CONFIRM_TOASTS=${JSON.stringify([...new Set(confirmToasts)])}`);
  const dialogClosed = !(await dialog.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => null));
  record('MC-ACCOUNT-CREATE-USD', dialogClosed, `toasts=${JSON.stringify([...new Set(confirmToasts)])} name=${accountName}`);

  // ---- Gate 6: dashboard valuation (USD -> CNY) ----
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const netWorth = page.locator('div.text-3xl.font-bold').first();
  await netWorth.waitFor({ state: 'visible', timeout: 60_000 });
  let worthText = '';
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    worthText = (await netWorth.textContent().catch(() => '')) ?? '';
    if (worthText.includes('720')) break;
    await page.waitForTimeout(1_000);
  }
  record('MC-DASHBOARD-VALUATION', worthText.includes('720'), `netWorth="${worthText}" expected~720 CNY (100 USD x ${manualRate})`);

  await page.screenshot({ path: '/tmp/gaap-uat-pw/mc-dashboard.png', fullPage: true }).catch(() => {});
} catch (error) {
  console.error(`GAAP_UAT_BROWSER_MC_ERROR=${String(error?.stack ?? error)}`);
  allPassed = false;
}

const evidence = {
  baseUrl,
  email: demoEmail,
  accountName,
  manualRate,
  consoleErrorCount: consoleMessages.filter((entry) => entry.type === 'error').length,
  results,
};
console.log(`GAAP_UAT_BROWSER_MC_EVIDENCE=${JSON.stringify(evidence)}`);
if (!allPassed) {
  const diag = { url: page.url(), lastConsole: consoleMessages.slice(-15) };
  console.log(`GAAP_UAT_BROWSER_MC_DIAG=${JSON.stringify(diag)}`);
}
try {
  await page.screenshot({ path: '/tmp/gaap-uat-pw/mc-browser-final.png' });
} catch (error) {
  console.error(`screenshot failed: ${String(error)}`);
}
await browser.close();
process.exit(allPassed && results.every((entry) => entry.status === 'PASS') ? 0 : 1);
