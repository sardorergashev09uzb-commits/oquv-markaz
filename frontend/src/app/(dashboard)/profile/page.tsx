'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserFromToken } from '@/lib/auth';
import { User, Shield, Save, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setUser(getCurrentUserFromToken());
  }, []);

  if (!user) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Fake save for now
    setTimeout(() => {
      setSaving(false);
      setMessage("Profil muvaffaqiyatli saqlandi!");
      setTimeout(() => setMessage(''), 3000);
    }, 1000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Mening Profilim</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-6 mb-8 border-b border-gray-100 pb-8">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold">
            {user.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <div className="flex items-center gap-2 text-gray-500 mt-2 text-sm">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="capitalize">{user.role}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To'liq ism</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  defaultValue={user.name}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  defaultValue={user.role}
                  disabled
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm cursor-not-allowed capitalize"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            {message ? (
              <span className="text-emerald-600 text-sm font-medium">{message}</span>
            ) : <div />}
            
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Saqlash</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
