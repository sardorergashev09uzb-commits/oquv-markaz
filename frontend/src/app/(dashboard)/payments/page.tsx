'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  CreditCard, Search, Plus, CheckCircle2, Clock, AlertCircle,
  X, Loader2, DollarSign, ArrowDownRight, ArrowUpRight, History
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { getCurrentUserFromToken, isStudent } from '@/lib/auth';

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

  const [isStudentUser, setIsStudentUser] = useState(false);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) {
      setIsStudentUser(isStudent(user.role));
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // To'lov qabul qilish modali
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlanItem | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNote, setPayNote] = useState<string>('');
  const [payError, setPayError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // 1. Fetch Payment Plans
  const { data: plansData, isLoading: isPlansLoading } = useQuery({
    queryKey: ['payment-plans', search, statusFilter],
    queryFn: async () => {
      const resp = await api.get('/api/payments', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      return resp.data?.items || [];
    },
  });

  // 2. Fetch Payment Transactions History
  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => {
      const resp = await api.get('/api/payments/history');
      return resp.data?.items || [];
    },
  });

  // Receive Payment Mutation
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

  const plans: PaymentPlanItem[] = plansData || [];
  const history: PaymentTransaction[] = historyData || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">To&apos;langan</span>;
      case 'partial':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Qisman</span>;
      case 'overdue':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Qarzdor</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Kutilmoqda</span>;
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isStudentUser ? "Mening to'lovlarim" : "To'lovlar Tizimi"}
          </h1>
          <p className="text-sm text-gray-500">
            {isStudentUser
              ? "Guruhlar bo'yicha to'lov rejalari va cheklar tarixi"
              : "O'quvchilarning oylik to'lovlari, qarzdorliklar va kvitansiyalar"}
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="flex items-center p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'plans'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            To&apos;lov rejalari
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>To&apos;lovlar tarixi</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* TAB 1: Payment Plans */}
      {activeTab === 'plans' && (
        <div className="space-y-4">

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="O'quvchi ismi yoki telefoni..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="">Barcha holatlar</option>
                <option value="overdue">Faqat qarzdorlar</option>
                <option value="partial">Qisman to&apos;langan</option>
                <option value="paid">To&apos;langan</option>
                <option value="pending">Kutilmoqda</option>
              </select>
            </div>
          </div>

          {/* Plans Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                  <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5">O&apos;quvchi</th>
                      <th className="px-6 py-3.5">Guruh / Oy</th>
                      <th className="px-6 py-3.5">Kurs summasi</th>
                      <th className="px-6 py-3.5">To&apos;langan</th>
                      <th className="px-6 py-3.5">Qoldiq qarz</th>
                      <th className="px-6 py-3.5">Holat</th>
                      <th className="px-6 py-3.5 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50/70 transition">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{plan.student_name}</p>
                          <p className="text-xs text-gray-400">{plan.student_phone}</p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800 text-xs">{plan.group_name}</p>
                          <span className="text-[11px] text-gray-400">{plan.month}</span>
                        </td>

                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {formatMoney(plan.amount)}
                        </td>

                        <td className="px-6 py-4 font-semibold text-emerald-700">
                          {formatMoney(plan.paid_amount)}
                        </td>

                        <td className="px-6 py-4">
                          {plan.remaining_amount > 0 ? (
                            <span className="font-bold text-rose-600">
                              {formatMoney(plan.remaining_amount)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Qarz yo&apos;q</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {getStatusBadge(plan.status)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {plan.remaining_amount > 0 ? (
                            !isStudentUser ? (
                              <button
                                onClick={() => openPayModal(plan)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>To&apos;lov olish</span>
                              </button>
                            ) : (
                              <span className="text-xs text-rose-600 font-semibold px-2.5 py-1 bg-rose-50 rounded-md border border-rose-100">
                                To&apos;lanishi kerak
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold px-2.5 py-1 bg-emerald-50 rounded-md border border-emerald-100">
                              To&apos;langan
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Payment History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {isHistoryLoading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Hali to&apos;lovlar amalga oshirilmagan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">O&apos;quvchi</th>
                    <th className="px-6 py-3.5">Guruh</th>
                    <th className="px-6 py-3.5">Summa</th>
                    <th className="px-6 py-3.5">Usul</th>
                    <th className="px-6 py-3.5">Sana</th>
                    <th className="px-6 py-3.5">Qabul qildi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {tx.student_name}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {tx.group_name}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-700">
                        +{formatMoney(tx.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {tx.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(tx.paid_at).toLocaleString('uz-UZ')}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {tx.received_by_name || 'Admin'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: To'lov qabul qilish */}
      {isPayModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">To&apos;lov qabul qilish</h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              {/* Student & Group Summary Box */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">O&apos;quvchi:</span>
                  <strong className="text-gray-900">{selectedPlan.student_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Guruh:</span>
                  <strong className="text-gray-900">{selectedPlan.group_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Oy:</span>
                  <strong className="text-gray-900">{selectedPlan.month}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Qolgan summa:</span>
                  <strong className="text-rose-600 font-bold">{formatMoney(selectedPlan.remaining_amount)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Izoh (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Kvitansiya raqami yoki eslatma..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
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
