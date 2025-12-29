'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowRightLeft, 
  Settings 
} from 'lucide-react';

const MobileNav = () => {
  const pathname = usePathname();
  const { t } = useTranslation('common');

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/accounts', icon: Wallet, label: t('accounts') },
    { href: '/transactions', icon: ArrowRightLeft, label: t('transactions') },
    { href: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] border-t border-[var(--border)] pb-safe pt-2 px-6 flex justify-between items-center z-40 h-[80px]">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className="w-full">
            <div className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all w-full ${
              isActive 
                ? 'bg-[var(--primary)] text-white font-bold' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]'
            }`}>
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px]">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
};

export default MobileNav;
