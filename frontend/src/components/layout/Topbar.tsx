'use client';

import {
  Bell, Search, Sun, Moon, CheckCheck, Megaphone, Award,
  CreditCard, AlertCircle, Info, X, LayoutGrid, Users,
  BookOpen, DoorOpen, UserPlus, TrendingUp, Shield, Settings,
  GraduationCap, FileText, CheckCircle, Calendar, ClipboardCheck, Star
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getCurrentUserFromToken, isStudent, isTeacher, canManage } from '@/lib/auth';

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
  const router = useRouter();
  const queryClient = useQueryClient();

  const currentTitle = PAGE_TITLES[pathname] || title || 'Boshqaruv Paneli';

  // User role
  const [userRole, setUserRole] = useState<string>('student');
  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) setUserRole(user.role);
  }, []);

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

  // App Launcher Hub modal (Bento 㗊)
  const [showAppHub, setShowAppHub] = useState(false);

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

  // App Launcher modules list (Role-based)
  let appModules = [
    { href: '/students', label: "O'quvchilar", icon: GraduationCap, color: 'bg-blue-500' },
    { href: '/teachers', label: "O'qituvchilar", icon: Users, color: 'bg-indigo-500' },
    { href: '/groups', label: "Guruhlar", icon: BookOpen, color: 'bg-emerald-500' },
    { href: '/attendance', label: "Davomat", icon: ClipboardCheck, color: 'bg-teal-500' },
    { href: '/payments', label: "To'lovlar", icon: CreditCard, color: 'bg-rose-500' },
    { href: '/finance', label: "Moliya", icon: TrendingUp, color: 'bg-emerald-600' },
    { href: '/schedule', label: "Dars jadvali", icon: Calendar, color: 'bg-amber-500' },
    { href: '/exams', label: "Imtihonlar", icon: Award, color: 'bg-purple-500' },
    { href: '/courses', label: "Kurslar", icon: BookOpen, color: 'bg-violet-500' },
    { href: '/rooms', label: "Auditoriyalar", icon: DoorOpen, color: 'bg-cyan-500' },
    { href: '/leads', label: "CRM Leadlar", icon: UserPlus, color: 'bg-pink-500' },
    { href: '/reports', label: "Hisobotlar", icon: Shield, color: 'bg-cyan-600' },
    { href: '/announcements', label: "E'lonlar", icon: Megaphone, color: 'bg-orange-500' },
    { href: '/settings', label: "Sozlamalar", icon: Settings, color: 'bg-slate-600' },
  ];

  if (isStudent(userRole)) {
    appModules = [
      { href: '/groups', label: "Guruhlarim", icon: BookOpen, color: 'bg-blue-500' },
      { href: '/schedule', label: "Dars jadvali", icon: Calendar, color: 'bg-indigo-500' },
      { href: '/attendance', label: "Davomatim", icon: ClipboardCheck, color: 'bg-teal-500' },
      { href: '/payments', label: "To'lovlarim", icon: CreditCard, color: 'bg-emerald-500' },
      { href: '/exams', label: "Imtihonlarim", icon: Award, color: 'bg-purple-500' },
      { href: '/homework', label: "Uy vazifalari", icon: FileText, color: 'bg-amber-500' },
      { href: '/announcements', label: "E'lonlar", icon: Megaphone, color: 'bg-rose-500' },
      { href: '/certificates', label: "Sertifikatlar", icon: Star, color: 'bg-cyan-500' },
    ];
  } else if (isTeacher(userRole)) {
    appModules = [
      { href: '/groups', label: "Guruhlarim", icon: BookOpen, color: 'bg-blue-500' },
      { href: '/students', label: "O'quvchilarim", icon: GraduationCap, color: 'bg-indigo-500' },
      { href: '/attendance', label: "Davomat olish", icon: ClipboardCheck, color: 'bg-teal-500' },
      { href: '/schedule', label: "Dars jadvali", icon: Calendar, color: 'bg-emerald-500' },
      { href: '/exams', label: "Imtihonlar", icon: Award, color: 'bg-purple-500' },
      { href: '/homework', label: "Uy vazifalari", icon: FileText, color: 'bg-amber-500' },
      { href: '/announcements', label: "E'lonlar", icon: Megaphone, color: 'bg-rose-500' },
    ];
  }

  return (
    <>
      <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 relative z-30 transition-colors">
        {/* Left: Dynamic Page Title */}
        <div className="flex items-center gap-3">
          {/* Creative Bento App Launcher button (mobile & desktop) */}
          <button
            type="button"
            onClick={() => setShowAppHub(true)}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition text-gray-700 dark:text-gray-300"
            title="Barcha bo'limlar"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate max-w-[200px] sm:max-w-none">
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

      {/* ─── Creative App Hub Modal (Bento Launcher) ────────────────── */}
      {showAppHub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Ilovalar Markazi
                  </h3>
                  <p className="text-[11px] text-gray-400">Markaz xizmatlari va bo&apos;limlari</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAppHub(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* App Grid */}
            <div className="grid grid-cols-3 gap-3">
              {appModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.href}
                    type="button"
                    onClick={() => {
                      setShowAppHub(false);
                      router.push(mod.href);
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-gray-100 dark:border-gray-800 transition active:scale-95 group cursor-pointer"
                  >
                    <div className={`w-11 h-11 rounded-2xl ${mod.color} text-white flex items-center justify-center shadow-md shadow-blue-500/10 mb-1.5 transition-transform group-hover:scale-105`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 text-center leading-tight">
                      {mod.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
