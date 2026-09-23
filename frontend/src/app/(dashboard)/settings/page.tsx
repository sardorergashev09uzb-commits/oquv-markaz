'use client';

import { useState } from 'react';
import {
  Building2, MessageSquare, Users, Database, Save, CheckCircle2,
  AlertCircle, Send, Lock, ShieldCheck
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'sms' | 'users' | 'system' | 'limits'>('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSmsStatus, setTestSmsStatus] = useState<string | null>(null);

  const [limits, setLimits] = useState({
    maxStudentsPerGroup: 16,
    defaultTuitionFee: 300000,
    minTeacherSalary: 2000000,
    discountLimit: 20,
  });
  const [profile, setProfile] = useState({
    name: "O'quv Markaz N1 (Bosh Filial)",
    phone: "+998 71 200 00 00",
    email: "info@oquvmarkaz.uz",
    address: "Toshkent sh., Yunusobod tumani, Amir Temur shoh ko'chasi 107-uy",
    workingHours: "08:00 - 21:00 (Dush - Shan)",
    contractPrefix: "OM-2026",
    currency: "UZS (so'm)",
  });

  // SMS Gateway state
  const [smsConfig, setSmsConfig] = useState({
    provider: 'eskiz',
    email: 'admin@oquvmarkaz.uz',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    senderName: '4546',
    autoPaymentAlert: true,
    autoAttendanceAlert: true,
    testPhone: '+998901234567',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSendTestSms = () => {
    setTestSmsStatus('Yuborilmoqda...');
    setTimeout(() => {
      setTestSmsStatus('Muvaffaqiyatli yetkazildi (Sinov SMS)');
      setTimeout(() => setTestSmsStatus(null), 4000);
    }, 1000);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Tizim Sozlamalari</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          O&apos;quv markaz profili, SMS shlyuzlari, xodimlar va tizim xavfsizlik parametrlari
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 sm:p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          Sozlamalar muvaffaqiyatli saqlandi!
        </div>
      )}

      {/* Tabs - horizontally scrollable on mobile without pushing page width */}
      <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
        <nav className="flex items-center space-x-1 sm:space-x-2 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 transition whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            Markaz Profili
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 transition whitespace-nowrap ${
              activeTab === 'sms'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            SMS Integratsiyasi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Xodimlar va Rollar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('limits')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 transition whitespace-nowrap ${
              activeTab === 'limits'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            Limitlar & To&apos;lovlar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 transition whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            Baza va Xavfsizlik
          </button>
        </nav>
      </div>

      {/* TAB 1: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 max-w-3xl w-full">
          <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            O&apos;quv Markaz Ma&apos;lumotlari
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Markaz Nomi *</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Aloqa telefoni *</label>
              <input
                type="text"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email manzili</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Ish vaqti</label>
              <input
                type="text"
                value={profile.workingHours}
                onChange={(e) => setProfile({ ...profile, workingHours: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Manzil</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Shartnoma kodi prefiksi</label>
              <input
                type="text"
                value={profile.contractPrefix}
                onChange={(e) => setProfile({ ...profile, contractPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Birlamchi Valyuta</label>
              <input
                type="text"
                disabled
                value={profile.currency}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              O&apos;zgarishlarni saqlash
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SMS Gateway */}
      {activeTab === 'sms' && (
        <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 max-w-3xl w-full">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              SMS Gateway Integratsiyasi
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              O&apos;quvchilarga to&apos;lov eslatmalari va darsga kelmaganlik haqida avtomatik SMS yuborish
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">SMS Provayderi</label>
              <select
                value={smsConfig.provider}
                onChange={(e) => setSmsConfig({ ...smsConfig, provider: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="eskiz">Eskiz.uz API</option>
                <option value="playmobile">PlayMobile</option>
                <option value="sms_uz">SMS.uz</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Sender ID (Originator)</label>
              <input
                type="text"
                value={smsConfig.senderName}
                onChange={(e) => setSmsConfig({ ...smsConfig, senderName: e.target.value })}
                placeholder="4546 yoki OquvMarkaz"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">API Token / Secret Key</label>
              <input
                type="password"
                value={smsConfig.token}
                onChange={(e) => setSmsConfig({ ...smsConfig, token: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Automatic triggers */}
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Avtomatik Bildirishnomalar</h4>
            <label className="flex items-start sm:items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition">
              <input
                type="checkbox"
                checked={smsConfig.autoAttendanceAlert}
                onChange={(e) => setSmsConfig({ ...smsConfig, autoAttendanceAlert: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded mt-0.5 sm:mt-0"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 block">Darsga kelmaganda ota-onaga SMS</span>
                <span className="text-xs text-gray-400">Davomatda &quot;Kelmadi&quot; deb belgilanganda avtomatik SMS yuboriladi</span>
              </div>
            </label>

            <label className="flex items-start sm:items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition">
              <input
                type="checkbox"
                checked={smsConfig.autoPaymentAlert}
                onChange={(e) => setSmsConfig({ ...smsConfig, autoPaymentAlert: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded mt-0.5 sm:mt-0"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 block">To&apos;lov muddati yaqinlashganda eslatma SMS</span>
                <span className="text-xs text-gray-400">Muddatga 3 kun qolganda to&apos;lov summasi bilan eslatma jo&apos;natiladi</span>
              </div>
            </label>
          </div>

          {/* Test SMS */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-4 sm:p-6 rounded-b-2xl space-y-3">
            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Sinov SMS Xabari</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="+998901234567"
                value={smsConfig.testPhone}
                onChange={(e) => setSmsConfig({ ...smsConfig, testPhone: e.target.value })}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSendTestSms}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Sinash
              </button>
            </div>
            {testSmsStatus && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {testSmsStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Users & Roles */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden max-w-4xl w-full">
          <div className="p-4 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-bold text-sm sm:text-base text-gray-800 dark:text-white">Tizim Administratorlari va Xodimlar</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tizimga kirish huquqiga ega bo&apos;lgan boshqaruv xodimlari</p>
          </div>

          <div className="overflow-x-auto w-full scrollbar-none">
            <table className="w-full text-left text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50/40 dark:bg-gray-800/30">
                  <th className="py-3 px-4">Foydalanuvchi</th>
                  <th className="py-3 px-4">Telefon</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">Bosh Administrator (Siz)</td>
                  <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-300">+998900000000</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                      Super Admin
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Faol</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">Receptionist (Qabulxona)</td>
                  <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-300">+998901110000</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                      Administrator
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Faol</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white">Moliya Menejeri</td>
                  <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-300">+998902220000</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                      Manager
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Faol</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Limits */}
      {activeTab === 'limits' && (
        <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5 max-w-3xl w-full">
          <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              Limitlar va To&apos;lovlar
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Guruhdagi jami o&apos;quvchi soni, standart to&apos;lovlar va chegirma chegaralari
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Maksimal o&apos;quvchilar soni (Guruhda)</label>
              <input
                type="number"
                required
                value={limits.maxStudentsPerGroup}
                onChange={(e) => setLimits({ ...limits, maxStudentsPerGroup: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Standart kurs to&apos;lovi (so&apos;m)</label>
              <input
                type="number"
                required
                value={limits.defaultTuitionFee}
                onChange={(e) => setLimits({ ...limits, defaultTuitionFee: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">O&apos;qituvchilar minimal oyligi (so&apos;m)</label>
              <input
                type="number"
                required
                value={limits.minTeacherSalary}
                onChange={(e) => setLimits({ ...limits, minTeacherSalary: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Maksimal chegirma (%)</label>
              <input
                type="number"
                required
                max="100"
                min="0"
                value={limits.discountLimit}
                onChange={(e) => setLimits({ ...limits, discountLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              O&apos;zgarishlarni saqlash
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: Database & Security */}
      {activeTab === 'system' && (
        <div className="space-y-6 max-w-3xl w-full">
          <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Ma&apos;lumotlar Bazasi Holati
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Ma&apos;lumotlar bazasi</span>
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200 mt-1 block">oquv_markaz (MySQL 8.4)</span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Kodlash (Charset)</span>
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200 mt-1 block">utf8mb4_unicode_ci</span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span className="text-xs text-gray-500 dark:text-gray-400 block">Migratsiyalar soni</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">8 / 8 muvaffaqiyatli</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => alert("Baza to'liq zaxiralandi (backup_oquv_markaz_2026.sql)")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
              >
                <Database className="w-3.5 h-3.5" />
                Zaxira nusxa olish (SQL Dump)
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Xavfsizlik & Autentifikatsiya
            </h3>

            <div className="space-y-2.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span>JWT Token muddati:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">24 soat (Access) / 30 kun</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span>Parol shifrlash algoritmi:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">BCrypt (Cost: 13)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span>CORS Himoyasi:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Ruxsat etilgan domenlar faol</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <span>Vaqt zonasi (Timezone):</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">Asia/Tashkent (UTC+5)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
