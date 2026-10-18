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

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const getNavSections = (role: string): NavSection[] => {
  const managerSections: NavSection[] = [
    {
      title: 'ASOSIY',
      items: [
        { label: 'Boshqaruv Paneli', href: '/dashboard', icon: 'LayoutDashboard' },
      ],
    },
    {
      title: 'O\'QUV JARAYONI',
      items: [
        { label: 'Guruhlar',         href: '/groups',     icon: 'BookOpen' },
        { label: 'O\'quvchilar',     href: '/students',   icon: 'Users' },
        { label: 'O\'qituvchilar',   href: '/teachers',   icon: 'GraduationCap' },
        { label: 'Davomat & Jadval', href: '/attendance', icon: 'ClipboardCheck' },
      ],
    },
    {
      title: 'MOLIYA',
      items: [
        { label: 'To\'lovlar & Kassa', href: '/payments', icon: 'CreditCard' },
        { label: 'Hisobot & Tahlil',   href: '/reports',  icon: 'BarChart3' },
      ],
    },
    {
      title: 'TIZIM & SOZLAMALAR',
      items: [
        { label: 'Kurslar',            href: '/courses',  icon: 'Library' },
        { label: 'Auditoriyalar',      href: '/rooms',    icon: 'DoorOpen' },
        { label: 'Tizim Sozlamalari',  href: '/settings', icon: 'Settings' },
      ],
    },
  ];

  const teacherSections: NavSection[] = [
    {
      title: 'ASOSIY',
      items: [
        { label: 'Boshqaruv Paneli', href: '/dashboard',  icon: 'LayoutDashboard' },
      ],
    },
    {
      title: 'O\'QUV JARAYONI',
      items: [
        { label: 'Guruhlarim',       href: '/groups',     icon: 'BookOpen' },
        { label: 'O\'quvchilarim',   href: '/students',   icon: 'Users' },
        { label: 'Davomat',          href: '/attendance', icon: 'ClipboardCheck' },
      ],
    },
    {
      title: 'NATIJALAR',
      items: [
        { label: 'Hisobot & Maosh',  href: '/reports',    icon: 'BarChart3' },
      ],
    },
  ];

  const studentSections: NavSection[] = [
    {
      title: 'ASOSIY',
      items: [
        { label: 'Bosh sahifa',      href: '/dashboard',  icon: 'Home' },
      ],
    },
    {
      title: 'O\'QUV JARAYONI',
      items: [
        { label: 'Mening guruhlarim', href: '/groups',    icon: 'BookOpen' },
        { label: 'Davomatim',        href: '/attendance', icon: 'ClipboardCheck' },
      ],
    },
    {
      title: 'MOLIYA',
      items: [
        { label: 'To\'lovlarim',     href: '/payments',   icon: 'CreditCard' },
      ],
    },
  ];

  if (isStudent(role)) return studentSections;
  if (isTeacher(role)) return teacherSections;
  return managerSections;
};

export const getNavItems = (role: string): NavItem[] => {
  return getNavSections(role).flatMap(section => section.items);
};

