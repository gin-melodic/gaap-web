'use client';

import React from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { useTaskNotifications } from '@/lib/hooks';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { Skeleton } from '@/components/ui/skeleton';

// ... imports

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { currentTheme, isLoggedIn, isLoading } = useGlobal();

  // Monitor task completions and show notifications
  useTaskNotifications();

  if (isLoading) {
    return (
      <div className="flex h-screen font-sans overflow-hidden bg-slate-50">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 border-r border-slate-200 h-full p-4 gap-4 bg-white">
          <div className="flex items-center gap-3 px-4 mb-4 mt-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
          <div className="mt-auto px-4 py-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 h-full overflow-y-auto w-full p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-64 rounded-xl" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-64 rounded-xl" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen font-sans overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300"
      style={{
        '--primary': currentTheme.colors.primary,
        '--bg-main': currentTheme.colors.bg,
        '--bg-card': currentTheme.colors.card,
        '--text-main': currentTheme.colors.text,
        '--text-muted': currentTheme.colors.muted,
        '--border': currentTheme.colors.border,
      } as React.CSSProperties}
    >
      {isLoggedIn && <Sidebar />}

      <main className="flex-1 h-full overflow-y-auto w-full relative">
        <div className={isLoggedIn ? "p-4 md:p-8 max-w-5xl mx-auto min-h-full" : "w-full h-full"}>
          {children}
        </div>
      </main>

      {isLoggedIn && <MobileNav />}
    </div>
  );
};

export default AppLayout;
