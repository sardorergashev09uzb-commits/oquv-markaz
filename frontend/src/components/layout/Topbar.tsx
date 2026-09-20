'use client';

import { Bell, Search, Sun, Moon, Check, CheckCheck, Megaphone, Award, CreditCard, AlertCircle, Info, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface TopbarProps {
  title: string;
}

interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean | number;
  created_at: number;
}

export function Topbar({ title }: TopbarProps) {
  const queryClient = useQueryClient();
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
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
    refetchInterval: 30000, // refresh every 30s
  });

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  // Mark all as read
  const readAllMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  // Close dropdown on click outside
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
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 relative z-30">
      {/* Left: Page title */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden w-10" /> {/* hamburger space */}
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-64">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Qidirish..."
            className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder:text-gray-400"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600"
            title="Bildirishnomalar"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">Bildirishnomalar</span>
                  {unreadCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} yangi
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => readAllMutation.mutate()}
                    disabled={readAllMutation.isPending}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium transition"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Barchasi o&apos;qildi
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {items.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    Bildirishnomalar mavjud emas
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
                        className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-gray-50 ${
                          isUnread ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 bg-gray-100 rounded-lg shrink-0">
                          {getTypeIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className={`text-xs font-semibold truncate ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                              {n.title}
                            </h4>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
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

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
        >
          {darkMode
            ? <Sun className="w-5 h-5 text-gray-600" />
            : <Moon className="w-5 h-5 text-gray-600" />
          }
        </button>
      </div>
    </header>
  );
}
