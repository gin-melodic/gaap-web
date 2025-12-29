'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { UserProfile } from './settings/UserProfile';
import { Subscription } from './settings/Subscription';
import { CurrencySettings } from './settings/CurrencySettings';
import { ThemeSettings } from './settings/ThemeSettings';
import { LanguageSettings } from './settings/LanguageSettings';
import { MainSettings } from './settings/MainSettings';
import { SettingsView } from '@/context/GlobalContext';

const Settings = () => {
  const { settingsView } = useGlobal();
  const [view, setView] = useState<SettingsView>(settingsView);
  const prevSettingsViewRef = useRef(settingsView);

  // Sync global state to local view
  useEffect(() => {
    // Only sync when global state is changed externally (avoid triggering when switching views internally)
    if (settingsView !== prevSettingsViewRef.current) {
      setView(settingsView);
      prevSettingsViewRef.current = settingsView;
    }
  }, [settingsView]);

  return (
    <div>
      {view === 'MAIN' && <MainSettings onNavigate={setView} />}
      {view === 'PROFILE' && <UserProfile onBack={() => setView('MAIN')} />}
      {view === 'SUBSCRIPTION' && <Subscription onBack={() => setView('MAIN')} />}
      {view === 'CURRENCY' && <CurrencySettings onBack={() => setView('MAIN')} onUpgrade={() => setView('SUBSCRIPTION')} />}
      {view === 'THEME' && <ThemeSettings onBack={() => setView('MAIN')} onUpgrade={() => setView('SUBSCRIPTION')} />}
      {view === 'LANGUAGE' && <LanguageSettings onBack={() => setView('MAIN')} />}
    </div>
  );
};

export default Settings;
