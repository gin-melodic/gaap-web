'use client';

import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobal } from '@/context/GlobalContext';
import { opsService } from '../services';

export const opsKeys = {
  all: ['ops'] as const,
  status: () => [...opsKeys.all, 'status'] as const,
};

// localStorage flag set once the console has been reached successfully, so the
// sidebar can offer a shortcut without advertising the endpoint to everyone.
export const OPS_DISCOVERED_KEY = 'ops_discovered';

// Custom event broadcast when the flag flips in this tab (the native
// "storage" event only fires across tabs).
const OPS_DISCOVERED_EVENT = 'ops-discovered';

function subscribeToDiscovery(callback: () => void): () => void {
  window.addEventListener(OPS_DISCOVERED_EVENT, callback);
  return () => window.removeEventListener(OPS_DISCOVERED_EVENT, callback);
}

// True once this browser profile has loaded the console at least once.
export function useOpsDiscovered(): boolean {
  return useSyncExternalStore(
    subscribeToDiscovery,
    () => window.localStorage.getItem(OPS_DISCOVERED_KEY) === '1',
    () => false, // SSR snapshot; the client value takes over on hydration.
  );
}

// Polls the ops status every 10 seconds while the user is logged in.
export function useOpsStatus() {
  const { isLoggedIn } = useGlobal();
  return useQuery({
    queryKey: opsKeys.status(),
    queryFn: () => opsService.getStatus(),
    enabled: isLoggedIn,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    retry: false,
    staleTime: 5_000,
  });
}

// Runs the read-only ledger reconciliation on demand, then refreshes status.
export function useOpsReconcile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => opsService.reconcileNow(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: opsKeys.status() });
    },
  });
}

// Convenience wrapper: status query plus the one-time discovery mark, so the
// sidebar shortcut appears for this browser profile after first success.
export function useOpsConsole() {
  const status = useOpsStatus();
  useEffect(() => {
    if (status.isSuccess && typeof window !== 'undefined') {
      if (window.localStorage.getItem(OPS_DISCOVERED_KEY) !== '1') {
        window.localStorage.setItem(OPS_DISCOVERED_KEY, '1');
        window.dispatchEvent(new Event(OPS_DISCOVERED_EVENT));
      }
    }
  }, [status.isSuccess]);
  return status;
}
