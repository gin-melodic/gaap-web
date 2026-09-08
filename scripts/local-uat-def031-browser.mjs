import { chromium } from 'playwright';

// DEF-031 UI verification: the settings sub-nav rows and the sidebar profile shortcut must be
// keyboard-operable (Tab reachable, Enter activates) and automation-addressable without a mouse.
// The Dashboard trend "Select Accounts" trigger is verified to be a native <button> that opens
// its menu on Enter. No data is written by this run.
const baseUrl = process.env.GAAP_UAT_BASE_URL ?? 'https://gaap.local';

const results = [];

const browser = await chromium.launch();
const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'en-US' });
const page = await context.newPage();

page.on('console', (message) => console.log(`[browser:${message.type()}] ${message.text()}`));
page.on('pageerror', (error) => console.log(`[browser:pageerror] ${String(error)}`));

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
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: /try the demo user/iu }).click({ timeout: 30_000 });
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 });
  console.log(`GAAP_UAT_BROWSER_LOGIN=OK url=${page.url()}`);
  await page.waitForTimeout(2_000);

  // Re-renders the record helper bound to this run (declared late on purpose so gates below read clearly).
  const done = (id, pass, detail) => {
    results.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
    console.log(`GAAP_UAT_BROWSER_GATE=${JSON.stringify({ id, status: pass ? 'PASS' : 'FAIL', detail })}`);
    return pass;
  };

  // Press Tab from the top of the page until `predicate` matches the focused element.
  const tabUntil = async (predicate, maxTabs) => {
    await page.evaluate(() => {
      const el = document.activeElement;
      if (el && el !== document.body) el.blur?.();
    });
    for (let i = 1; i <= maxTabs; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement ?? null;
        return el ? {
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') ?? '',
          ariaLabel: el.getAttribute('aria-label') ?? '',
          text: (el.textContent ?? '').trim().slice(0, 80),
        } : null;
      });
      if (info && predicate(info)) return { tabs: i, info };
    }
    return null;
  };

  const currencyRowPredicate = (i) => /currency management/iu.test(i.ariaLabel) || (/currency management/iu.test(i.text) && i.role === 'button');

  // --- Gate A: Tab reaches the Currency Management row, Enter opens it. ---
  await go('/settings');
  await page.waitForSelector('h1, h2, h3', { state: 'visible', timeout: 60_000 });
  const reached = await tabUntil(currencyRowPredicate, 80);
  if (!reached) throw new Error('Currency Management row not reachable via Tab (checked 80 tabs)');
  console.log(`GAAP_UAT_BROWSER_TAB_REACHED=${JSON.stringify(reached.info)} after ${reached.tabs} tabs`);
  await page.keyboard.press('Enter');
  const currencyHeading = page.getByRole('heading', { name: /currency management/iu });
  await currencyHeading.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  // The row label itself is not a heading; after navigation the CurrencySettings view renders its own h2.
  const entered = (await page.evaluate(() => document.body.innerText.match(/Base Currency/iu) !== null));
  done(
    'BROWSER-DEF031-CURRENCY-KEYBOARD',
    !!entered,
    `Tab x${reached.tabs} focused the row; Enter switched to Currency Management (base-currency section visible=${!!entered})`,
  );

  // --- Gate B: sidebar profile shortcut is a keyboard target and Enter opens Profile settings. ---
  await go('/accounts'); // leave /settings so the view resets
  const avatarEl = page.locator('aside [role="button"][tabindex="0"]').first();
  await avatarEl.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  const avatarInfo = await page.evaluate(() => {
    const el = document.querySelector('aside [role="button"][tabindex="0"]');
    return el ? { ariaLabel: el.getAttribute('aria-label') ?? '', tabindex: el.getAttribute('tabindex') } : null;
  });
  let avatarEnterWorks = false;
  if (avatarInfo) {
    await page.evaluate(() => document.querySelector('aside [role="button"][tabindex="0"]')?.focus());
    await page.keyboard.press('Enter');
    try {
      await page.waitForURL(/\/settings/u, { timeout: 15_000 });
      avatarEnterWorks = (await page.evaluate(() => document.body.innerText.match(/demo_user/iu) !== null));
    } catch { /* stayed on /accounts */ }
  }
  done(
    'BROWSER-DEF031-SIDEBAR-AVATAR-KEYBOARD',
    !!avatarInfo && avatarEnterWorks,
    `sidebar profile shortcut: ${JSON.stringify(avatarInfo)}; Enter navigated to Profile settings=${!!avatarEnterWorks}`,
  );

  // --- Gate C: Dashboard "Select Accounts" trigger is a native button that opens on Enter. ---
  await go('/dashboard');
  const selectBtn = page.getByRole('button', { name: /select accounts/iu }).first();
  await selectBtn.waitFor({ state: 'visible', timeout: 30_000 });
  const tagName = await selectBtn.evaluate((el) => el.tagName.toLowerCase());
  let menuOpened = false;
  if (tagName === 'button') {
    await page.evaluate(() => document.activeElement !== null && document.activeElement.blur?.());
    const reached2 = await tabUntil((i) => i.tag === 'button' && /select accounts/iu.test(i.ariaLabel + ' ' + i.text), 120);
    if (reached2) {
      await page.keyboard.press('Enter');
      menuOpened = (await page.getByRole('menu').first().isVisible({ timeout: 5_000 }).catch(() => false)) ||
        (await page.evaluate(() => !!document.querySelector('[data-radix-popper-content-wrapper]')));
    } else {
      // Fall back to programmatic focus + Enter if the Tab walk is too long on this route.
      await selectBtn.focus();
      await page.keyboard.press('Enter');
      menuOpened = (await page.evaluate(() => !!document.querySelector('[data-radix-popper-content-wrapper]')));
    }
  }
  done(
    'BROWSER-DEF031-SELECT-ACCOUNTS-BUTTON',
    tagName === 'button' && menuOpened,
    `"Select Accounts" trigger tag=${tagName} (native button required); Enter opened the account menu=${!!menuOpened}`,
  );

  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(`GAAP_UAT_BROWSER_ALL=${allPassed ? 'PASS' : 'FAIL'}`);
  process.exitCode = allPassed ? 0 : 1;
} catch (error) {
  console.error('DEF-031 browser verification failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
