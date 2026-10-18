'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Library,
  ClipboardCheck, CreditCard, BarChart3, Calendar, DoorOpen,
  FileText, BookMarked, UserPlus, PieChart, Megaphone, Settings,
  Star, Folder, Home, TrendingUp, Award, Bell, User, ChevronLeft,
  ChevronRight, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNavSections, NavSection, NavItem } from '@/lib/auth';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, GraduationCap, BookOpen, Library,
  ClipboardCheck, CreditCard, BarChart3, Calendar, DoorOpen,
  FileText, BookMarked, UserPlus, PieChart, Megaphone, Settings,
  Star, Folder, Home, TrendingUp, Award, Bell, User,
};

interface SidebarProps {
  role: string;
  userName: string;
  userRole: string;
}

export function Sidebar({ role, userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navSections = getNavSections(role);

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    manager:     'Manager',
    admin:       'Administrator',
    teacher:     'O\'qituvchi',
    student:     'O\'quvchi',
    parent:      'Ota-ona',
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full select-none">
      {/* Logo + collapse */}
      <div className={cn(
        'flex items-center border-b border-gray-800 px-4 py-4',
        collapsed ? 'flex-col gap-2 justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm leading-tight tracking-tight">O&apos;quv Markaz</span>
              <span className="text-[10px] text-gray-400 font-medium">Boshqaruv Tizimi</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition'
          )}
          title={collapsed ? 'Kengaytirish' : 'Yig\'ish'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
        {navSections.map((section: NavSection, sIdx: number) => (
          <div key={section.title || sIdx} className="space-y-1">
            {!collapsed && section.title && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            {collapsed && sIdx > 0 && (
              <div className="my-2 border-t border-gray-800/80 mx-1" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item: NavItem) => {
                const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className={cn(
                      'w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110',
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                    )} />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className={cn(
        'border-t border-gray-800 p-3 bg-gray-950/40',
        collapsed ? 'flex flex-col items-center gap-2' : ''
      )}>
        {collapsed ? (
          <>
            <Link
              href="/profile"
              className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold transition hover:ring-2 hover:ring-blue-400"
              title={`Profil: ${userName}`}
            >
              {userName.charAt(0).toUpperCase()}
            </Link>
            <button
              onClick={() => {
                document.cookie = 'access_token=; path=/; max-age=0';
                document.cookie = 'refresh_token=; path=/; max-age=0';
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition"
              title="Chiqish"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 flex-1 min-w-0 p-1.5 -m-1.5 rounded-lg hover:bg-gray-800/80 transition group"
              title="Profilni ko'rish va sozlash"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover:ring-2 group-hover:ring-blue-400 transition">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white text-xs font-semibold truncate group-hover:text-blue-300 transition">{userName}</p>
                <p className="text-gray-400 text-[11px] truncate">{roleLabels[userRole] ?? userRole}</p>
              </div>
            </Link>
            <button
              onClick={() => {
                document.cookie = 'access_token=; path=/; max-age=0';
                document.cookie = 'refresh_token=; path=/; max-age=0';
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition flex-shrink-0"
              title="Tizimdan chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <aside className={cn(
      'hidden lg:flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-16' : 'w-60'
    )}>
      <SidebarContent />
    </aside>
  );
}

