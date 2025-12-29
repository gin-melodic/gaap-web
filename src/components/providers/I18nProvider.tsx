'use client';

import { ReactNode } from 'react';
import '@/lib/i18n';

export default function I18nProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
