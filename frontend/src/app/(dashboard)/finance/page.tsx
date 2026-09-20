'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, Calendar, AlertCircle, CheckCircle2, Loader2, X, Wallet, FileText
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';

interface ExpenseItem {
  id: number;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_by_name: string | null;
}

interface TeacherSalaryItem {
  id: number;
  teacher_name: string;
  teacher_phone: string;
  month: string;
  type: string;
  amount: number;
  paid_amount: number;
  status: string;
}

export default function FinancePage() {
  const queryClient = useQueryClient();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({
    category: 'rent',
    amount: 500000,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [expenseError, setExpenseError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Fetch Finance Summary
  const { data, isLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const resp = await api.get('/api/finance/summary');
      return resp.data;
    },
  });

  // 2. Fetch Expenses
  const { data: expensesData, isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses-list'],
    queryFn: async () => {
      const resp = await api.get('/api/finance/expenses');
      return resp.data?.items || [];
    },
  });

  // Create Expense Mutation
  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post('/api/finance/expenses', {
        ...expenseData,
        amount: Number(expenseData.amount),
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      setIsExpenseModalOpen(false);
      setExpenseData({
        category: 'rent',
        amount: 500000,
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setSuccessMessage("Xarajat muvaffaqiyatli saqlandi!");
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: () => {
      setExpenseError("Xarajatni saqlashda xatolik yuz berdi");
    },
  });

  const summary = data?.summary || {
    month_income: 0,
    month_expense: 0,
    net_profit: 0,
    overdue_debt: 0,
  };

  const expenses: ExpenseItem[] = expensesData || [];
  const salaries: TeacherSalaryItem[] = data?.salaries || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Moliya va Xarajatlar</h1>
          <p className="text-sm text-gray-500">
            Markaz daromadlari, xarajatlari, oylik to&apos;lovlar va sof foyda hisoboti
          </p>
        </div>

        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi xarajat</span>
        </button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Top 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white flex-shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Oylik tushum</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {formatMoney(summary.month_income)}
            </p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">To&apos;langan summalar</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center text-white flex-shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Oylik xarajatlar</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">
              {formatMoney(summary.month_expense)}
            </p>
            <p className="text-xs text-rose-600 font-semibold mt-1">Operatsion chiqimlar</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${
            summary.net_profit >= 0 ? 'bg-blue-600' : 'bg-amber-500'
          }`}>
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Sof natija</p>
            <p className={`text-2xl font-bold mt-0.5 ${summary.net_profit >= 0 ? 'text-gray-900' : 'text-amber-700'}`}>
              {formatMoney(summary.net_profit)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Tushum - Xarajat</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Qoldiq qarzdorlik</p>
            <p className="text-2xl font-bold text-rose-600 mt-0.5">
              {formatMoney(summary.overdue_debt)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Kutilayotgan to&apos;lovlar</p>
          </div>
        </div>
      </div>

      {/* Main Grids: Expenses on left, Salaries on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Expenses List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900 text-base">Xarajatlar ro&apos;yxati</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
              {expenses.length} ta
            </span>
          </div>

          {isExpensesLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              Xarajatlar mavjud emas.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {expenses.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.description || 'Xarajat'}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span className="capitalize font-medium text-gray-600">{item.category}</span>
                      <span>•</span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                  <strong className="text-rose-600 font-bold text-sm">
                    -{formatMoney(item.amount)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teacher Salaries */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="font-bold text-gray-900 text-base">O&apos;qituvchilar ish haqi</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">
              Joriy oy
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : salaries.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              Ish haqi hisoblanmagan.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {salaries.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{s.teacher_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Turi: <span className="capitalize">{s.type}</span> • {s.month}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatMoney(s.amount)}</p>
                    <span className="text-[11px] font-semibold text-emerald-600">
                      {s.status === 'paid' ? 'To\'langan' : s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal: Yangi Xarajat */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Yangi xarajat kiritish</h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createExpenseMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              {expenseError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{expenseError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kategoriya *
                </label>
                <select
                  value={expenseData.category}
                  onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="rent">Ijara haqi (Bino)</option>
                  <option value="ads">Marketing va Reklama</option>
                  <option value="internet">Internet va Kommunal</option>
                  <option value="salary">Xodimlar oyligi</option>
                  <option value="other">Boshqa xarajatlar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Xarajat summasi (so&apos;m) *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="10000"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Xarajat sanasi *
                </label>
                <input
                  type="date"
                  required
                  value={expenseData.date}
                  onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Xarajat tavsifi / Izoh
                </label>
                <textarea
                  rows={2}
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                  placeholder="Xarajat nima maqsadda qilinganligi..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending || expenseData.amount <= 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {createExpenseMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
