'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useGlobal } from '@/context/GlobalContext';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  Settings,
  LogOut
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, setSettingsView } = useGlobal();
  const { t } = useTranslation('common');

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/accounts', icon: Wallet, label: t('accounts') },
    { href: '/transactions', icon: ArrowRightLeft, label: t('transactions') },
    { href: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-card)] border-r border-[var(--border)] h-full p-4">
      <div className="flex items-center gap-3 px-4 mb-8 mt-2">
        <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
          <Wallet className="text-white w-4 h-4" />
        </div>
        <span className="text-xl font-bold tracking-tight text-[var(--text-main)]">GAAP Cloud</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                // Reset settingsView to MAIN when clicking on settings navigation
                if (item.href === '/settings') {
                  setSettingsView('MAIN');
                }
              }}
            >
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 px-4 py-6 my-1 rounded-xl transition-all cursor-pointer user-select-none ${isActive
                  ? 'bg-[var(--primary)] text-white font-bold hover:bg-[var(--primary)] hover:text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
                  }`}
              >
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-sm">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      <div
        className="mt-auto px-4 py-4 border-t border-[var(--border)] cursor-pointer user-select-none hover:bg-[var(--bg-main)] transition-colors"
        onClick={() => {
          setSettingsView('PROFILE');
          router.push('/settings');
        }}
      >
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Avatar className="w-8 h-8 border border-[var(--border)]">
            <AvatarImage src={user?.avatar || undefined} />
            <AvatarFallback className="bg-[var(--bg-main)] text-[var(--primary)] font-bold">
              {user?.nickname?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium text-[var(--text-main)]">{user.nickname}</div>
            <div className="text-xs capitalize">{user.plan} {t('plan')}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
