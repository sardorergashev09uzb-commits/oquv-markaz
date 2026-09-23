'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface OfflineAction {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  timestamp: number;
  description?: string;
}

const STORAGE_KEY = 'om_offline_sync_queue';

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline queue:', e);
  }
}

export function addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): OfflineAction {
  const newAction: OfflineAction = {
    ...action,
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };

  const queue = getOfflineQueue();
  queue.push(newAction);
  saveOfflineQueue(queue);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('offline-queue-changed'));
  }

  return newAction;
}

export function removeOfflineAction(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  saveOfflineQueue(queue);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('offline-queue-changed'));
  }
}

export async function processOfflineQueue(onProgress?: (pendingCount: number) => void): Promise<{ success: number; failed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { success: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  let successCount = 0;
  let failedCount = 0;
  const remainingQueue: OfflineAction[] = [];

  for (const item of queue) {
    try {
      if (item.method === 'POST') {
        await api.post(item.url, item.data);
      } else if (item.method === 'PUT') {
        await api.put(item.url, item.data);
      } else if (item.method === 'PATCH') {
        await api.patch(item.url, item.data);
      } else if (item.method === 'DELETE') {
        await api.delete(item.url);
      }
      successCount++;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      // If 4xx validation or not found error, don't retry forever
      if (status && status >= 400 && status < 500) {
        console.warn(`Offline action rejected by server with status ${status}, discarding:`, item);
        failedCount++;
      } else {
        // Network or 5xx error, retain in queue for next sync
        remainingQueue.push(item);
        failedCount++;
      }
    }

    if (onProgress) {
      onProgress(remainingQueue.length);
    }
  }

  saveOfflineQueue(remainingQueue);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('offline-queue-changed'));
  }

  return { success: successCount, failed: failedCount };
}

export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const updateCount = useCallback(() => {
    setPendingCount(getOfflineQueue().length);
  }, []);

  const triggerSync = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    if (getOfflineQueue().length === 0) return;

    setIsSyncing(true);
    try {
      await processOfflineQueue((rem) => setPendingCount(rem));
    } finally {
      setIsSyncing(false);
      updateCount();
    }
  }, [updateCount]);

  useEffect(() => {
    updateCount();

    const handleQueueChange = () => updateCount();
    const handleOnline = () => {
      // Small delay to allow network stabilization
      setTimeout(() => {
        triggerSync();
      }, 1000);
    };

    window.addEventListener('offline-queue-changed', handleQueueChange);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline-queue-changed', handleQueueChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [updateCount, triggerSync]);

  return {
    pendingCount,
    isSyncing,
    syncNow: triggerSync,
  };
}
