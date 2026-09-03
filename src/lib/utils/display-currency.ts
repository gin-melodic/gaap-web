type CurrencySource = {
  currencyCode?: string | null;
};

function normalizeCurrency(value?: string | null): string {
  return value?.trim().toUpperCase() ?? '';
}

export function resolveDisplayCurrency(
  profileCurrency: string | null | undefined,
  accountBalances: CurrencySource[],
  transactionAmounts: CurrencySource[] = [],
): string {
  const profile = normalizeCurrency(profileCurrency);
  if (profile) return profile;

  for (const source of [...accountBalances, ...transactionAmounts]) {
    const currency = normalizeCurrency(source.currencyCode);
    if (currency) return currency;
  }

  return 'USD';
}
