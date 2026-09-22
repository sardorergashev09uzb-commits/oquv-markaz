'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Library,
  ClipboardCheck, CreditCard, BarChart3, Calendar, DoorOpen,
  FileText, BookMarked, UserPlus, PieChart, Megaphone, Settings,
  Star, Folder, Home, TrendingUp, Award, Bell, User, ChevronLeft,
  ChevronRight, Menu, X, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNavItems, NavItem } from '@/lib/auth';

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
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNavItems(role);

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    manager:     'Manager',
    admin:       'Administrator',
    teacher:     'O\'qituvchi',
    student:     'O\'quvchi',
    parent:      'Ota-ona',
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + collapse */}
      <div className={cn(
        'flex items-center border-b border-gray-800 px-4 py-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">O&apos;quv Markaz</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item: NavItem) => {
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={cn(
        'border-t border-gray-800 p-4',
        collapsed ? 'flex justify-center' : ''
      )}>
        {collapsed ? (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {userName.charAt(0)}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-gray-400 text-xs">{roleLabels[userRole] ?? userRole}</p>
            </div>
            <button
              onClick={() => {
                // Logout
                document.cookie = 'access_token=; path=/; max-age=0';
                document.cookie = 'refresh_token=; path=/; max-age=0';
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="text-gray-400 hover:text-red-400 transition"
              title="Chiqish"
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
      'hidden lg:flex flex-col bg-gray-900 transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <SidebarContent />
    </aside>
  );
}
