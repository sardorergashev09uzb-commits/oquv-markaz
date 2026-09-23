'use client';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useMemo } from 'react';
import { NetworkStatusBanner } from '@/components/common/NetworkStatusBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 1000,                      // 10 soniya — yangi ma'lumotlar DB dan darhol olinadi
            gcTime: 7 * 24 * 60 * 60 * 1000,          // Oflaynda foydalanish uchun
            networkMode: 'offlineFirst',               // Oflaynda keshdan tezkor o'qish
            refetchOnMount: true,                      // Sahifa ochilganda DB dan yangilash
            refetchOnWindowFocus: true,                 // Foydalanuvchi qaytganda yangilash
            retry: (failureCount, error: unknown) => {
              const status = (error as { response?: { status?: number } })?.response?.status;
              if (status === 401 || status === 403) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            networkMode: 'offlineFirst',
            retry: false,
          },
        },
      })
  );

  const persister = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: 'OM_REACT_QUERY_OFFLINE_CACHE_V2',
      throttleTime: 1000,
    });
  }, []);

  if (!persister) {
    return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 kun
        buster: 'v1.0.2',
      }}
    >
      <NetworkStatusBanner />
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </PersistQueryClientProvider>
  );
}
