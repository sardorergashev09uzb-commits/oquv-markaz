'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, GraduationCap, Loader2 } from 'lucide-react';
import api, { setTokens } from '@/lib/api';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedLogin = login.trim();
    if (!trimmedLogin || !password) {
      setError('Login va parolni kiriting');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/api/auth/login', { login: trimmedLogin, password });
      setTokens(data.access_token, data.refresh_token);

      // Cookie ham qo'yamiz (proxy va server layout uchun)
      document.cookie = `access_token=${data.access_token}; path=/; max-age=${data.expires_in}; SameSite=Lax`;
      document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=2592000; SameSite=Lax`;

      window.location.href = redirect;
    } catch (err: unknown) {
      console.error('Login error:', err);
      const axiosErr = err as {
        response?: { data?: { message?: string }; status?: number };
        message?: string;
        code?: string;
      };

      if (!axiosErr?.response) {
        // Tarmoq xatosi, server o'chiq yoki HTTPS brauzer Mixed Content blokirovkasi
        setError(
          "Backend serverga ulanib bo'lmadi! Server ishga tushirilganligini yoki internet aloqasini tekshiring."
        );
      } else {
        const message =
          axiosErr.response?.data?.message || 'Login yoki parol noto\'g\'ri';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-xl overflow-hidden shadow-blue-500/20">
            <img src="/apple-touch-icon.png" alt="GSA" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Global Success Academy</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium">GSA Boshqaruv Tizimiga xush kelibsiz</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Kirish</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Login (phone/email) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Telefon yoki Email
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="+998 90 000 00 00 yoki email@..."
                required
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Parol
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolni kiriting"
                  required
                  className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kirilmoqda...
                </>
              ) : (
                'Kirish'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          O&apos;quv Markaz ERP v1.0 © 2026
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
