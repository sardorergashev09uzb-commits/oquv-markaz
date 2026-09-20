'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BarChart3, TrendingUp, Users, AlertTriangle, Download, Printer,
  DollarSign, CheckCircle2, XCircle, Clock, Calendar, ArrowUpRight,
  ArrowDownRight, Loader2, Award, Phone, ShieldAlert, BookOpen
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'finance' | 'attendance' | 'risk' | 'teachers'>('finance');

  // 1. Overview data
  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['report-overview'],
    queryFn: async () => {
      const res = await api.get('/api/reports/overview');
      return res.data;
    },
  });

  // 2. Finance data
  const { data: finance, isLoading: isFinanceLoading } = useQuery({
    queryKey: ['report-finance'],
    queryFn: async () => {
      const res = await api.get('/api/reports/finance');
      return res.data;
    },
    enabled: activeTab === 'finance',
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

  // 5. Teachers KPI data
  const { data: teachersData, isLoading: isTeachersLoading } = useQuery({
    queryKey: ['report-teachers'],
    queryFn: async () => {
      const res = await api.get('/api/reports/teachers');
      return res.data;
    },
    enabled: activeTab === 'teachers',
  });

  // CSV Export utility
  const handleExportCsv = () => {
    let filename = `hisobot_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    let csvContent = '\uFEFF'; // UTF-8 BOM

    if (activeTab === 'finance' && finance) {
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
        {/* Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
            <span>Oylik Tushum</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {isOverviewLoading ? '...' : formatCurrency(overview?.month_revenue)}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <span>Xarajat:</span>
            <span className="font-semibold text-rose-600">{formatCurrency(overview?.month_expense)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
            <span>Sof Foyda (Shu oy)</span>
            <span className={`p-1.5 rounded-lg ${
              (overview?.month_net_profit || 0) >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold mt-2 ${
            (overview?.month_net_profit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'
          }`}>
            {isOverviewLoading ? '...' : formatCurrency(overview?.month_net_profit)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Tushumdan barcha xarajatlar chegirilgan
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
            <span>Markaz Davomati</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {isOverviewLoading ? '...' : `${overview?.avg_attendance_rate || 0}%`}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            Barcha guruhlar bo&apos;yicha o&apos;rtacha
          </div>
        </div>

        {/* Risk Students */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
            <span>Xavf Ostidagi O&apos;quvchilar</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {isOverviewLoading ? '...' : `${overview?.risk_students_count || 0} nafar`}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Ketib qolish yoki qarzdorlik xavfi
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 print:hidden">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('finance')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'finance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Moliya & Balans
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'attendance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Davomat Dinamikasi
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition relative ${
              activeTab === 'risk'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Xavf Ostidagi O&apos;quvchilar
            {(overview?.risk_students_count || 0) > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded-full font-bold">
                {overview.risk_students_count}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'teachers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Award className="w-4 h-4" />
            O&apos;qituvchilar KPI
          </button>
        </nav>
      </div>

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
