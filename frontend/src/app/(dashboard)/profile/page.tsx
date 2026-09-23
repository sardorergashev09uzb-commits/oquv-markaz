'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  User, Shield, Save, Loader2, Phone, Mail, KeyRound,
  LogOut, CheckCircle2, AlertCircle, Sparkles, GraduationCap,
  Calendar, Lock, Eye, EyeOff, CreditCard, DollarSign,
  Receipt, History, Sun, Moon, Bell, CheckCircle,
  Settings as SettingsIcon, Check, Clock
} from 'lucide-react';
import { isStudent, isTeacher } from '@/lib/auth';

const ROLE_NAMES: Record<string, { label: string; color: string; desc: string }> = {
  super_admin: {
    label: 'Super Admin',
    color: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
    desc: 'Tizimning to\'liq boshqaruvchisi'
  },
  manager: {
    label: 'Menejer',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900',
    desc: 'O\'quv markazi koordinatori'
  },
  admin: {
    label: 'Administrator',
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
    desc: 'O\'quv jarayoni va to\'lovlar nazorati'
  },
  teacher: {
    label: 'O\'qituvchi (Ustoz)',
    color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
    desc: 'Guruhlar va darslar yetakchisi'
  },
  student: {
    label: 'O\'quvchi',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
    desc: 'O\'quv markaz tinglovchisi'
  },
};

function formatMoney(amount: number) {
  return (amount || 0).toLocaleString('uz-UZ') + " so'm";
}

const PAYMENT_METHOD_NAMES: Record<string, string> = {
  cash: 'Naqd pul',
  card: 'Plastik karta',
  payme: 'Payme / Click',
  bank: 'Bank o\'tkazmasi',
};

interface PaymentPlanItem {
  id: number;
  student_id: number;
  group_id: number;
  month: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  group?: {
    id: number;
    name: string;
    course?: { name: string; price: number };
  };
}

interface PaymentHistoryItem {
  id: number;
  plan_id: number;
  amount: number;
  paid_at: string;
  payment_method: string;
  note?: string;
  plan?: {
    month: string;
    group?: { name: string };
  };
  receivedBy?: {
    name: string;
  };
}

export default function ProfilePage() {
  const queryClient = useQueryClient();

  // 1. Fetch current user from /api/auth/me
  const { data: userData, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const resp = await api.get('/api/auth/me');
      return resp.data;
    },
  });

  const role = userData?.role || 'student';
  const isUserStudent = isStudent(role);

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'payments' | 'settings'>('profile');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  // Password change state
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const [profileMessage, setProfileMessage] = useState({ text: '', isError: false });
  const [passwordMessage, setPasswordMessage] = useState({ text: '', isError: false });

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  // Notification settings state (for student settings)
  const [notifyLesson, setNotifyLesson] = useState(true);
  const [notifyPayment, setNotifyPayment] = useState(true);
  const [notifyAnnounce, setNotifyAnnounce] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Logout modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
        email: userData.email || '',
      });
    }
  }, [userData]);

  // 2. Student Payments Queries (only fetched if student)
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: async () => {
      const resp = await api.get('/api/payments');
      return resp.data;
    },
    enabled: isUserStudent,
  });

  const { data: paymentHistoryData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['my-payments-history'],
    queryFn: async () => {
      const resp = await api.get('/api/payments/history');
      return resp.data?.items || [];
    },
    enabled: isUserStudent,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post('/api/auth/update-profile', formData);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      setProfileMessage({ text: "Profil muvaffaqiyatli saqlandi!", isError: false });
      setTimeout(() => setProfileMessage({ text: '', isError: false }), 4000);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err.response?.data?.message || "Profilni saqlashda xatolik yuz berdi.";
      setProfileMessage({ text: msg, isError: true });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (passwords.new_password !== passwords.confirm_password) {
        throw new Error("Yangi parollar mos kelmadi!");
      }
      if (passwords.new_password.length < 6) {
        throw new Error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak!");
      }
      const resp = await api.post('/api/auth/change-password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      return resp.data;
    },
    onSuccess: () => {
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordMessage({ text: "Parol muvaffaqiyatli o'zgartirildi!", isError: false });
      setTimeout(() => setPasswordMessage({ text: '', isError: false }), 4000);
    },
    onError: (err: { message?: string; response?: { data?: { message?: string } } }) => {
      const msg = err.message || err.response?.data?.message || "Parolni o'zgartirishda xatolik yuz berdi.";
      setPasswordMessage({ text: msg, isError: true });
    },
  });

  const handleLogout = () => {
    document.cookie = 'access_token=; path=/; max-age=0';
    document.cookie = 'refresh_token=; path=/; max-age=0';
    localStorage.clear();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-sm text-gray-500">Profil ma&apos;lumotlari yuklanmoqda...</span>
      </div>
    );
  }

  const roleInfo = ROLE_NAMES[role] || {
    label: role,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    desc: 'Foydalanuvchi'
  };

  const paymentPlans: PaymentPlanItem[] = paymentsData?.items || [];
  const paymentHistory: PaymentHistoryItem[] = paymentHistoryData || [];
  const paymentSummary = paymentsData?.summary || {
    total_billed: 0,
    total_paid: 0,
    total_remaining: 0,
    count_paid: 0,
    count_partial: 0,
    count_pending: 0,
    count_overdue: 0,
  };

  // Current month detection
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthPlan = paymentPlans.find((p) => p.month === currentMonthStr);

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ─── Profile Header Card ────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 transition-colors">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          {/* Avatar with Ring */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg">
              {userData?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" title="Faol hisob" />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {userData?.name || "Foydalanuvchi"}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {roleInfo.desc}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-500 dark:text-gray-400">
              {userData?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {userData.phone}
                </span>
              )}
              {userData?.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {userData.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logout Quick Button */}
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition border border-rose-100 dark:border-rose-900 shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Chiqish</span>
        </button>
      </div>

      {/* ─── Profile Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Mening Ma&apos;lumotlarim</span>
        </button>

        {isUserStudent && (
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>To&apos;lovlarim va Balans</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>{isUserStudent ? 'Sozlamalar va Xavfsizlik' : 'Xavfsizlik & Parol'}</span>
        </button>
      </div>

      {/* ─── Tab 1: Shaxsiy Ma'lumotlar ─────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Shaxsiy Ma&apos;lumotlarni Tahrirlash
            </h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate();
            }}
            className="space-y-4 max-w-xl"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                To&apos;liq ismingiz
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Telefon raqamingiz
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998901234567"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Elektron pochta (Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {profileMessage.text && (
              <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                profileMessage.isError
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
              }`}>
                {profileMessage.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{profileMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>O&apos;zgarishlarni Saqlash</span>
            </button>
          </form>
        </div>
      )}

      {/* ─── Tab 2: O'quvchi To'lovlari va Balansi ─────────────────── */}
      {activeTab === 'payments' && isUserStudent && (
        <div className="space-y-6">

          {/* Joriy Oy To'lov Holati Banner */}
          <div className={`rounded-3xl p-6 sm:p-7 border shadow-sm transition-all ${
            currentMonthPlan?.status === 'paid'
              ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-emerald-200 dark:border-emerald-800'
              : currentMonthPlan?.status === 'partial'
              ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 border-amber-200 dark:border-amber-800'
              : currentMonthPlan?.status === 'overdue' || currentMonthPlan?.status === 'pending'
              ? 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-pink-500/10 border-rose-200 dark:border-rose-800'
              : 'bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-indigo-500/10 border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Joriy Oy Balansi ({currentMonthStr})
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentMonthPlan ? (
                    currentMonthPlan.status === 'paid' ? (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6" /> To&apos;lov to&apos;liq to&apos;langan
                      </span>
                    ) : currentMonthPlan.status === 'partial' ? (
                      <span className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <Clock className="w-6 h-6" /> Qisman to&apos;langan (Qoldiq: {formatMoney(currentMonthPlan.remaining_amount)})
                      </span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-6 h-6" /> To&apos;lov kutilmoqda ({formatMoney(currentMonthPlan.remaining_amount)})
                      </span>
                    )
                  ) : (
                    <span className="text-blue-700 dark:text-blue-400">
                      Joriy oy uchun to&apos;lov rejasi shakllantirilgan
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {currentMonthPlan ? (
                    `Rejadagi summa: ${formatMoney(currentMonthPlan.amount)} • To'langan: ${formatMoney(currentMonthPlan.paid_amount)}`
                  ) : (
                    "O'quv markazi ma'muriyati orqali to'lov holatingizni tekshirishingiz mumkin"
                  )}
                </p>
              </div>

              {currentMonthPlan && (
                <div className="text-left sm:text-right shrink-0">
                  <p className="text-xs text-gray-400">Guruh / Kurs</p>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">
                    {currentMonthPlan.group?.name || 'Asosiy guruh'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
              <p className="text-xs text-gray-400 font-medium">Rejadagi to&apos;lovlar</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {formatMoney(paymentSummary.total_billed)}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Jami to&apos;langan</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {formatMoney(paymentSummary.total_paid)}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-rose-100 dark:border-rose-900/40 shadow-sm">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Umumiy qarzdorlik</p>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1">
                {formatMoney(paymentSummary.total_remaining)}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/40 shadow-sm">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">To&apos;langan oylar</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                {paymentSummary.count_paid} ta to&apos;liq
              </p>
            </div>
          </div>

          {/* Oylik To'lov Rejalari Jadvali */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Oylik To&apos;lovlar Rejasi
                </h3>
                <p className="text-xs text-gray-400">Har bir oy uchun belgilangan kurs to&apos;lovlari</p>
              </div>
            </div>

            {isPaymentsLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : paymentPlans.length === 0 ? (
              <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                Siz uchun to&apos;lov rejalari hali kiritilmagan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3">Guruh & Kurs</th>
                      <th className="px-4 py-3">Oy</th>
                      <th className="px-4 py-3">Narxi</th>
                      <th className="px-4 py-3">To&apos;langan</th>
                      <th className="px-4 py-3">Qoldiq</th>
                      <th className="px-4 py-3">Holati</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paymentPlans.map((plan) => {
                      const isPaid = plan.status === 'paid';
                      const isPartial = plan.status === 'partial';
                      const isOverdue = plan.status === 'overdue';

                      return (
                        <tr key={plan.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {plan.group?.name || `Guruh #${plan.group_id}`}
                            </span>
                            {plan.group?.course && (
                              <p className="text-xs text-gray-400">{plan.group.course.name}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                            {plan.month}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                            {formatMoney(plan.amount)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(plan.paid_amount)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">
                            {formatMoney(plan.remaining_amount)}
                          </td>
                          <td className="px-4 py-3">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> To&apos;langan
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                Qisman to&apos;langan
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                Muddati o&apos;tgan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Kutilmoqda
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* To'lov Cheklari va Tarixi */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  To&apos;lov Cheklari va Kvitansiyalar
                </h3>
                <p className="text-xs text-gray-400">Qabul qilingan barcha to&apos;lovlar ro&apos;yxati</p>
              </div>
            </div>

            {isHistoryLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                To&apos;lov kvitansiyalari topilmadi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3">Chek №</th>
                      <th className="px-4 py-3">Sana</th>
                      <th className="px-4 py-3">Guruh / Oy</th>
                      <th className="px-4 py-3">Summa</th>
                      <th className="px-4 py-3">To&apos;lov usuli</th>
                      <th className="px-4 py-3">Qabul qildi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paymentHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          #{item.id}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                          {item.paid_at}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">
                          {item.plan?.group?.name || '-'} {item.plan?.month ? `(${item.plan.month})` : ''}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          +{formatMoney(item.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                          {PAYMENT_METHOD_NAMES[item.payment_method] || item.payment_method}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.receivedBy?.name || 'Administrator'}
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

      {/* ─── Tab 3: Sozlamalar va Xavfsizlik ─────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. Xavfsizlik & Parol */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <Lock className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Parolni Yangilash
              </h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                changePasswordMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Joriy parol
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwords.current_password}
                    onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                    required
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Yangi parol
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    required
                    placeholder="Kamida 6 ta belgi"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Yangi parolni tasdiqlash
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                    required
                    placeholder="Parolni qayta tering"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {passwordMessage.text && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMessage.isError
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                }`}>
                  {passwordMessage.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>Parolni Saqlash</span>
              </button>
            </form>
          </div>

          {/* 2. Tizim Ko'rinishi va Bildirishnomalar */}
          <div className="space-y-6">

            {/* Tema sozlamasi */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <Sun className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Tizim Ko&apos;rinishi (Mavzu)
                </h3>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {isDarkMode ? 'Tungi rejim faol' : 'Kunduzgi rejim faol'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Ko&apos;zlarga qulay qorong&apos;i yoki yorqin fonni tanlang
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    isDarkMode ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-xs">
                    {isDarkMode ? <Moon className="w-3.5 h-3.5 text-blue-600" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Bildirishnomalar sozlamasi (ayniqsa o'quvchi uchun) */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <Bell className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Bildirishnomalar Sozlamasi
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Dars eslatmalari</p>
                    <p className="text-xs text-gray-400">Dars boshlanishidan oldin eslatma olish</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyLesson}
                    onChange={(e) => {
                      setNotifyLesson(e.target.checked);
                      setSettingsSaved(true);
                      setTimeout(() => setSettingsSaved(false), 2000);
                    }}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">To&apos;lov eslatmalari</p>
                    <p className="text-xs text-gray-400">Oylik to&apos;lov muddati yaqinlashganda eslatish</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyPayment}
                    onChange={(e) => {
                      setNotifyPayment(e.target.checked);
                      setSettingsSaved(true);
                      setTimeout(() => setSettingsSaved(false), 2000);
                    }}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Markaz e&apos;lonlari</p>
                    <p className="text-xs text-gray-400">Yangi e&apos;lonlar va tadbirlar haqida xabarlar</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyAnnounce}
                    onChange={(e) => {
                      setNotifyAnnounce(e.target.checked);
                      setSettingsSaved(true);
                      setTimeout(() => setSettingsSaved(false), 2000);
                    }}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                {settingsSaved && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Sozlamalar saqlandi
                  </p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── Logout Confirmation Modal ──────────────────────────────── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-gray-900 dark:text-white text-base">
                Tizimdan chiqmoqchimisiz?
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Qaytadan kirish uchun login va parolingizni kiritishingiz kerak bo&apos;ladi.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-750 text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
              >
                Ha, chiqish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
