'use client';

import {
  Bell, Search, Sun, Moon, CheckCheck, Megaphone, Award,
  CreditCard, AlertCircle, Info, X, Sparkles
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':      'Boshqaruv Paneli',
  '/schedule':       'Dars Jadvali',
  '/attendance':     'Davomat Tizimi',
  '/payments':       "To'lovlar Tizimi",
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
  const queryClient = useQueryClient();

  // Dynamic page title based on active route
  const currentTitle = PAGE_TITLES[pathname] || title || 'Boshqaruv Paneli';

  // Dark mode management
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-amber-500" />;
      case 'grade':
        return <Award className="w-4 h-4 text-emerald-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'attendance':
        return <AlertCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 relative z-30 transition-colors">
      {/* Left: Dynamic Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          {currentTitle}
        </h1>
      </div>

      {/* Right: Actions (Search, Notifications, Dark Mode) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Desktop Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-1.5 w-56 transition-colors">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Qidirish..."
            className="bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none w-full placeholder:text-gray-400"
          />
        </div>

        {/* Notifications Popover */}
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

          {/* Dropdown Menu */}
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

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                {items.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-xs">
                    Hozircha yangi bildirishnomalar mavjud emas
                  </div>
                ) : (
                  items.map((n) => {
                    const isUnread = !n.is_read;
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (isUnread) markReadMutation.mutate(n.id);
                        }}
                        className={`p-3.5 transition flex items-start gap-3 cursor-pointer ${
                          isUnread
                            ? 'bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="mt-0.5 w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          {getTypeIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {n.title}
                            </span>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                            {n.body}
                          </p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {n.created_at ? new Date(n.created_at * 1000).toLocaleString('uz-UZ', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tungi / Kunduzgi Rejim Toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-700 dark:text-amber-400"
          title={darkMode ? "Kunduzgi rejim" : "Tungi rejim"}
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-amber-400 transition-transform rotate-0" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600 transition-transform rotate-0" />
          )}
        </button>
      </div>
    </header>
  );
}
