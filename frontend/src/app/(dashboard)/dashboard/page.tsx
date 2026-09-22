'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Users, GraduationCap, BookOpen, CreditCard,
  TrendingUp, BookMarked, ArrowUpRight, ArrowDownRight,
  Loader2, RefreshCw, DoorOpen, Calendar, ClipboardCheck,
  Megaphone, Clock, CheckCircle2, ChevronRight, AlertCircle, Award
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUserFromToken, isStudent, isTeacher, canManage } from '@/lib/auth';

// ─── Stat card komponenti ──────────────────────────────────────────────────
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

// ─── STUDENT DASHBOARD ─────────────────────────────────────────────────────
function StudentDashboard({ userName }: { userName: string }) {
  // DB dan student ma'lumotlarini yuklash
  const { data: studentData, isLoading: isStudentLoading } = useQuery({
    queryKey: ['dashboard-student'],
    queryFn: async () => {
      const resp = await api.get('/api/dashboard/student');
      return resp.data;
    },
  });

  const groups = studentData?.groups || [];
  const announcements = studentData?.announcements || [];
  const attendanceRate = studentData?.attendance_rate ?? 100;
  const hasUnpaid = studentData?.has_unpaid ?? false;
  const paymentStatus = hasUnpaid ? "Qarzdorlik mavjud" : "To'langan";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            O&apos;quvchi Kabineti
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Xush kelibsiz, {userName || "O'quvchi"}! 👋
          </h1>
          <p className="text-blue-100 text-sm sm:text-base mt-2 leading-relaxed">
            Darslaringiz, dars jadvali, davomat ko&apos;rsatkichlaringiz va to&apos;lov holatini shu yerdan kuzatib boring.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <GraduationCap className="w-72 h-72 text-white" />
        </div>
      </div>

      {/* Asosiy metrikalar */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">🎯 Shaxsiy ko&apos;rsatkichlar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/groups" className="block hover:scale-[1.01] transition-transform">
            <StatCard
              icon={BookOpen}
              label="Mening guruhlarim"
              value={`${groups.length} ta`}
              sub="A'zo bo'lingan faol guruhlar"
              color="bg-blue-500"
            />
          </Link>
          <Link href="/attendance" className="block hover:scale-[1.01] transition-transform">
            <StatCard
              icon={ClipboardCheck}
              label="Davomatim"
              value={`${attendanceRate}%`}
              sub={attendanceRate >= 85 ? "A'lo ko'rsatkich" : "Nazorat zarur"}
              color="bg-emerald-500"
            />
          </Link>
          <Link href="/payments" className="block hover:scale-[1.01] transition-transform">
            <StatCard
              icon={CreditCard}
              label="To'lov holatim"
              value={paymentStatus}
              sub={hasUnpaid ? "To'lov muddati yaqinlashmoqda" : "To'lovlar to'liq amalga oshirilgan"}
              color={hasUnpaid ? "bg-rose-500" : "bg-purple-500"}
            />
          </Link>
          <Link href="/announcements" className="block hover:scale-[1.01] transition-transform">
            <StatCard
              icon={Megaphone}
              label="E'lonlar"
              value={`${announcements.length} ta`}
              sub="Markaz yangiliklari"
              color="bg-amber-500"
            />
          </Link>
        </div>
      </div>

      {/* Ikki ustunli blok */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Guruhlar va Dars jadvali (2 ustun) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Mening guruhlarim va Dars jadvali</h3>
            </div>
            <Link href="/groups" className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1">
              Barchasi <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isStudentLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : groups.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              Siz hali hech qaysi guruhga biriktirilmadingiz. Markaz ma&apos;muriyatiga murojaat qiling.
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g: any) => (
                <div
                  key={g.id}
                  className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-blue-50/50 hover:border-blue-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-base">{g.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                        {g.course_name || 'Kurs'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                        Ustoz: <strong className="text-gray-700 font-medium">{g.teacher_name || 'Biriktirilmagan'}</strong>
                      </span>
                      {g.room_name && (
                        <span className="flex items-center gap-1">
                          <DoorOpen className="w-3.5 h-3.5 text-gray-400" />
                          Xona: <strong className="text-gray-700 font-medium">{g.room_name}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left sm:text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        {g.schedule?.[0]?.day ? `${g.schedule[0].day}: ${g.schedule[0].time}` : 'Dars jadvali mavjud'}
                      </span>
                    </div>
                    <Link
                      href={`/attendance`}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-lg text-xs font-medium text-gray-700 transition"
                    >
                      Davomat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* E'lonlar va Tezkor Havolalar (1 ustun) */}
        <div className="space-y-6">

          {/* So'nggi e'lonlar */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-gray-900">Markaz e&apos;lonlari</h3>
              </div>
              <Link href="/announcements" className="text-xs text-blue-600 hover:underline font-semibold">
                Barchasi &rarr;
              </Link>
            </div>

            {announcements.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Hozircha yangi e&apos;lonlar yo&apos;q.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((a: any) => (
                  <div key={a.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-amber-200 transition">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* To'lov eslatmasi */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>To&apos;lov holati a&apos;lo</span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Joriy oy uchun barcha o&apos;quv to&apos;lovlari muvaffaqiyatli qabul qilingan. Qarzdorlik mavjud emas!
            </p>
            <Link
              href="/payments"
              className="inline-block mt-3 text-xs font-semibold text-emerald-800 hover:text-emerald-900 underline"
            >
              To&apos;lovlar tarixini ko&apos;rish &rarr;
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}

// ─── TEACHER DASHBOARD ─────────────────────────────────────────────────────
function TeacherDashboard({ userName }: { userName: string }) {
  const { data: teacherData, isLoading } = useQuery({
    queryKey: ['dashboard-teacher'],
    queryFn: async () => {
      const resp = await api.get('/api/dashboard/teacher');
      return resp.data;
    },
  });

  const groups = teacherData?.groups || [];
  const totalStudents = teacherData?.students_count || 0;
  const todayLessons = teacherData?.today_lessons || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
          O&apos;qituvchi Kabineti
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Assalomu alaykum, {userName || "Ustoz"}! 🎓
        </h1>
        <p className="text-purple-100 text-sm sm:text-base mt-2">
          Bugungi darslaringiz, guruhlaringiz va o&apos;quvchilar davomatini shu yerdan boshqaring.
        </p>
      </div>

      {/* Metrikalar */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">📊 Asosiy ko&apos;rsatkichlar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/groups" className="block hover:scale-[1.01] transition-transform">
            <StatCard
              icon={BookOpen}
              label="Biriktirilgan guruhlar"
              value={`${groups.length} ta`}
              sub="Faol guruhlaringiz"
              color="bg-purple-500"
            />
          </Link>
          <Link href="/students" className="block hover:scale-[1.01] transition-transform">
            <StatCard
              icon={Users}
              label="Jami o'quvchilar"
              value={`${totalStudents} nafar`}
              sub="Guruhlaringiz a'zolari"
              color="bg-blue-500"
            />
          </Link>
          <Link href="/schedule" className="block hover:scale-[1.01] transition-transform">
            <StatCard
              icon={Calendar}
              label="Bugungi darslar"
              value={`${todayLessons} ta`}
              sub="Dars jadvali bo'yicha"
              color="bg-emerald-500"
            />
          </Link>
          <Link href="/attendance" className="block hover:scale-[1.01] transition-transform">
            <StatCard
              icon={ClipboardCheck}
              label="Davomat nazorati"
              value="Faol"
              sub="Darslar bo'yicha"
              color="bg-amber-500"
            />
          </Link>
        </div>
      </div>

      {/* Guruhlar ro'yxati */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">📚 Mening guruhlarim</h3>
          <Link href="/groups" className="text-xs text-blue-600 hover:underline font-semibold">
            Barchasi &rarr;
          </Link>
        </div>

        {isLoading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : groups.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">Sizga hali guruhlar biriktirilmagan.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g: any) => (
              <div key={g.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/70 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{g.name}</h4>
                    <p className="text-xs text-gray-500">{g.course_name}</p>
                  </div>
                  <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                    {g.students_count || 0} o&apos;quvchi
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                  <span className="text-gray-500">{g.room_name || 'Xona yo\'q'}</span>
                  <Link
                    href={`/attendance`}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                  >
                    Davomat olish
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MANAGER / ADMIN DASHBOARD ─────────────────────────────────────────────
function ManagerDashboard() {
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

// ─── ASOSIY DASHBOARD ROUTER ───────────────────────────────────────────────
export default function DashboardPage() {
  const [role, setRole] = useState<string>('student');
  const [userName, setUserName] = useState<string>('');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) {
      setRole(user.role);
      setUserName(user.name);
    }
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // O'quvchi uchun
  if (isStudent(role)) {
    return <StudentDashboard userName={userName} />;
  }

  // O'qituvchi uchun
  if (isTeacher(role)) {
    return <TeacherDashboard userName={userName} />;
  }

  // Super Admin / Manager / Admin uchun
  return <ManagerDashboard />;
}
