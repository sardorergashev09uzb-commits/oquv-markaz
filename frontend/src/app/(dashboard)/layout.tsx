import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { cookies } from 'next/headers';

// Server componentdan token o'qib, user ma'lumotini olamiz
async function getUserFromCookie(): Promise<{ role: string; name: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );
    return { role: payload.role, name: payload.name };
  } catch {
    return null;
  }
}

// Page title ni pathname dan chiqarish
function getPageTitle(pathname: string): string {
  const titleMap: Record<string, string> = {
    '/dashboard':      'Dashboard',
    '/students':       'O\'quvchilar',
    '/teachers':       'O\'qituvchilar',
    '/groups':         'Guruhlar',
    '/courses':        'Kurslar',
    '/attendance':     'Davomat',
    '/payments':       'To\'lovlar',
    '/finance':        'Moliya',
    '/schedule':       'Jadval',
    '/rooms':          'Xonalar',
    '/exams':          'Imtihonlar',
    '/homework':       'Uy vazifalari',
    '/leads':          'Leadlar',
    '/reports':        'Hisobotlar',
    '/announcements':  'E\'lonlar',
    '/settings':       'Sozlamalar',
    '/my-groups':      'Guruhlarim',
    '/my-students':    'O\'quvchilarim',
    '/grades':         'Baholar',
    '/materials':      'Materiallar',
    '/messages':       'Xabarlar',
    '/my-courses':     'Kurslarim',
    '/progress':       'Progress',
    '/certificates':   'Sertifikatlar',
    '/notifications':  'Bildirishnomalar',
    '/profile':        'Profil',
  };

  const base = '/' + pathname.split('/')[1];
  return titleMap[base] || 'Dashboard';
}

import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromCookie();
  const role = user?.role || 'student';
  const name = user?.name || 'Foydalanuvchi';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar role={role} userName={name} userRole={role} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="Dashboard" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation for Smartphones */}
      <MobileBottomNav role={role} />
    </div>
  );
}
