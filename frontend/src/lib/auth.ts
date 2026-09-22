import { jwtDecode } from 'jwt-decode';
import { getAccessToken, clearTokens } from './api';

export interface JwtPayload {
  sub: number;       // user id
  role: string;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  avatar: string | null;
  status: number;
  center_id: number | null;
}

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload) return true;
  return payload.exp < Math.floor(Date.now() / 1000);
};

export const getCurrentUserFromToken = (): JwtPayload | null => {
  const token = getAccessToken();
  if (!token) return null;
  if (isTokenExpired(token)) {
    clearTokens();
    return null;
  }
  return decodeToken(token);
};

// ─── Role-based checks ────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER:     'manager',
  ADMIN:       'admin',
  TEACHER:     'teacher',
  STUDENT:     'student',
  PARENT:      'parent',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const canManage = (role: string): boolean =>
  ([ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.ADMIN] as string[]).includes(role);

export const isTeacher = (role: string): boolean => role === ROLES.TEACHER;
export const isStudent = (role: string): boolean => role === ROLES.STUDENT;

// ─── Sidebar navigatsiya (role bo'yicha) ─────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

export const getNavItems = (role: string): NavItem[] => {
  const managerNav: NavItem[] = [
    { label: 'Dashboard',     href: '/dashboard',      icon: 'LayoutDashboard' },
    { label: 'O\'quvchilar',  href: '/students',       icon: 'Users' },
    { label: 'O\'qituvchilar',href: '/teachers',       icon: 'GraduationCap' },
    { label: 'Guruhlar',      href: '/groups',         icon: 'BookOpen' },
    { label: 'Davomat',       href: '/attendance',     icon: 'ClipboardCheck' },
    { label: 'To\'lovlar',    href: '/payments',       icon: 'CreditCard' },
    { label: 'Moliya',        href: '/finance',        icon: 'BarChart3' },
    { label: 'Jadval',        href: '/schedule',       icon: 'Calendar' },
    { label: 'Imtihonlar',    href: '/exams',          icon: 'Award' },
    { label: 'Hisobotlar',    href: '/reports',        icon: 'PieChart' },
    { label: 'E\'lonlar',     href: '/announcements',  icon: 'Megaphone' },
    { label: 'Profil',        href: '/profile',        icon: 'User' },
    { label: 'Sozlamalar',    href: '/settings',       icon: 'Settings' },
  ];

  const teacherNav: NavItem[] = [
    { label: 'Dashboard',     href: '/dashboard',      icon: 'LayoutDashboard' },
    { label: 'Guruhlarim',    href: '/groups',         icon: 'BookOpen' },
    { label: 'O\'quvchilar',  href: '/students',       icon: 'Users' },
    { label: 'Davomat',       href: '/attendance',     icon: 'ClipboardCheck' },
    { label: 'Dars jadvali',  href: '/schedule',       icon: 'Calendar' },
    { label: 'Imtihonlar',    href: '/exams',          icon: 'Award' },
    { label: 'Uy vazifalari', href: '/homework',       icon: 'FileText' },
    { label: 'E\'lonlar',     href: '/announcements',  icon: 'Megaphone' },
    { label: 'Profil',        href: '/profile',        icon: 'User' },
  ];

  const studentNav: NavItem[] = [
    { label: 'Bosh sahifa',   href: '/dashboard',      icon: 'Home' },
    { label: 'Mening guruhlarim', href: '/groups',     icon: 'BookOpen' },
    { label: 'Dars jadvali',  href: '/schedule',       icon: 'Calendar' },
    { label: 'Davomatim',     href: '/attendance',     icon: 'ClipboardCheck' },
    { label: 'To\'lovlarim',  href: '/payments',       icon: 'CreditCard' },
    { label: 'Imtihonlarim',  href: '/exams',          icon: 'Award' },
    { label: 'Uy vazifalari', href: '/homework',       icon: 'FileText' },
    { label: 'E\'lonlar',     href: '/announcements',  icon: 'Megaphone' },
    { label: 'Profil',        href: '/profile',        icon: 'User' },
  ];

  if (isStudent(role)) return studentNav;
  if (isTeacher(role)) return teacherNav;
  return managerNav;
};
