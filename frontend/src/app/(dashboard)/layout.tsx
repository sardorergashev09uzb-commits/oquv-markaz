import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromCookie();
  const role = user?.role || 'student';
  const name = user?.name || 'Foydalanuvchi';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Sidebar for Desktop & Tablets */}
      <Sidebar role={role} userName={name} userRole={role} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6 bg-gray-50 dark:bg-gray-950 transition-colors">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation for Smartphones */}
      <MobileBottomNav role={role} />
    </div>
  );
}
