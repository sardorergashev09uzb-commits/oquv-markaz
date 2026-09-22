'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  User, Shield, Save, Loader2, Phone, Mail, KeyRound,
  LogOut, CheckCircle2, AlertCircle, Sparkles, GraduationCap,
  Calendar, Lock, Eye, EyeOff
} from 'lucide-react';
import { getCurrentUserFromToken, isStudent, isTeacher } from '@/lib/auth';

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

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post('/api/auth/update-profile', formData);
      return resp.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      setProfileMessage({ text: "Profil muvaffaqiyatli saqlandi!", isError: false });
      setTimeout(() => setProfileMessage({ text: '', isError: false }), 4000);
    },
    onError: (err: any) => {
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
    onError: (err: any) => {
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

  const role = userData?.role || 'student';
  const roleInfo = ROLE_NAMES[role] || {
    label: role,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    desc: 'Foydalanuvchi'
  };

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
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition border border-rose-100 dark:border-rose-900 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Chiqish</span>
        </button>
      </div>

      {/* ─── Two-Column Settings ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Shaxsiy Ma'lumotlar Formasi */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Shaxsiy Ma&apos;lumotlar
            </h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate();
            }}
            className="space-y-4"
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
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {profileMessage.text && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
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
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-sm"
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

        {/* 2. Xavfsizlik & Parolni Yangilash */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Xavfsizlik & Parol
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
                  className="w-full pl-9 pr-10 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>Parolni Yangilash</span>
            </button>
          </form>
        </div>
      </div>

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
                className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition shadow-sm"
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
