'use client';

import React from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { UserProfile } from './settings/UserProfile';
import { ThemeSettings } from './settings/ThemeSettings';
import { LanguageSettings } from './settings/LanguageSettings';
import { MainSettings } from './settings/MainSettings';

const Settings = () => {
  const { settingsView, setSettingsView } = useGlobal();

  return (
    <div>
      {settingsView === 'MAIN' && <MainSettings onNavigate={setSettingsView} />}
      {settingsView === 'PROFILE' && <UserProfile onBack={() => setSettingsView('MAIN')} />}
      {settingsView === 'THEME' && <ThemeSettings onBack={() => setSettingsView('MAIN')} onUpgrade={() => setSettingsView('MAIN')} />}
      {settingsView === 'LANGUAGE' && <LanguageSettings onBack={() => setSettingsView('MAIN')} />}
    </div>
  );
};

export default Settings;
