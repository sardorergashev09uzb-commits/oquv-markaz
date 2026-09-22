'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, ClipboardCheck, CreditCard,
  User, Users, Settings, BookOpen, MoreHorizontal, X,
  GraduationCap, DoorOpen, Megaphone, FileText, Award,
  TrendingUp, UserPlus, LogOut, CheckCircle, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isStudent, isTeacher, canManage } from '@/lib/auth';

interface MobileBottomNavProps {
  role: string;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // 1. Primary 4 tabs for Bottom Bar
  let primaryTabs = [
    { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard },
    { href: '/groups', label: 'Guruhlar', icon: BookOpen },
    { href: '/schedule', label: 'Jadval', icon: Calendar },
    { href: '/payments', label: "To'lovlar", icon: CreditCard },
  ];

  if (isStudent(role)) {
    primaryTabs = [
      { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard },
      { href: '/schedule', label: 'Jadval', icon: Calendar },
      { href: '/attendance', label: 'Davomat', icon: ClipboardCheck },
      { href: '/payments', label: "To'lovlarim", icon: CreditCard },
    ];
  } else if (isTeacher(role)) {
    primaryTabs = [
      { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard },
      { href: '/groups', label: 'Guruhlarim', icon: Users },
      { href: '/attendance', label: 'Davomat', icon: ClipboardCheck },
      { href: '/schedule', label: 'Jadvalim', icon: Calendar },
    ];
  }

  // 2. Secondary links for "Yana" (More) Bottom Sheet (Strict Role Filter)
  interface MoreLink {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }

  let moreLinks: MoreLink[] = [];

  if (isStudent(role)) {
    moreLinks = [
      { href: '/announcements', label: "E'lonlar taxtasi", icon: Megaphone },
      { href: '/certificates', label: 'Sertifikatlar', icon: Award },
      { href: '/homework', label: 'Uy vazifalari', icon: FileText },
      { href: '/exams', label: 'Imtihonlar', icon: CheckCircle },
      { href: '/profile', label: 'Mening profilim', icon: User },
    ];
  } else if (isTeacher(role)) {
    moreLinks = [
      { href: '/students', label: "O'quvchilar ro'yxati", icon: GraduationCap },
      { href: '/announcements', label: "E'lonlar taxtasi", icon: Megaphone },
      { href: '/homework', label: 'Uy vazifalari', icon: FileText },
      { href: '/exams', label: 'Imtihonlar', icon: CheckCircle },
      { href: '/profile', label: 'Mening profilim', icon: User },
    ];
  } else {
    // Admin / Manager / Super Admin
    moreLinks = [
      { href: '/students', label: "O'quvchilar", icon: GraduationCap },
      { href: '/teachers', label: "O'qituvchilar", icon: Users },
      { href: '/courses', label: 'Kurslar', icon: BookOpen },
      { href: '/rooms', label: 'Auditoriyalar', icon: DoorOpen },
      { href: '/announcements', label: "E'lonlar", icon: Megaphone },
      { href: '/attendance', label: 'Davomat nazorati', icon: ClipboardCheck },
      { href: '/leads', label: 'CRM Leadlar', icon: UserPlus, badge: 'Yangi' },
      { href: '/finance', label: 'Moliya & Xarajatlar', icon: TrendingUp },
      { href: '/reports', label: 'Hisobotlar & Analitika', icon: Shield },
      { href: '/settings', label: 'Markaz sozlamalari', icon: Settings },
      { href: '/profile', label: 'Mening profilim', icon: User },
    ];
  }

  const handleLogout = () => {
    document.cookie = 'access_token=; path=/; max-age=0';
    document.cookie = 'refresh_token=; path=/; max-age=0';
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
      {/* ─── Fixed Bottom Navigation Bar ─────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-2 py-1.5 md:hidden shadow-lg transition-colors">
        <div className="flex items-center justify-around">
          {/* Primary 4 Tabs */}
          {primaryTabs.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all duration-150',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-xl transition-all',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 scale-105'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[62px]">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* 5th Tab: "Yana" (More ⋯) Drawer Button */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all duration-150',
              sheetOpen
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-xl transition-all',
                sheetOpen
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Yana</span>
          </button>
        </div>
      </nav>

      {/* ─── "Yana" Bottom Sheet Modal ───────────────────────────────── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setSheetOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-200 dark:border-gray-800 max-h-[80vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle & Header */}
            <div className="p-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Barcha Bo&apos;limlar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Links */}
            <div className="p-4 overflow-y-auto grid grid-cols-3 gap-3">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                const isSelected = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      'flex flex-col items-center text-center p-3 rounded-2xl border transition-all duration-150 relative',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    {link.badge && (
                      <span className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                        {link.badge}
                      </span>
                    )}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 transition',
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-xs'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold leading-tight line-clamp-2">
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Logout Button in Sheet */}
            <div className="p-4 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-sm hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Tizimdan Chiqish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
