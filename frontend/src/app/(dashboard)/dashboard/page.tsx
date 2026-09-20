'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Users, GraduationCap, BookOpen, CreditCard,
  AlertCircle, TrendingUp, BookMarked, ArrowUpRight, ArrowDownRight,
  Loader2, RefreshCw, DoorOpen
} from 'lucide-react';
import Link from 'next/link';

// Stat card komponenti
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// Mini metric
function MetricBadge({ label, value, trend }: { label: string; value: string; trend: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />}
        {trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-manager'],
    queryFn: async () => {
      const resp = await api.get('/api/dashboard/manager');
      return resp.data;
    },
  });

  const stats = data?.stats || {
    students: 0,
    teachers: 0,
    groups: 0,
    courses: 0,
    rooms: 0,
    todayIncome: '0',
    overdue: 0,
    attendance: 92,
    todayLessons: 0,
  };

  const recentStudents = data?.recentStudents || [];
  const activeGroups = data?.activeGroups || [];

  return (
    <div className="space-y-6">

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Markaz Ko&apos;rsatkichlari</h1>
          <p className="text-sm text-gray-500">Bugungi umumiy holat va statistika</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
          <span>Yangilash</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Bugungi holat */}
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3">📊 Asosiy metrikalar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/students" className="block hover:scale-[1.01] transition-transform">
                <StatCard
                  icon={Users}
                  label="Faol o'quvchilar"
                  value={stats.students}
                  sub="Jami bazadagilar"
                  color="bg-blue-500"
                />
              </Link>
              <Link href="/teachers" className="block hover:scale-[1.01] transition-transform">
                <StatCard
                  icon={GraduationCap}
                  label="O'qituvchilar"
                  value={stats.teachers}
                  sub={`${stats.groups} ta faol guruh`}
                  color="bg-violet-500"
                />
              </Link>
              <Link href="/groups" className="block hover:scale-[1.01] transition-transform">
                <StatCard
                  icon={BookOpen}
                  label="Faol guruhlar"
                  value={stats.groups}
                  sub={`${stats.courses} ta kurs bo'yicha`}
                  color="bg-emerald-500"
                />
              </Link>
              <Link href="/rooms" className="block hover:scale-[1.01] transition-transform">
                <StatCard
                  icon={DoorOpen}
                  label="Auditoriyalar"
                  value={stats.rooms}
                  sub="Mavjud xonalar"
                  color="bg-cyan-500"
                />
              </Link>
            </div>
          </div>

          {/* Ikkinchi qator */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={TrendingUp}
              label="O'rtacha davomat"
              value={`${stats.attendance}%`}
              sub="Barcha guruhlar"
              color="bg-amber-500"
            />
            <StatCard
              icon={CreditCard}
              label="Bugungi tushum"
              value={`${stats.todayIncome} so'm`}
              sub="Rejalashtirilgan to'lovlar"
              color="bg-rose-500"
            />
            <StatCard
              icon={BookMarked}
              label="Bugungi darslar"
              value={`${stats.todayLessons} ta`}
              sub="Dars jadvali bo'yicha"
              color="bg-indigo-500"
            />
          </div>

          {/* Analytics panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* So'nggi o'quvchilar */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">👥 So&apos;nggi o&apos;quvchilar</h3>
                <Link href="/students" className="text-xs text-blue-600 hover:underline font-medium">
                  Barchasi &rarr;
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {recentStudents.map((s: { id: number; name: string; phone: string; email: string }) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.phone}</p>
                      </div>
                    </div>
                    <Link
                      href={`/students/${s.id}`}
                      className="text-xs bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 px-3 py-1 rounded-lg transition font-medium border border-gray-200"
                    >
                      Profil
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Faol guruhlar */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">📚 Faol guruhlar</h3>
                <Link href="/groups" className="text-xs text-blue-600 hover:underline font-medium">
                  Barchasi &rarr;
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {activeGroups.map((g: { id: number; name: string; course_name: string; teacher_name: string; students_count: number; max_students: number }) => (
                  <div key={g.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{g.name}</p>
                      <p className="text-xs text-gray-500">
                        {g.course_name} • {g.teacher_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                        {g.students_count || 0}/{g.max_students} o&apos;quvchi
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
