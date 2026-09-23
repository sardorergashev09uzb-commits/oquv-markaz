'use client';

import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { useSyncQueue } from '@/lib/offlineQueue';

export function NetworkStatusBanner() {
  const { isOnline, isReconnected } = useNetworkStatus();
  const { pendingCount, isSyncing } = useSyncQueue();

  if (isOnline && !isReconnected && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] md:max-w-md w-full px-3 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-3"
    >
      {!isOnline && (
        <div className="flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-500/95 dark:bg-amber-600/95 text-white shadow-lg backdrop-blur-md text-xs font-semibold">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-100" />
            <span>Siz oflayn rejimdasiz — saqlangan ma&apos;lumotlar ko&apos;rsatilmoqda</span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-amber-700/60 px-2 py-0.5 rounded-full text-[10px] shrink-0 font-bold">
              {pendingCount} ta amal kutilmoqda
            </span>
          )}
        </div>
      )}

      {isOnline && isSyncing && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-blue-600/95 dark:bg-blue-700/95 text-white shadow-lg backdrop-blur-md text-xs font-semibold">
          <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-blue-100" />
          <span>Oflayn kiritilgan ma&apos;lumotlar server bilan sinxronlanmoqda...</span>
        </div>
      )}

      {isOnline && isReconnected && !isSyncing && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-600/95 dark:bg-emerald-700/95 text-white shadow-lg backdrop-blur-md text-xs font-semibold animate-out fade-out duration-700">
          <Wifi className="w-4 h-4 shrink-0 text-emerald-100" />
          <span>Internet aloqasi tiklandi! Ma&apos;lumotlar yangilandi.</span>
        </div>
      )}
    </aside>
  );
}
