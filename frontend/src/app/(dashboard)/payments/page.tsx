'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  CreditCard, Search, Plus, CheckCircle2, Clock, AlertCircle,
  X, Loader2, DollarSign, ArrowDownRight, ArrowUpRight, History,
  ShieldAlert, BookOpen, Check, Wallet, Trash2, Printer, Receipt,
  UserCheck, AlertTriangle
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { CustomSelect } from '@/components/ui/CustomSelect';
import Link from 'next/link';

interface PaymentPlanItem {
  id: number;
  student_id: number;
  student_name: string;
  student_phone: string;
  group_id: number;
  group_name: string;
  month: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  overpaid_amount?: number;
  due_date: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue' | 'cancelled';
}

interface PaymentTransaction {
  id: number;
  plan_id: number;
  student_id?: number;
  student_name: string;
  group_name: string;
  amount: number;
  method: string;
  paid_at: string;
  note: string | null;
  received_by_name: string | null;
}

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser, isStudent: isUserStudent, isTeacher: isUserTeacher, isLoading: isUserLoading } = useCurrentUser();

  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // To'lov qabul qilish modal holati (Admin / Manager)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlanItem | null>(null);

  // Tezkor kassa to'lovi maydonlari (agar rejadan tanlanmagan bo'lsa)
  const [quickStudentId, setQuickStudentId] = useState<string>('');
  const [quickGroupId, setQuickGroupId] = useState<string>('');
  const [quickMonth, setQuickMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNote, setPayNote] = useState<string>('');
  const [payError, setPayError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Kvitansiya (Chek) ko'rish modali
  const [receiptTx, setReceiptTx] = useState<PaymentTransaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // 1. Fetch Payment Plans
  const { data: plansResponse, isLoading: isPlansLoading } = useQuery({
    queryKey: ['payment-plans', search, statusFilter, isUserStudent],
    queryFn: async () => {
      const resp = await api.get('/api/payments', {
        params: {
          search: isUserStudent ? undefined : (search || undefined),
          status: statusFilter || undefined,
        },
      });
      return resp.data || { items: [], summary: null };
    },
    enabled: !isUserTeacher,
  });

  // 2. Fetch Payment Transactions History
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['payment-history', isUserStudent],
    queryFn: async () => {
      const resp = await api.get('/api/payments/history');
      return resp.data?.items || [];
    },
    enabled: !isUserTeacher,
  });

  // 3. Tezkor kassa uchun barcha faol o'quvchilarni yuklash
  const { data: studentsList = [] } = useQuery({
    queryKey: ['quick-cashier-students'],
    queryFn: async () => {
      const resp = await api.get('/api/students', { params: { per_page: 300, status: 10 } });
      return resp.data?.items || [];
    },
    enabled: !isUserStudent && !isUserTeacher && isPayModalOpen,
  });

  // 4. Tanlangan o'quvchining guruhlari va profili
  const { data: selectedStudentInfo } = useQuery({
    queryKey: ['quick-student-profile', quickStudentId],
    queryFn: async () => {
      if (!quickStudentId) return null;
      const resp = await api.get(`/api/students/${quickStudentId}`);
      return resp.data;
    },
    enabled: !!quickStudentId && isPayModalOpen && !selectedPlan,
  });

  // O'quvchi tanlanganda guruhni avtomatik to'ldirish
  useEffect(() => {
    if (selectedStudentInfo?.groups && selectedStudentInfo.groups.length > 0) {
      const activeGroup = selectedStudentInfo.groups.find((g: any) => g.status === 'active') || selectedStudentInfo.groups[0];
      if (activeGroup) {
        setQuickGroupId(String(activeGroup.group_id));
      }
    } else {
      setQuickGroupId('');
    }
  }, [selectedStudentInfo]);

  // Receive Payment Mutation (Admin / Manager)
  const payMutation = useMutation({
    mutationFn: async () => {
      let payload: any = {};
      if (selectedPlan) {
        payload = {
          plan_id: selectedPlan.id,
          amount: Number(payAmount),
          method: payMethod,
          note: payNote || null,
        };
      } else {
        if (!quickStudentId) throw new Error("O'quvchini tanlang");
        if (!quickGroupId) throw new Error("Guruhni tanlang");
        payload = {
          student_id: Number(quickStudentId),
          group_id: Number(quickGroupId),
          month: quickMonth,
          amount: Number(payAmount),
          method: payMethod,
          note: payNote || null,
        };
      }
      const resp = await api.post('/api/payments', payload);
      return resp.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });

      setIsPayModalOpen(false);
      setSelectedPlan(null);
      setQuickStudentId('');
      setQuickGroupId('');
      setPayAmount(0);
      setPayNote('');

      setSuccessMessage("To'lov muvaffaqiyatli qabul qilindi!");
      setTimeout(() => setSuccessMessage(''), 5000);

      // Agar chek ma'lumotlari qaytsa, chek ko'rsatish
      if (data?.payment) {
        const studentObj = studentsList.find((s: any) => s.id === Number(quickStudentId)) || (selectedPlan ? { name: selectedPlan.student_name } : null);
        const groupObj = (selectedStudentInfo?.groups || []).find((g: any) => String(g.group_id) === String(quickGroupId)) || (selectedPlan ? { group_name: selectedPlan.group_name } : null);

        setReceiptTx({
          id: data.payment.id,
          plan_id: data.payment.plan_id,
          student_name: studentObj?.name || selectedPlan?.student_name || "O'quvchi",
          group_name: groupObj?.group_name || selectedPlan?.group_name || 'Guruh',
          amount: Number(data.payment.amount),
          method: data.payment.method || payMethod,
          paid_at: data.payment.paid_at || new Date().toISOString(),
          note: data.payment.note || null,
          received_by_name: currentUser?.name || 'Kassir',
        });
        setIsReceiptModalOpen(true);
      }
    },
    onError: (err: any) => {
      setPayError(err.response?.data?.message || err.message || "To'lovni saqlashda xatolik yuz berdi");
    },
  });

  // Delete/Cancel Payment Mutation (Admin only)
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const resp = await api.delete(`/api/payments/${paymentId}`);
      return resp.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setSuccessMessage(data?.message || "To'lov muvaffaqiyatli bekor qilindi!");
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "To'lovni bekor qilishda xatolik yuz berdi");
    },
  });

  // Modalni mavjud reja orqali ochish
  const openPayModalForPlan = (plan: PaymentPlanItem) => {
    setSelectedPlan(plan);
    setQuickStudentId(String(plan.student_id));
    setQuickGroupId(String(plan.group_id));
    setQuickMonth(plan.month);
    setPayAmount(plan.remaining_amount || plan.amount);
    setPayMethod('cash');
    setPayNote('');
    setPayError('');
    setIsPayModalOpen(true);
  };

  // Modalni erkin kassa orqali ochish
  const openQuickCashierModal = () => {
    setSelectedPlan(null);
    setQuickStudentId('');
    setQuickGroupId('');
    const d = new Date();
    setQuickMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setPayAmount(500000);
    setPayMethod('cash');
    setPayNote('');
    setPayError('');
    setIsPayModalOpen(true);
  };

  const rawPlans: PaymentPlanItem[] = plansResponse?.items || [];
  const backendSummary = plansResponse?.summary || null;

  // O'quvchi bo'lsa faqat o'zinikini filtrlash
  const plans = isUserStudent && currentUser
    ? rawPlans.filter((p) => p.student_id === currentUser.id || !p.student_id)
    : rawPlans;

  const rawHistory: PaymentTransaction[] = historyData || [];
  const history = isUserStudent && currentUser
    ? rawHistory.filter((h) => h.student_id === currentUser.id || h.student_name === currentUser.name)
    : rawHistory;

  // Moliyaviy ko'rsatkichlar
  const totalDue = backendSummary?.total_billed ?? plans.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalPaid = backendSummary?.total_paid ?? plans.reduce((acc, p) => acc + (p.paid_amount || 0), 0);
  const totalRemaining = backendSummary?.total_remaining ?? plans.reduce((acc, p) => acc + (p.remaining_amount || 0), 0);
  const countOverdue = backendSummary?.count_overdue ?? plans.filter(p => p.status === 'overdue').length;
  const countPartial = backendSummary?.count_partial ?? plans.filter(p => p.status === 'partial').length;
  const countPaid = backendSummary?.count_paid ?? plans.filter(p => p.status === 'paid').length;

  // Student options for CustomSelect
  const studentSelectOptions = useMemo(() => {
    return (studentsList || []).map((s: any) => ({
      value: String(s.id),
      label: s.name,
      subLabel: s.phone || `ID: #${s.id}`,
    }));
  }, [studentsList]);

  // Group options for selected student
  const studentGroupOptions: { value: string; label: string; subLabel?: string }[] = useMemo(() => {
    if (!selectedStudentInfo?.groups) return [];
    return selectedStudentInfo.groups.map((g: any) => ({
      value: String(g.group_id),
      label: `${g.group_name} (${g.course_name || 'Kurs'})`,
      subLabel: g.teacher_name ? `Ustoz: ${g.teacher_name}` : undefined,
    }));
  }, [selectedStudentInfo]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            To&apos;langan
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Qisman to&apos;langan
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Qarzdorlik
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            Kutilmoqda
          </span>
        );
    }
  };

  // 0. Loading State
  if (isUserLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs text-gray-400">Yuklanmoqda...</p>
      </div>
    );
  }

  // 1. O'qituvchi bo'lsa ruxsat yo'q
  if (isUserTeacher) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ruxsat mavjud emas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          O&apos;quv markazi to&apos;lovlari va moliya bo&apos;limi faqat o&apos;quvchilar va ma&apos;muriyat xodimlari uchun mo&apos;ljallangan.
        </p>
        <Link
          href="/groups"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
        >
          <BookOpen className="w-4 h-4" />
          <span>Guruhlarimga qaytish</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isUserStudent ? "Mening To'lovlarim va Balansim" : "To'lovlar & Kassa"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isUserStudent
              ? "Guruhlaringiz bo'yicha to'lov rejalari, cheklar va balans"
              : "Markaz to'lovlarini qabul qilish, kassa va qarzdorlik nazorati"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Cashier Action Button for Admin/Manager */}
          {!isUserStudent && (
            <button
              type="button"
              onClick={openQuickCashierModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>To&apos;lov qabul qilish</span>
            </button>
          )}

          {/* Tabs switcher */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'plans'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {isUserStudent ? "To'lov holati" : "To'lov rejalari (Kassa)"}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Cheklar tarixi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards for Admin / Manager */}
      {!isUserStudent && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Jami hisoblangan</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5">{formatMoney(totalDue)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Qabul qilingan summa</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(totalPaid)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Mavjud qarzdorlik</p>
              <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{formatMoney(totalRemaining)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Qarzdor o&apos;quvchilar</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{countOverdue} nafar</span>
                {countPartial > 0 && <span className="text-xs text-amber-600 font-semibold">(+{countPartial} qisman)</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Personal Summary Cards */}
      {isUserStudent && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Jami kurs to&apos;lovi</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{formatMoney(totalDue)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">To&apos;langan summa</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatMoney(totalPaid)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
              totalRemaining > 0
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Qoldiq qarz</p>
              <p className={`text-xl font-bold mt-0.5 ${
                totalRemaining > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'
              }`}>
                {totalRemaining > 0 ? formatMoney(totalRemaining) : "Qarz yo'q"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl text-green-800 dark:text-green-300 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* TAB 1: Payment Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-4">

          {/* Filter Bar (Only for Admin/Manager) */}
          {!isUserStudent && (
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="O'quvchi ismi yoki telefoni..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* Status Chips Filter */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    statusFilter === ''
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Barchasi
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('overdue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    statusFilter === 'overdue'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Qarzdorlar ({countOverdue})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('partial')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    statusFilter === 'partial'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Qisman ({countPartial})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>To&apos;langan ({countPaid})</span>
                </button>
              </div>
            </div>
          )}

          {/* Plans Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            {isPlansLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : plans.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                To&apos;lov rejalari topilmadi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      {!isUserStudent && <th className="px-6 py-3.5">O&apos;quvchi</th>}
                      <th className="px-6 py-3.5">Guruh / Oy</th>
                      <th className="px-6 py-3.5">Kurs summasi</th>
                      <th className="px-6 py-3.5">To&apos;langan</th>
                      <th className="px-6 py-3.5">Qoldiq qarz</th>
                      <th className="px-6 py-3.5">To&apos;lov muddati</th>
                      <th className="px-6 py-3.5">Holat</th>
                      {!isUserStudent && <th className="px-6 py-3.5 text-right">Amal</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {plans.map((plan) => {
                      const isOverdue = plan.status === 'overdue' || plan.remaining_amount > 0;
                      return (
                        <tr
                          key={plan.id}
                          className={`transition ${
                            plan.status === 'overdue'
                              ? 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40'
                              : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/40'
                          }`}
                        >
                          {!isUserStudent && (
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-900 dark:text-white">{plan.student_name}</p>
                              <p className="text-xs text-gray-400">{plan.student_phone}</p>
                            </td>
                          )}

                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900 dark:text-white text-xs">{plan.group_name}</p>
                            <span className="text-[11px] text-gray-400 font-medium">{plan.month} oyi</span>
                          </td>

                          <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                            {formatMoney(plan.amount)}
                          </td>

                          <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(plan.paid_amount)}
                          </td>

                          <td className="px-6 py-4">
                            {plan.remaining_amount > 0 ? (
                              <span className={`font-bold flex items-center gap-1 ${
                                plan.status === 'overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                              }`}>
                                {plan.status === 'overdue' && <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                                {formatMoney(plan.remaining_amount)}
                              </span>
                            ) : (plan.overpaid_amount && plan.overpaid_amount > 0) ? (
                              <div className="flex flex-col">
                                <span className="text-xs text-emerald-600 font-semibold">To&apos;liq to&apos;langan</span>
                                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                  Haqdorlik: +{formatMoney(plan.overpaid_amount)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-emerald-600 font-semibold">To&apos;liq to&apos;langan</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {plan.due_date || "-"}
                          </td>

                          <td className="px-6 py-4">
                            {getStatusBadge(plan.status)}
                          </td>

                          {!isUserStudent && (
                            <td className="px-6 py-4 text-right">
                              {plan.remaining_amount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => openPayModalForPlan(plan)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>To&apos;lov olish</span>
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-600 font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-md border border-emerald-100 dark:border-emerald-800">
                                  Yopilgan
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Payment History (Cheklar) */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {isHistoryLoading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Hali to&apos;lovlar kvitansiyalari mavjud emas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3.5">Chek #</th>
                    {!isUserStudent && <th className="px-6 py-3.5">O&apos;quvchi</th>}
                    <th className="px-6 py-3.5">Guruh</th>
                    <th className="px-6 py-3.5">Summa</th>
                    <th className="px-6 py-3.5">To&apos;lov usuli</th>
                    <th className="px-6 py-3.5">Sana</th>
                    <th className="px-6 py-3.5">Holat</th>
                    <th className="px-6 py-3.5 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-gray-500">
                        #{tx.id}
                      </td>
                      {!isUserStudent && (
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          {tx.student_name}
                        </td>
                      )}
                      <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300 font-medium">
                        {tx.group_name}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatMoney(tx.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {tx.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(tx.paid_at).toLocaleString('uz-UZ', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tasdiqlangan</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Chekni ko'rish tugmasi */}
                          <button
                            type="button"
                            title="Chekni ko'rish / Chop etish"
                            onClick={() => {
                              setReceiptTx(tx);
                              setIsReceiptModalOpen(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          {/* Bekor qilish (Faqat Admin) */}
                          {!isUserStudent && currentUser?.role === 'admin' && (
                            <button
                              type="button"
                              title="To'lovni bekor qilish"
                              disabled={deletePaymentMutation.isPending}
                              onClick={() => {
                                if (confirm(`Haqiqatan ham ${tx.student_name} ning ${formatMoney(tx.amount)} so'mlik to'lovini bekor qilmoqchimisiz? Bu to'lov o'chirilib, qarz qayta hisoblanadi.`)) {
                                  deletePaymentMutation.mutate(tx.id);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: To'lov qabul qilish (Kassa) */}
      {!isUserStudent && isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg my-auto max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {selectedPlan ? "Reja bo'yicha to'lov olish" : "Kassa: Yangi to'lov qabul qilish"}
                </h3>
                <p className="text-xs text-gray-400">
                  {selectedPlan ? `${selectedPlan.student_name} • ${selectedPlan.month}` : "O'quvchi va guruhni tanlab to'lovni kiriting"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                payMutation.mutate();
              }}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              {payError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs flex items-start gap-2 break-words">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="flex-1 break-words leading-relaxed">{payError}</span>
                </div>
              )}

              {/* Agar mavjud rejadan ochilgan bo'lsa */}
              {selectedPlan ? (
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">O&apos;quvchi:</span>
                    <strong className="text-gray-900 dark:text-white">{selectedPlan.student_name} ({selectedPlan.student_phone})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Guruh:</span>
                    <strong className="text-gray-900 dark:text-white">{selectedPlan.group_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">To&apos;lov oyi:</span>
                    <strong className="text-gray-900 dark:text-white">{selectedPlan.month}</strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500 font-semibold">Qoldiq qarz summasi:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                      {formatMoney(selectedPlan.remaining_amount)}
                    </strong>
                  </div>
                </div>
              ) : (
                /* Erkin Kassa: O'quvchi va guruh tanlash */
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      O&apos;quvchini tanlang *
                    </label>
                    <CustomSelect
                      value={quickStudentId}
                      onChange={(val) => {
                        setQuickStudentId(val);
                        setQuickGroupId('');
                      }}
                      options={studentSelectOptions}
                      placeholder="O'quvchi ismi yoki telefoni bo'yicha qidiring..."
                      searchable={true}
                    />
                  </div>

                  {quickStudentId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Guruh *
                        </label>
                        {studentGroupOptions.length > 0 ? (
                          <select
                            required
                            value={quickGroupId}
                            onChange={(e) => setQuickGroupId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                          >
                            <option value="">Guruhni tanlang...</option>
                            {studentGroupOptions.map((g: { value: string; label: string }) => (
                              <option key={g.value} value={g.value}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-xs">
                            Bu o&apos;quvchi hali biron guruhga biriktirilmagan
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          To&apos;lov oyi *
                        </label>
                        <input
                          type="month"
                          required
                          value={quickMonth}
                          onChange={(e) => setQuickMonth(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* To'lov summasi */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    To&apos;lov summasi (so&apos;mda) *
                  </label>
                  {payAmount > 0 && (
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {formatMoney(payAmount)}
                    </span>
                  )}
                </div>

                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />

                {/* Tezkor summalar chiplari */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {selectedPlan && selectedPlan.remaining_amount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayAmount(selectedPlan.remaining_amount)}
                      className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-semibold hover:bg-rose-100 transition cursor-pointer"
                    >
                      To&apos;liq qarzni yopish ({formatMoney(selectedPlan.remaining_amount)})
                    </button>
                  )}
                  {[200000, 300000, 400000, 500000, 600000, 1000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPayAmount(amt)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        payAmount === amt
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {amt >= 1000000 ? `${amt / 1000000} mln` : `${amt / 1000} ming`}
                    </button>
                  ))}
                </div>

                {selectedPlan && payAmount > selectedPlan.remaining_amount && (
                  <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900">
                    💡 Rejadan ortiqcha to&apos;lov: <strong>+{formatMoney(payAmount - selectedPlan.remaining_amount)}</strong> (Haqdorlik sifatida hisoblanadi)
                  </p>
                )}
              </div>

              {/* To'lov turi */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  To&apos;lov usuli *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                  {[
                    { id: 'cash', label: 'Naqd pul' },
                    { id: 'card', label: 'Karta' },
                    { id: 'click', label: 'Click' },
                    { id: 'payme', label: 'Payme' },
                    { id: 'bank', label: 'Bank' },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPayMethod(m.id)}
                      className={`py-2 px-1 rounded-xl border font-bold text-center transition cursor-pointer ${
                        payMethod === m.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Izoh */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Izoh (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Kvitansiya raqami yoki eslatma..."
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {/* Modal footer */}
              <div className="pt-3 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900 py-3 border-t border-gray-100 dark:border-gray-800 -mx-6 -mb-6 px-6 flex-shrink-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending || payAmount <= 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>To&apos;lovni tasdiqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Kvitansiya (Chek) ko'rish va chop etish */}
      {isReceiptModalOpen && receiptTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 animate-fade-in p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">To&apos;lov Cheki</h4>
                  <p className="text-[11px] text-gray-400">#PAY-{receiptTx.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Paper */}
            <div id="payment-receipt-print" className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 space-y-3 text-xs">
              <div className="text-center pb-2 border-b border-gray-200 dark:border-gray-700">
                <p className="font-bold text-sm text-gray-900 dark:text-white">O&apos;QUV MARKAZI</p>
                <p className="text-[11px] text-gray-400">To&apos;lov qabul qilindi</p>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">O&apos;quvchi:</span>
                <strong className="text-gray-900 dark:text-white text-right">{receiptTx.student_name}</strong>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Guruh:</span>
                <strong className="text-gray-900 dark:text-white">{receiptTx.group_name}</strong>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">To&apos;lov usuli:</span>
                <span className="font-bold uppercase text-gray-900 dark:text-white">{receiptTx.method}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Sana:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {new Date(receiptTx.paid_at).toLocaleString('uz-UZ')}
                </span>
              </div>

              {receiptTx.received_by_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Qabul qildi:</span>
                  <span className="text-gray-700 dark:text-gray-300">{receiptTx.received_by_name}</span>
                </div>
              )}

              {receiptTx.note && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Izoh:</span>
                  <span className="text-gray-700 dark:text-gray-300 italic">{receiptTx.note}</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-baseline">
                <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">To&apos;langan summa:</span>
                <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                  {formatMoney(receiptTx.amount)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Chop etish (Print)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
