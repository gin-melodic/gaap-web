'use client';

import React from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { UserProfile } from './settings/UserProfile';
import { Subscription } from './settings/Subscription';
import { CurrencySettings } from './settings/CurrencySettings';
import { ThemeSettings } from './settings/ThemeSettings';
import { LanguageSettings } from './settings/LanguageSettings';
import { MainSettings } from './settings/MainSettings';
import { DataExportSettings } from './settings/DataExportSettings';

const Settings = () => {
  const { settingsView, setSettingsView } = useGlobal();

  return (
    <div>
      {settingsView === 'MAIN' && <MainSettings onNavigate={setSettingsView} />}
      {settingsView === 'PROFILE' && <UserProfile onBack={() => setSettingsView('MAIN')} />}
      {settingsView === 'SUBSCRIPTION' && <Subscription onBack={() => setSettingsView('MAIN')} />}
      {settingsView === 'CURRENCY' && <CurrencySettings onBack={() => setSettingsView('MAIN')} onUpgrade={() => setSettingsView('SUBSCRIPTION')} />}
      {settingsView === 'THEME' && <ThemeSettings onBack={() => setSettingsView('MAIN')} onUpgrade={() => setSettingsView('SUBSCRIPTION')} />}
      {settingsView === 'LANGUAGE' && <LanguageSettings onBack={() => setSettingsView('MAIN')} />}
      {settingsView === 'DATA_EXPORT' && <DataExportSettings onBack={() => setSettingsView('MAIN')} />}
    </div>
  );
};

export default Settings;
