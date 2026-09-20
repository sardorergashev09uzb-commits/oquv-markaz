'use client';

import { useState } from 'react';
import {
  Building2, MessageSquare, Users, Shield, Database, Save, CheckCircle2,
  AlertCircle, Key, RefreshCw, Send, Lock
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tizim Sozlamalari</h1>
        <p className="text-sm text-gray-500 mt-1">
          O&apos;quv markaz profili, SMS shlyuzlari, administratorlar va tizim parametrlari
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Sozlamalar muvaffaqiyatli saqlandi!
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Markaz Profili
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'sms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            SMS Integratsiyasi
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Xodimlar va Rollar
          </button>
          <button
            onClick={() => setActiveTab('limits')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'limits'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Limitlar & To'lovlar
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'system'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4" />
            Baza va Xavfsizlik
          </button>
        </nav>
      </div>

      {/* TAB 1: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5 max-w-3xl">
          <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-3">
            O&apos;quv Markaz Ma&apos;lumotlari
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Markaz Nomi *</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Aloqa telefoni *</label>
              <input
                type="text"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email manzili</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ish vaqti</label>
              <input
                type="text"
                value={profile.workingHours}
                onChange={(e) => setProfile({ ...profile, workingHours: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Manzil</label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Shartnoma kodi prefiksi</label>
              <input
                type="text"
                value={profile.contractPrefix}
                onChange={(e) => setProfile({ ...profile, contractPrefix: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Birlamchi Valyuta</label>
              <input
                type="text"
                disabled
                value={profile.currency}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              O&apos;zgarishlarni saqlash
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SMS Gateway */}
      {activeTab === 'sms' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6 max-w-3xl">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-base text-gray-900">SMS Gateway Integratsiyasi</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              O&apos;quvchilarga to&apos;lov eslatmalari va darsga kelmaganlik haqida avtomatik SMS yuborish
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">SMS Provayderi</label>
              <select
                value={smsConfig.provider}
                onChange={(e) => setSmsConfig({ ...smsConfig, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="eskiz">Eskiz.uz API</option>
                <option value="playmobile">PlayMobile</option>
                <option value="sms_uz">SMS.uz</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sender ID (Originator)</label>
              <input
                type="text"
                value={smsConfig.senderName}
                onChange={(e) => setSmsConfig({ ...smsConfig, senderName: e.target.value })}
                placeholder="4546 yoki OquvMarkaz"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">API Token / Secret Key</label>
              <input
                type="password"
                value={smsConfig.token}
                onChange={(e) => setSmsConfig({ ...smsConfig, token: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Automatic triggers */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Avtomatik Bildirishnomalar</h4>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConfig.autoAttendanceAlert}
                onChange={(e) => setSmsConfig({ ...smsConfig, autoAttendanceAlert: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800 block">Darsga kelmaganda ota-onaga SMS</span>
                <span className="text-xs text-gray-400">Davomatda &quot;Kelmadi&quot; deb belgilanganda avtomatik SMS yuboriladi</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConfig.autoPaymentAlert}
                onChange={(e) => setSmsConfig({ ...smsConfig, autoPaymentAlert: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800 block">To&apos;lov muddati yaqinlashganda eslatma SMS</span>
                <span className="text-xs text-gray-400">Muddatga 3 kun qolganda to&apos;lov summasi bilan eslatma jo&apos;natiladi</span>
              </div>
            </label>
          </div>

          {/* Test SMS */}
          <div className="pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-xl space-y-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Sinov SMS Xabari</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="+998901234567"
                value={smsConfig.testPhone}
                onChange={(e) => setSmsConfig({ ...smsConfig, testPhone: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button
                type="button"
                onClick={handleSendTestSms}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Sinash
              </button>
            </div>
            {testSmsStatus && (
              <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {testSmsStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Users & Roles */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-4xl">
          <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-800">Tizim Administratorlari va Xodimlar</h3>
              <p className="text-xs text-gray-500">Tizimga kirish huquqiga ega bo&apos;lgan boshqaruv xodimlari</p>
            </div>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase bg-gray-50/40">
                <th className="py-3 px-4">Foydalanuvchi</th>
                <th className="py-3 px-4">Telefon</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50/60">
                <td className="py-3.5 px-4 font-bold text-gray-900">Bosh Administrator (Siz)</td>
                <td className="py-3.5 px-4 font-mono text-gray-600">+998900000000</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    Super Admin
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-xs font-bold text-emerald-600">Faol</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50/60">
                <td className="py-3.5 px-4 font-medium text-gray-900">Receptionist (Qabulxona)</td>
                <td className="py-3.5 px-4 font-mono text-gray-600">+998901110000</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    Administrator
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-xs font-bold text-emerald-600">Faol</span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50/60">
                <td className="py-3.5 px-4 font-medium text-gray-900">Moliya Menejeri</td>
                <td className="py-3.5 px-4 font-mono text-gray-600">+998902220000</td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    Manager
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-xs font-bold text-emerald-600">Faol</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: Limits */}
      {activeTab === 'limits' && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5 max-w-3xl">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-base text-gray-900">Limitlar va To'lovlar</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Guruhdagi jami o'quvchi soni, standart to'lovlar, va h.k.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Maksimal o'quvchilar soni (Guruhda)</label>
              <input
                type="number"
                required
                value={limits.maxStudentsPerGroup}
                onChange={(e) => setLimits({ ...limits, maxStudentsPerGroup: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Standart kurs to'lovi (so'm)</label>
              <input
                type="number"
                required
                value={limits.defaultTuitionFee}
                onChange={(e) => setLimits({ ...limits, defaultTuitionFee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">O'qituvchilar minimal oyligi (so'm)</label>
              <input
                type="number"
                required
                value={limits.minTeacherSalary}
                onChange={(e) => setLimits({ ...limits, minTeacherSalary: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Maksimal chegirma (%)</label>
              <input
                type="number"
                required
                max="100"
                min="0"
                value={limits.discountLimit}
                onChange={(e) => setLimits({ ...limits, discountLimit: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition"
            >
              <Save className="w-4 h-4" />
              O'zgarishlarni saqlash
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: Database & Security */}
      {activeTab === 'system' && (
        <div className="space-y-6 max-w-3xl">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Ma&apos;lumotlar Bazasi Holati
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 block">Ma&apos;lumotlar bazasi</span>
                <span className="font-mono font-bold text-gray-800 mt-1 block">oquv_markaz (MySQL 8.4)</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 block">Kodlash (Charset)</span>
                <span className="font-mono font-bold text-gray-800 mt-1 block">utf8mb4_unicode_ci</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-500 block">Migratsiyalar soni</span>
                <span className="font-bold text-emerald-600 mt-1 block">8 / 8 bajarilgan</span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => alert("Baza to'liq zaxiralandi (backup_oquv_markaz_2026.sql)")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Database className="w-3.5 h-3.5" />
                Zaxira nusxa olish (SQL Dump)
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Xavfsizlik & Autentifikatsiya
            </h3>

            <div className="space-y-3 text-xs text-gray-600">
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <span>JWT Token muddati:</span>
                <span className="font-mono font-bold text-gray-900">24 soat (Access) / 30 kun (Refresh)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <span>Parol shifrlash algoritmi:</span>
                <span className="font-mono font-bold text-gray-900">BCrypt (Cost: 13)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <span>CORS Himoyasi:</span>
                <span className="font-mono font-bold text-emerald-600">localhost:3000, oquvmarkaz.uz ruxsat etilgan</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
