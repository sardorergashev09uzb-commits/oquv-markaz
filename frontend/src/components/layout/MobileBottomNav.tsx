'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  CreditCard,
  User,
  Users,
  Settings,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isStudent, isTeacher } from '@/lib/auth';

interface MobileBottomNavProps {
  role: string;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();

  let items = [
    { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard },
    { href: '/groups', label: 'Guruhlar', icon: BookOpen },
    { href: '/schedule', label: 'Jadval', icon: Calendar },
    { href: '/payments', label: "To'lovlar", icon: CreditCard },
    { href: '/profile', label: 'Profil', icon: User },
  ];

  if (isStudent(role)) {
    items = [
      { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard },
      { href: '/schedule', label: 'Jadval', icon: Calendar },
      { href: '/attendance', label: 'Davomat', icon: ClipboardCheck },
      { href: '/payments', label: "To'lovlar", icon: CreditCard },
      { href: '/profile', label: 'Profil', icon: User },
    ];
  } else if (isTeacher(role)) {
    items = [
      { href: '/dashboard', label: 'Asosiy', icon: LayoutDashboard },
      { href: '/groups', label: 'Guruhlar', icon: Users },
      { href: '/attendance', label: 'Davomat', icon: ClipboardCheck },
      { href: '/schedule', label: 'Jadval', icon: Calendar },
      { href: '/profile', label: 'Profil', icon: User },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 md:hidden shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all duration-150',
                isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-xl transition-all',
                  isActive ? 'bg-blue-50 text-blue-600 scale-105' : 'text-gray-400'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
