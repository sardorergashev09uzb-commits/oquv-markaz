'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Calendar, ClipboardCheck, CreditCard,
  User, Users, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isStudent, isTeacher } from '@/lib/auth';

interface MobileBottomNavProps {
  role: string;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  // 5 Main Tabs for the bottom navigation (Role-based)
  let tabs = [
    { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard },
    { href: '/groups', label: 'Guruhlar', icon: BookOpen },
    { href: '/schedule', label: 'Jadval', icon: Calendar },
    { href: '/payments', label: "To'lovlar", icon: CreditCard },
    { href: '/profile', label: 'Profil', icon: User },
  ];

  if (isStudent(role)) {
    tabs = [
      { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard },
      { href: '/schedule', label: 'Jadval', icon: Calendar },
      { href: '/attendance', label: 'Davomat', icon: ClipboardCheck },
      { href: '/payments', label: "To'lovlar", icon: CreditCard },
      { href: '/profile', label: 'Profil', icon: User },
    ];
  } else if (isTeacher(role)) {
    tabs = [
      { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard },
      { href: '/groups', label: 'Guruhlar', icon: Users },
      { href: '/attendance', label: 'Davomat', icon: ClipboardCheck },
      { href: '/schedule', label: 'Jadval', icon: Calendar },
      { href: '/profile', label: 'Profil', icon: User },
    ];
  }

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 px-3 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)] transition-colors">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(tab.href));

          return (
            <button
              key={tab.href}
              type="button"
              onClick={() => handleNavigate(tab.href)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-2xl transition-all duration-150 active:scale-90 touch-manipulation select-none cursor-pointer',
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-2xl transition-all duration-200',
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                    : 'bg-transparent text-gray-500 dark:text-gray-400'
                )}
              >
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-105')} />
              </div>
              <span className={cn(
                'text-[10px] mt-1 tracking-tight truncate max-w-[62px]',
                isActive ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
