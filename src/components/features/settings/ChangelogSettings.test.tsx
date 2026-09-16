import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';

import { ChangelogSettings } from './ChangelogSettings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ChangelogSettings', () => {
  it('renders the page title, back link and current-version footer', () => {
    render(<ChangelogSettings onBack={() => undefined} />);
    expect(screen.getByText('changelog:title')).toBeTruthy();
    expect(screen.getByText('changelog:subtitle')).toBeTruthy();
    expect(screen.getByText('common:back_to_settings')).toBeTruthy();
    expect(screen.getByText('changelog:current_version')).toBeTruthy();
  });

  it('lists every baseline newest first with status, date and all note keys', () => {
    render(<ChangelogSettings onBack={() => undefined} />);

    // Both baselines are present, ordered newest first.
    const order = ['v0.0.2-beta', 'v0.0.1-beta'].map(version => screen.getByText(version));
    expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Statuses: v0.0.2-beta upcoming, v0.0.1-beta released (2026-08-14).
    expect(screen.getByText('changelog:upcoming')).toBeTruthy();
    expect(screen.getByText('changelog:released')).toBeTruthy();
    expect(screen.getByText('2026-08-14')).toBeTruthy();

    // Every item key renders (en keys are echoed by the mocked t).
    const itemKeys = [
      'changelog:v0.0.2-beta.added.multicurrency_accounts',
      'changelog:v0.0.2-beta.added.rate_management',
      'changelog:v0.0.2-beta.added.dashboard_valuation',
      'changelog:v0.0.2-beta.added.currency_settings',
      'changelog:v0.0.2-beta.fixed.trend_bucketing',
      'changelog:v0.0.2-beta.fixed.tx_currency_pairing',
      'changelog:v0.0.2-beta.fixed.settings_keyboard_nav',
      'changelog:v0.0.2-beta.fixed.profile_update_wire',
      'changelog:v0.0.1-beta.added.auth_sessions',
      'changelog:v0.0.1-beta.added.accounts',
      'changelog:v0.0.1-beta.added.transactions',
      'changelog:v0.0.1-beta.added.dashboard_trend',
      'changelog:v0.0.1-beta.added.settings_profile',
    ];
    for (const key of itemKeys) {
      expect(screen.getByText(key), `missing ${key}`).toBeTruthy();
    }
  });

  it('invokes onBack when the back link is clicked', () => {
    const onBack = vi.fn();
    render(<ChangelogSettings onBack={onBack} />);
    fireEvent.click(screen.getByText('common:back_to_settings'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
