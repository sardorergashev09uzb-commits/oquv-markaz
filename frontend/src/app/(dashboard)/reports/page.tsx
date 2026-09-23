'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BarChart3, TrendingUp, Users, AlertTriangle, Download, Printer,
  DollarSign, CheckCircle2, XCircle, Clock, Calendar, ArrowUpRight,
  ArrowDownRight, Loader2, Award, Phone, ShieldAlert, BookOpen, GraduationCap, Check
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { canManage } from '@/lib/auth';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const label = d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' });
  return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) };
});

export default function ReportsPage() {
  const { isTeacher: isUserTeacher, isStudent: isUserStudent, role: userRole, isLoading: isUserLoading } = useCurrentUser();
  const isManager = canManage(userRole);

  const [activeTab, setActiveTab] = useState<'monthly_group' | 'finance' | 'attendance' | 'risk' | 'teachers'>('monthly_group');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // 0. Groups for Monthly Group Report dropdown
  const { data: groupsData } = useQuery({
    queryKey: ['groups-for-report'],
    queryFn: async () => {
      const res = await api.get('/api/groups');
      return res.data?.items || [];
    },
  });

  useEffect(() => {
    if (!selectedGroupId && groupsData && groupsData.length > 0) {
      setSelectedGroupId(String(groupsData[0].id));
    }
  }, [groupsData, selectedGroupId]);

  // 0b. Monthly Group Comprehensive Summary
  const { data: monthlyGroupData, isLoading: isMonthlyGroupLoading } = useQuery({
    queryKey: ['report-monthly-group', selectedGroupId, selectedMonth],
    queryFn: async () => {
      const res = await api.get('/api/reports/monthly-group-summary', {
        params: {
          group_id: selectedGroupId || undefined,
          month: selectedMonth,
        },
      });
      return res.data;
    },
    enabled: activeTab === 'monthly_group',
  });

  // 1. Overview data
  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['report-overview'],
    queryFn: async () => {
      const res = await api.get('/api/reports/overview');
      return res.data;
    },
    enabled: isManager,
  });

  // 2. Finance data (Faqat rahbar va menejerlar uchun)
  const { data: finance, isLoading: isFinanceLoading } = useQuery({
    queryKey: ['report-finance'],
    queryFn: async () => {
      const res = await api.get('/api/reports/finance');
      return res.data;
    },
    enabled: isManager && activeTab === 'finance',
  });

  // 3. Attendance data
  const { data: attendance, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['report-attendance'],
    queryFn: async () => {
      const res = await api.get('/api/reports/attendance');
      return res.data;
    },
    enabled: activeTab === 'attendance',
  });

  // 4. Risk students data
  const { data: riskData, isLoading: isRiskLoading } = useQuery({
    queryKey: ['report-risk-students'],
    queryFn: async () => {
      const res = await api.get('/api/reports/risk-students');
      return res.data;
    },
    enabled: activeTab === 'risk',
  });

  // 5. Teachers KPI data (Faqat rahbar va menejerlar uchun)
  const { data: teachersData, isLoading: isTeachersLoading } = useQuery({
    queryKey: ['report-teachers'],
    queryFn: async () => {
      const res = await api.get('/api/reports/teachers');
      return res.data;
    },
    enabled: isManager && activeTab === 'teachers',
  });

  // CSV Export utility
  const handleExportCsv = () => {
    let filename = `hisobot_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    let csvContent = '\uFEFF'; // UTF-8 BOM

    if (activeTab === 'monthly_group' && monthlyGroupData) {
      csvContent += `Guruh: "${monthlyGroupData.group?.name || ''}"; Oy: "${selectedMonth}"\n`;
      csvContent += `O'qituvchi: "${monthlyGroupData.group?.teacher_name || ''}"; Kurs: "${monthlyGroupData.group?.course_name || ''}"\n\n`;
      csvContent += 'O\'quvchi;Telefon;Darslar;Davomat (%);O\'rtacha ball;Reja summa;To\'langan;Qarzdorlik;To\'lov holati;Xulosa\n';
      (monthlyGroupData.students || []).forEach((s: any) => {
        csvContent += `"${s.student_name}";"${s.phone}";"${s.present_count}/${s.total_lessons}";${s.attendance_rate}%;${s.average_score !== null ? s.average_score : '—'};${s.plan_amount};${s.paid_amount};${s.debt};"${s.payment_status}";"${s.conclusion}"\n`;
      });
    } else if (activeTab === 'finance' && finance) {
      csvContent += 'Oy;Tushum (so\'m);Xarajat (so\'m);Sof foyda (so\'m)\n';
      finance.monthly_trend.forEach((item: any) => {
        csvContent += `"${item.month}";${item.revenue};${item.expense};${item.profit}\n`;
      });
    } else if (activeTab === 'attendance' && attendance) {
      csvContent += 'Guruh nomi;Kurs;Jami darslar;Qatnashganlar soni;Davomat foizi (%)\n';
      attendance.group_stats.forEach((item: any) => {
        csvContent += `"${item.group_name}";"${item.course_name}";${item.total};${item.present};${item.rate}%\n`;
      });
    } else if (activeTab === 'risk' && riskData) {
      csvContent += 'O\'quvchi;Telefon;Guruh;O\'qituvchi;Davomat (%);Qarzdorlik (so\'m);Xavf darajasi;Sabablari\n';
      riskData.items.forEach((item: any) => {
        csvContent += `"${item.student_name}";"${item.phone}";"${item.group_name}";"${item.teacher_name}";${item.attendance_rate}%;${item.total_debt};"${item.risk_level}";"${item.reasons.join(', ')}"\n`;
      });
    } else if (activeTab === 'teachers' && teachersData) {
      csvContent += 'O\'qituvchi;Telefon;Guruhlar soni;O\'quvchilar soni;O\'rtacha davomat (%);O\'rtacha ball;Oylik maosh (so\'m)\n';
      teachersData.items.forEach((item: any) => {
        csvContent += `"${item.teacher_name}";"${item.phone}";${item.groups_count};${item.students_count};${item.avg_attendance}%;${item.avg_score || '—'};${item.last_salary}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val?: number) => {
    if (val == null) return '0';
    return Number(val).toLocaleString('uz-UZ') + " so'm";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tahlil va Hisobotlar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Moliya, davomat dinamikasi, o&apos;qituvchilar samaradorligi va xavf ostidagi o&apos;quvchilar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-gray-600" />
            CSV Eksport
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Chop etish (PDF)
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isManager ? (
          <>
            {/* Revenue */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                <span>Oylik Tushum</span>
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {isOverviewLoading ? '...' : formatCurrency(overview?.month_revenue)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <span>Xarajat:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(overview?.month_expense)}</span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                <span>Sof Foyda (Shu oy)</span>
                <span className={`p-1.5 rounded-lg ${
                  (overview?.month_net_profit || 0) >= 0 ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className={`text-2xl font-bold mt-2 ${
                (overview?.month_net_profit || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {isOverviewLoading ? '...' : formatCurrency(overview?.month_net_profit)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tushumdan barcha xarajatlar chegirilgan
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                <span>Markaz Davomati</span>
                <span className="p-1.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {isOverviewLoading ? '...' : `${overview?.avg_attendance_rate || 0}%`}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                Barcha guruhlar bo&apos;yicha o&apos;rtacha
              </div>
            </div>

            {/* Risk Students */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                <span>Xavf Ostidagi O&apos;quvchilar</span>
                <span className="p-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {isOverviewLoading ? '...' : `${overview?.risk_students_count || 0} nafar`}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ketib qolish yoki qarzdorlik xavfi
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Teacher: Mening Guruhlarim */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                <span>Mening Guruhlarim</span>
                <span className="p-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {groupsData?.length || 0} ta
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Siz biriktirilgan faol guruhlar
              </div>
            </div>

            {/* Teacher: O'tilgan Darslar */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                <span>Shu Oydagi Darslar</span>
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {monthlyGroupData?.stats ? `${monthlyGroupData.stats.conducted_lessons} / ${monthlyGroupData.stats.planned_lessons || monthlyGroupData.stats.total_lessons} ta` : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                O&apos;tilgan vs rejalashtirilgan
              </div>
            </div>

            {/* Teacher: Guruh Davomati */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                <span>Guruh Davomati</span>
                <span className="p-1.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {monthlyGroupData?.stats ? `${monthlyGroupData.stats.overall_attendance_rate}%` : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Tanlangan guruh oylik ko&apos;rsatkichi
              </div>
            </div>

            {/* Teacher: O'rtacha Ball */}
            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase">
                <span>O&apos;rtacha Ball</span>
                <span className="p-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {monthlyGroupData?.stats?.overall_average_score !== null && monthlyGroupData?.stats?.overall_average_score !== undefined
                  ? `${monthlyGroupData.stats.overall_average_score} ball`
                  : '—'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Oylik imtihon va dars ballari
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 print:hidden overflow-x-auto">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('monthly_group')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'monthly_group'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Oylik Guruh Hisoboti
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('finance')}
              className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'finance'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Moliya & Balans
            </button>
          )}
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Davomat Dinamikasi
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap relative ${
              activeTab === 'risk'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Xavf Ostidagi O&apos;quvchilar
            {(overview?.risk_students_count || 0) > 0 && (
              <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] px-2 py-0.5 rounded-full font-bold">
                {overview.risk_students_count}
              </span>
            )}
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('teachers')}
              className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'teachers'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Award className="w-4 h-4" />
              O&apos;qituvchilar KPI
            </button>
          )}
        </nav>
      </div>

      {/* TAB 0: Oylik Guruh Hisoboti */}
      {activeTab === 'monthly_group' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {/* Group Select */}
              <div className="w-full sm:w-64">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Guruhni tanlang:</label>
                <CustomSelect
                  value={selectedGroupId}
                  onChange={(val) => setSelectedGroupId(val)}
                  placeholder="Guruhni tanlang..."
                  searchable={(groupsData || []).length > 5}
                  options={(groupsData || []).map((g: any) => ({
                    value: String(g.id),
                    label: g.name,
                    subLabel: g.course_name,
                  }))}
                />
              </div>

              {/* Month Select */}
              <div className="w-full sm:w-56">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Hisobot oyi:</label>
                <CustomSelect
                  value={selectedMonth}
                  onChange={(val) => setSelectedMonth(val)}
                  options={MONTH_OPTIONS}
                  placeholder="Oyni tanlang..."
                />
              </div>
            </div>

            {monthlyGroupData?.group && (
              <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400 block font-medium">Biriktirilgan o&apos;qituvchi:</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{monthlyGroupData.group.teacher_name}</span>
                <span className="text-xs text-blue-600 dark:text-blue-400 block font-medium mt-0.5">{monthlyGroupData.group.course_name}</span>
              </div>
            )}
          </div>

          {isMonthlyGroupLoading ? (
            <div className="p-16 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              Guruh bo&apos;yicha oylik hisobot hisoblanmoqda...
            </div>
          ) : !monthlyGroupData?.group ? (
            <div className="p-12 text-center text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              Guruh tanlanmagan yoki ma&apos;lumot topilmadi.
            </div>
          ) : (
            <>
              {/* Group Monthly Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <span className="text-xs text-gray-400 font-medium uppercase">O&apos;quvchilar</span>
                  <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                    {monthlyGroupData.stats.total_students} nafar
                  </div>
                  <span className="text-[11px] text-gray-400 block mt-0.5">Faol qatnashuvchilar</span>
                </div>

                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <span className="text-xs text-gray-400 font-medium uppercase">O&apos;tilgan Darslar</span>
                  <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                    {monthlyGroupData.stats.conducted_lessons ?? monthlyGroupData.stats.total_lessons} / {monthlyGroupData.stats.planned_lessons ?? monthlyGroupData.stats.total_lessons} ta
                  </div>
                  <span className="text-[11px] text-gray-400 block mt-0.5">O&apos;tilgan vs reja</span>
                </div>

                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <span className="text-xs text-gray-400 font-medium uppercase">Guruh Davomati</span>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {monthlyGroupData.stats.overall_attendance_rate}%
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                    {monthlyGroupData.stats.overall_attendance_rate >= 80 ? "Yuqori davomat" : "Nazorat talab"}
                  </span>
                </div>

                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <span className="text-xs text-gray-400 font-medium uppercase">O&apos;rtacha Ball</span>
                  <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                    {monthlyGroupData.stats.overall_average_score !== null ? `${monthlyGroupData.stats.overall_average_score}` : '—'}
                  </div>
                  <span className="text-[11px] text-gray-400 block mt-0.5">Muntazam test/baholar</span>
                </div>

                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <span className="text-xs text-gray-400 font-medium uppercase">Qarzdorlik</span>
                  <div className={`text-2xl font-extrabold mt-1 ${monthlyGroupData.stats.total_debt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatCurrency(monthlyGroupData.stats.total_debt)}
                  </div>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Tushum: {formatCurrency(monthlyGroupData.stats.total_collected)}
                  </span>
                </div>
              </div>

              {/* Detailed Students Table & Mobile Cards */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {monthlyGroupData.group.name} — Oylik Natijalar ({selectedMonth})
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Har bir o&apos;quvchining davomati, oylik baholari va to&apos;lov holati
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                    {monthlyGroupData.students.length} ta o&apos;quvchi
                  </span>
                </div>

                {monthlyGroupData.students.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    Ushbu guruhda o&apos;quvchilar ro&apos;yxati mavjud emas.
                  </div>
                ) : (
                  <>
                    {/* MOBILE VIEW (sm:hidden): Sensorli kartochkalar */}
                    <div className="sm:hidden p-4 space-y-3">
                      {monthlyGroupData.students.map((student: any) => (
                        <div
                          key={student.student_id}
                          className="p-4 bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">{student.student_name}</p>
                              <p className="text-xs text-gray-400">{student.phone}</p>
                            </div>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              student.conclusion === "A'lochi" || student.conclusion === "A'lo"
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : student.conclusion === "Yaxshi"
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            }`}>
                              {student.conclusion}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100 dark:border-gray-800">
                            <div>
                              <span className="text-gray-400 block text-[11px]">Davomat:</span>
                              <span className="font-bold text-gray-800 dark:text-gray-200">
                                {student.present_count} / {student.conducted_lessons || student.total_lessons} ta ({student.attendance_rate}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[11px]">O&apos;rtacha baho:</span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {student.average_score !== null ? `${student.average_score} ball` : '—'}
                              </span>
                            </div>
                          </div>

                          {isManager ? (
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
                              <div>
                                <span className="text-gray-400 block text-[11px]">To&apos;lov holati:</span>
                                <span className={`font-semibold ${student.debt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {student.debt > 0 ? `${formatCurrency(student.debt)} qarz` : "To'langan"}
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400">
                                To&apos;langan: {formatCurrency(student.paid_amount)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
                              <span className="text-gray-400 text-[11px]">To&apos;lov:</span>
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                student.debt > 0
                                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                              }`}>
                                {student.debt > 0 ? 'Qarzdorlik bor' : "To'langan"}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* DESKTOP VIEW (hidden sm:block): Jadval */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                          <tr>
                            <th className="px-4 py-3.5">#</th>
                            <th className="px-4 py-3.5">O&apos;quvchi</th>
                            <th className="px-4 py-3.5 text-center">Davomat (Darslar)</th>
                            <th className="px-4 py-3.5 text-center">Davomat %</th>
                            <th className="px-4 py-3.5 text-center">Oylik Baho</th>
                            {isManager ? (
                              <>
                                <th className="px-4 py-3.5">Kurs To&apos;lovi</th>
                                <th className="px-4 py-3.5">Qarz</th>
                              </>
                            ) : (
                              <th className="px-4 py-3.5 text-center">To&apos;lov holati</th>
                            )}
                            <th className="px-4 py-3.5 text-center">Xulosa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {monthlyGroupData.students.map((student: any, idx: number) => {
                            return (
                              <tr key={student.student_id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition">
                                <td className="px-4 py-3.5 text-xs text-gray-400 font-semibold">{idx + 1}</td>
                                <td className="px-4 py-3.5">
                                  <p className="font-bold text-gray-900 dark:text-white">{student.student_name}</p>
                                  <p className="text-xs text-gray-400">{student.phone}</p>
                                </td>
                                <td className="px-4 py-3.5 text-center font-semibold text-gray-700 dark:text-gray-300">
                                  {student.present_count} / {student.conducted_lessons || student.total_lessons}
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                                    student.attendance_rate >= 85
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                      : student.attendance_rate >= 70
                                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                  }`}>
                                    {student.attendance_rate}%
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-center font-bold">
                                  {student.average_score !== null ? (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                      student.average_score >= 80
                                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                                        : student.average_score >= 60
                                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                    }`}>
                                      {student.average_score} ball
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                                  )}
                                </td>
                                {isManager ? (
                                  <>
                                    <td className="px-4 py-3.5 text-xs">
                                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                                        {formatCurrency(student.paid_amount)}
                                      </p>
                                      <span className="text-[11px] text-gray-400">
                                        Reja: {formatCurrency(student.plan_amount)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3.5 text-xs font-bold">
                                      {student.debt > 0 ? (
                                        <span className="text-rose-600 dark:text-rose-400">
                                          {formatCurrency(student.debt)}
                                        </span>
                                      ) : (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                          <Check className="w-3.5 h-3.5" />
                                          Qarz yo&apos;q
                                        </span>
                                      )}
                                    </td>
                                  </>
                                ) : (
                                  <td className="px-4 py-3.5 text-center text-xs">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                      student.debt > 0
                                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                    }`}>
                                      {student.debt > 0 ? 'Qarz bor' : "To'langan"}
                                    </span>
                                  </td>
                                )}
                                <td className="px-4 py-3.5 text-center">
                                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                                    student.conclusion === "A'lochi" || student.conclusion === "A'lo"
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                      : student.conclusion === "Yaxshi"
                                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                  }`}>
                                    {student.conclusion}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 1: Finance */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {isFinanceLoading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center bg-white rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              Moliyaviy ma&apos;lumotlar yuklanmoqda...
            </div>
          ) : (
            <>
              {/* Collection Progress */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">To&apos;lovlarni Undirish Ko&apos;rsatkichi</h3>
                    <p className="text-xs text-gray-500">Jami kutilayotgan reja bo&apos;yicha undirilgan summa nisbati</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-blue-600">{finance?.collection_rate}%</span>
                    <span className="text-xs text-gray-400 block">undirildi</span>
                  </div>
                </div>

                <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden flex">
                  <div
                    className="bg-blue-600 h-full transition-all duration-500"
                    style={{ width: `${finance?.collection_rate || 0}%` }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 text-center">
                  <div>
                    <span className="text-xs text-gray-400 font-medium uppercase">Rejalashtirilgan Summa</span>
                    <div className="text-sm font-bold text-gray-800 mt-0.5">{formatCurrency(finance?.total_plan_amount)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-medium uppercase">Haqiqatda Undirildi</span>
                    <div className="text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(finance?.total_collected)}</div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-medium uppercase">Kutilayotgan Qarzdorlik</span>
                    <div className="text-sm font-bold text-rose-600 mt-0.5">{formatCurrency(finance?.pending_debt)}</div>
                  </div>
                </div>
              </div>

              {/* Monthly Trend Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50/80 border-b border-gray-200 font-bold text-sm text-gray-800">
                  Oxirgi 6 Oylik Moliyaviy Dinamika
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase bg-gray-50/50">
                        <th className="py-3 px-4">Davr (Oy)</th>
                        <th className="py-3 px-4 text-right">Tushum</th>
                        <th className="py-3 px-4 text-right">Xarajat</th>
                        <th className="py-3 px-4 text-right">Sof Foyda</th>
                        <th className="py-3 px-4 text-center">Holat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {finance?.monthly_trend?.map((m: any) => (
                        <tr key={m.month} className="hover:bg-gray-50/60">
                          <td className="py-3.5 px-4 font-semibold text-gray-900">{m.month}</td>
                          <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                            +{formatCurrency(m.revenue)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                            -{formatCurrency(m.expense)}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-bold ${
                            m.profit >= 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(m.profit)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {m.profit >= 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <ArrowUpRight className="w-3.5 h-3.5" /> Foydali
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                                <ArrowDownRight className="w-3.5 h-3.5" /> Zarar
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Methods & Expense Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Methods */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-sm text-gray-900 mb-3">To&apos;lov Usullari Taqsimoti</h3>
                  <div className="space-y-3">
                    {finance?.payment_methods?.map((pm: any) => (
                      <div key={pm.method} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="capitalize text-gray-700">{pm.method} ({pm.count} ta to&apos;lov)</span>
                          <span className="font-bold text-gray-900">{formatCurrency(pm.total)} ({pm.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${pm.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expense Categories */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-sm text-gray-900 mb-3">Xarajatlar Toifalari</h3>
                  <div className="space-y-3">
                    {finance?.expenses_by_category?.length === 0 ? (
                      <div className="text-gray-400 text-xs py-4 text-center">Xarajatlar mavjud emas</div>
                    ) : (
                      finance?.expenses_by_category?.map((ec: any) => (
                        <div key={ec.category} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                          <div>
                            <span className="text-xs font-bold text-gray-800 capitalize">{ec.category}</span>
                            <span className="text-[11px] text-gray-400 block">{ec.count} ta tranzaksiya</span>
                          </div>
                          <span className="font-bold text-xs text-rose-600">
                            {formatCurrency(ec.total)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {isAttendanceLoading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center bg-white rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              Davomat tahlili yuklanmoqda...
            </div>
          ) : (
            <>
              {/* Overall status breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                  <div className="text-xs font-medium text-gray-500 uppercase">Kelganlar (Present)</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{attendance?.overall?.present || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                  <div className="text-xs font-medium text-gray-500 uppercase">Kelmaganlar (Absent)</div>
                  <div className="text-2xl font-bold text-rose-600 mt-1">{attendance?.overall?.absent || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                  <div className="text-xs font-medium text-gray-500 uppercase">Kechikkanlar (Late)</div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">{attendance?.overall?.late || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                  <div className="text-xs font-medium text-gray-500 uppercase">Sabablilar (Excused)</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{attendance?.overall?.excused || 0}</div>
                </div>
              </div>

              {/* Group Attendance Ranking */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50/80 border-b border-gray-200 font-bold text-sm text-gray-800">
                  Guruhlar Davomat Reytingi
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase bg-gray-50/50">
                        <th className="py-3 px-4">Guruh</th>
                        <th className="py-3 px-4">Kurs</th>
                        <th className="py-3 px-4 text-center">Davomat Foizi</th>
                        <th className="py-3 px-4 text-right">Qatnashish (Kelgan/Jami)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attendance?.group_stats?.map((g: any) => (
                        <tr key={g.group_id} className="hover:bg-gray-50/60">
                          <td className="py-3.5 px-4 font-semibold text-gray-900">{g.group_name}</td>
                          <td className="py-3.5 px-4 text-gray-600">{g.course_name}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3 justify-center">
                              <div className="w-32 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    g.rate >= 85
                                      ? 'bg-emerald-500'
                                      : g.rate >= 70
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${g.rate}%` }}
                                />
                              </div>
                              <span className="font-bold text-xs w-10 text-right">{g.rate}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                            {g.present} / {g.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: Risk Students (Churn Risk) */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-900">Xavf Ostidagi O&apos;quvchilar Monitoringi</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Tizim davomati 75% dan past bo&apos;lgan, ketma-ket dars qoldirgan yoki 15 kundan ortiq to&apos;lov muddati o&apos;tgan o&apos;quvchilarni avtomatik tarzda aniqlaydi. Ushbu o&apos;quvchilar bilan zudlik bilan bog&apos;lanish tavsiya etiladi.
              </p>
            </div>
          </div>

          {isRiskLoading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center bg-white rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              Tahlil qilinmoqda...
            </div>
          ) : riskData?.items?.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-gray-800 text-base">Ajoyib! Xavf ostidagi o&apos;quvchilar yo&apos;q</h3>
              <p className="text-xs text-gray-500 mt-1">Barcha o&apos;quvchilarning davomat va to&apos;lov ko&apos;rsatkichlari me&apos;yorda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase bg-gray-50/70">
                      <th className="py-3 px-4">O&apos;quvchi</th>
                      <th className="py-3 px-4">Guruh & O&apos;qituvchi</th>
                      <th className="py-3 px-4 text-center">Davomat</th>
                      <th className="py-3 px-4 text-right">Qarzdorlik</th>
                      <th className="py-3 px-4">Aniqlangan Sabablar</th>
                      <th className="py-3 px-4 text-center">Xavf Darajasi</th>
                      <th className="py-3 px-4 text-right">Tezkor Bog&apos;lanish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {riskData?.items?.map((st: any) => (
                      <tr key={st.student_id} className="hover:bg-gray-50/70 transition">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block">{st.student_name}</span>
                          <span className="text-xs font-mono text-gray-400">{st.phone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-gray-800 block">{st.group_name}</span>
                          <span className="text-xs text-gray-400 block">{st.teacher_name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            st.attendance_rate >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : st.attendance_rate >= 70
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {st.attendance_rate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                          {st.total_debt > 0 ? formatCurrency(st.total_debt) : '—'}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {st.reasons.map((r: string, idx: number) => (
                              <span key={idx} className="bg-red-50 text-red-700 text-[11px] px-2 py-0.5 rounded border border-red-200">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            st.risk_level === 'high'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}>
                            {st.risk_level === 'high' ? 'Yuqori' : "O'rta"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={`tel:${st.phone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            Qo&apos;ng&apos;iroq
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Teachers KPI */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          {isTeachersLoading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center bg-white rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              O&apos;qituvchilar ko&apos;rsatkichlari yuklanmoqda...
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50/80 border-b border-gray-200 font-bold text-sm text-gray-800">
                O&apos;qituvchilar Samaradorligi va KPI Ko&apos;rsatkichlari
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase bg-gray-50/50">
                      <th className="py-3 px-4">O&apos;qituvchi</th>
                      <th className="py-3 px-4 text-center">Guruhlar soni</th>
                      <th className="py-3 px-4 text-center">O&apos;quvchilar soni</th>
                      <th className="py-3 px-4 text-center">O&apos;rtacha Davomat</th>
                      <th className="py-3 px-4 text-center">O&apos;rtacha Ball</th>
                      <th className="py-3 px-4 text-right">Oxirgi Oylik Maoshi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teachersData?.items?.map((t: any) => (
                      <tr key={t.teacher_id} className="hover:bg-gray-50/60">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block">{t.teacher_name}</span>
                          <span className="text-xs text-gray-400">{t.phone}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-gray-800">
                          {t.groups_count} ta guruh
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-blue-600">
                          {t.students_count} nafar
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                            {t.avg_attendance}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {t.avg_score != null ? (
                            <span className="font-bold text-emerald-600">{t.avg_score} ball</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                          {t.last_salary > 0 ? formatCurrency(t.last_salary) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
