'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  CreditCard, Search, Plus, CheckCircle2, Clock, AlertCircle,
  X, Loader2, DollarSign, ArrowDownRight, ArrowUpRight, History,
  ShieldAlert, BookOpen, Check, Wallet
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { getCurrentUserFromToken, isStudent, isTeacher } from '@/lib/auth';
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

  const [currentUser, setCurrentUser] = useState<{ id: number; role: string; name: string } | null>(null);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) {
      setCurrentUser({
        id: user.sub,
        role: user.role,
        name: user.name,
      });
    }
  }, []);

  const isUserStudent = currentUser ? isStudent(currentUser.role) : false;
  const isUserTeacher = currentUser ? isTeacher(currentUser.role) : false;

  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // To'lov qabul qilish modali (faqat admin/manager uchun)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlanItem | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNote, setPayNote] = useState<string>('');
  const [payError, setPayError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // 1. Fetch Payment Plans
  const { data: plansData, isLoading: isPlansLoading } = useQuery({
    queryKey: ['payment-plans', search, statusFilter, isUserStudent],
    queryFn: async () => {
      const resp = await api.get('/api/payments', {
        params: {
          search: isUserStudent ? undefined : (search || undefined),
          status: statusFilter || undefined,
        },
      });
      return resp.data?.items || [];
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

  // Receive Payment Mutation (Admin only)
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) return;
      const payload = {
        plan_id: selectedPlan.id,
        amount: Number(payAmount),
        method: payMethod,
        note: payNote || null,
      };
      const resp = await api.post('/api/payments', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsPayModalOpen(false);
      setSelectedPlan(null);
      setPayAmount(0);
      setPayNote('');
      setSuccessMessage("To'lov muvaffaqiyatli qabul qilindi!");
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: () => {
      setPayError("To'lovni saqlashda xatolik yuz berdi");
    },
  });

  const openPayModal = (plan: PaymentPlanItem) => {
    setSelectedPlan(plan);
    setPayAmount(plan.remaining_amount || plan.amount);
    setPayMethod('cash');
    setPayNote('');
    setPayError('');
    setIsPayModalOpen(true);
  };

  // Filter plans based on role for client-side absolute privacy
  const rawPlans: PaymentPlanItem[] = plansData || [];
  const plans = isUserStudent && currentUser
    ? rawPlans.filter((p) => p.student_id === currentUser.id || !p.student_id)
    : rawPlans;

  const rawHistory: PaymentTransaction[] = historyData || [];
  const history = isUserStudent && currentUser
    ? rawHistory.filter((h) => h.student_id === currentUser.id || h.student_name === currentUser.name)
    : rawHistory;

  // Student metrics
  const totalDue = plans.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalPaid = plans.reduce((acc, p) => acc + (p.paid_amount || 0), 0);
  const totalRemaining = plans.reduce((acc, p) => acc + (p.remaining_amount || 0), 0);

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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" />
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

  // 1. Agar O'qituvchi bo'lsa:
  if (isUserTeacher) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ruxsat mavjud emas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          O&apos;quv markazi to&apos;lovlari va moliya bo&apos;limi faqat o&apos;quvchilar (o&apos;z to&apos;lovlari uchun) va ma&apos;muriyat xodimlari uchun mo&apos;ljallangan.
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

  // 2. Agar O'quvchi yoki Admin bo'lsa:
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isUserStudent ? "Mening To'lovlarim va Balansim" : "To'lovlar Tizimi"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isUserStudent
              ? "Guruhlaringiz bo'yicha oylik to'lovlar, to'langan summalar va cheklar"
              : "O'quvchilarning oylik to'lovlari, qarzdorliklar va kvitansiyalar"}
          </p>
        </div>

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
            {isUserStudent ? "To'lov holati" : "To'lov rejalari"}
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
            <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="O'quvchi ismi yoki telefoni..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="">Barcha holatlar</option>
                  <option value="overdue">Faqat qarzdorlar</option>
                  <option value="partial">Qisman to&apos;langan</option>
                  <option value="paid">To&apos;langan</option>
                  <option value="pending">Kutilmoqda</option>
                </select>
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
                    {plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition">
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
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {formatMoney(plan.remaining_amount)}
                            </span>
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
                                onClick={() => openPayModal(plan)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
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
                    ))}
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
                    {!isUserStudent && <th className="px-6 py-3.5">O&apos;quvchi</th>}
                    <th className="px-6 py-3.5">Guruh</th>
                    <th className="px-6 py-3.5">Summa</th>
                    <th className="px-6 py-3.5">To&apos;lov usuli</th>
                    <th className="px-6 py-3.5">Sana</th>
                    <th className="px-6 py-3.5">Holat / Kvitansiya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: To'lov qabul qilish (Faqat Admin/Manager uchun) */}
      {!isUserStudent && isPayModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white">To&apos;lov qabul qilish</h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                payMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              {payError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              {/* Student & Group Summary Box */}
              <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">O&apos;quvchi:</span>
                  <strong className="text-gray-900 dark:text-white">{selectedPlan.student_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Guruh:</span>
                  <strong className="text-gray-900 dark:text-white">{selectedPlan.group_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Oy:</span>
                  <strong className="text-gray-900 dark:text-white">{selectedPlan.month}</strong>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500">Qolgan summa:</span>
                  <strong className="text-rose-600 font-bold">{formatMoney(selectedPlan.remaining_amount)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  To&apos;lov summasi (so&apos;m) *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  max={selectedPlan.remaining_amount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  To&apos;lov usuli *
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {['cash', 'click', 'payme', 'card', 'bank'].map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className={`py-2 rounded-xl border font-bold uppercase transition ${
                        payMethod === m
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

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

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending || payAmount <= 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Qabul qilish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
