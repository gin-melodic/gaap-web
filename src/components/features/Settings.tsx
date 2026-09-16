'use client';

import React from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { UserProfile } from './settings/UserProfile';
import { ThemeSettings } from './settings/ThemeSettings';
import { LanguageSettings } from './settings/LanguageSettings';
import { CurrencySettings } from './settings/CurrencySettings';
import { MainSettings } from './settings/MainSettings';
import { ChangelogSettings } from './settings/ChangelogSettings';

const Settings = () => {
  const { settingsView, setSettingsView } = useGlobal();

  return (
    <div>
      {settingsView === 'MAIN' && <MainSettings onNavigate={setSettingsView} />}
      {settingsView === 'PROFILE' && <UserProfile onBack={() => setSettingsView('MAIN')} />}
      {settingsView === 'CURRENCY' && <CurrencySettings onBack={() => setSettingsView('MAIN')} onUpgrade={() => setSettingsView('MAIN')} />}
      {settingsView === 'THEME' && <ThemeSettings onBack={() => setSettingsView('MAIN')} onUpgrade={() => setSettingsView('MAIN')} />}
      {settingsView === 'LANGUAGE' && <LanguageSettings onBack={() => setSettingsView('MAIN')} />}
      {settingsView === 'CHANGELOG' && <ChangelogSettings onBack={() => setSettingsView('MAIN')} />}
    </div>
  );
};

export default Settings;
