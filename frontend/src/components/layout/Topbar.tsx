'use client';

import {
  Bell, Sun, Moon, CheckCheck, Megaphone,
  Settings, CheckCircle, RefreshCw
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getCurrentUserFromToken, canManage } from '@/lib/auth';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':      'Boshqaruv Paneli',
  '/schedule':       'Dars Jadvali',
  '/attendance':     'Davomat Tizimi',
  '/payments':       "To'lovlar & Kassa",
  '/groups':         'Guruhlar',
  '/students':       "O'quvchilar",
  '/teachers':       "O'qituvchilar",
  '/courses':        'Kurslar',
  '/rooms':          'Auditoriyalar',
  '/announcements':  "E'lonlar Taxtasi",
  '/homework':       'Uy Vazifalari',
  '/exams':          'Imtihonlar',
  '/certificates':   'Sertifikatlar',
  '/finance':        'Moliya',
  '/leads':          'CRM Leadlar',
  '/reports':        'Hisobotlar',
  '/settings':       'Sozlamalar',
  '/profile':        'Mening Profilim',
};

interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean | number;
  created_at: number;
}

export function Topbar({ title }: { title?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const currentTitle = PAGE_TITLES[pathname] || title || 'Boshqaruv Paneli';

  // User role
  const [userRole, setUserRole] = useState<string>('student');
  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) setUserRole(user.role);
  }, []);

  // Data refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      setRefreshToast(true);
      setTimeout(() => setRefreshToast(false), 3000);
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    }
  }, []);

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };


  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useQuery({
    queryKey: ['user-notifications'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/notifications');
        return res.data as { items: NotificationItem[]; unread_count: number };
      } catch {
        return { items: [], unread_count: 0 };
      }
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const items = notifData?.items || [];
  const unreadCount = notifData?.unread_count || 0;



  return (
    <>
      <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 relative z-30 transition-colors">
        {/* Left: Dynamic Page Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate max-w-[240px] sm:max-w-none">
            {currentTitle}
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300"
              title="Bildirishnomalar"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-16px)] sm:w-80 md:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">Bildirishnomalar</span>
                    {unreadCount > 0 && (
                      <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-semibold">
                        {unreadCount} yangi
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => readAllMutation.mutate()}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Hammasi o&apos;qildi
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {items.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-xs">
                      Hozircha yangi bildirishnomalar mavjud emas
                    </div>
                  ) : (
                    items.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markReadMutation.mutate(n.id);
                        }}
                        className={`p-3.5 transition flex items-start gap-3 cursor-pointer ${
                          !n.is_read
                            ? 'bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="mt-0.5 w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <Megaphone className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bazadan ma'lumotlarni to'liq yangilash (Sync DB Data) */}
          <button
            type="button"
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className={`w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 transition text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer ${
              isRefreshing ? 'opacity-70' : ''
            }`}
            title="Ma'lumotlarni bazadan to'liq yangilash (Keshni yangilash)"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Tizim Sozlamalari (Admin & Manager uchun bildirishnomalar yonida) */}
          {canManage(userRole) && (
            <Link
              href="/settings"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 transition text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
              title="Tizim sozlamalari"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}

          {/* Tungi / Kunduzgi Rejim Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-700 dark:text-amber-400 cursor-pointer"
            title={darkMode ? "Kunduzgi rejim" : "Tungi rejim"}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </header>

      {/* Toast: Ma'lumotlar yangilandi */}
      {refreshToast && (
        <div className="fixed top-16 right-4 z-50 p-3 px-4 bg-emerald-600 text-white text-xs font-semibold rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-white" />
          <span>Barcha ma&apos;lumotlar bazadan yangilandi!</span>
        </div>
      )}
    </>
  );
}
