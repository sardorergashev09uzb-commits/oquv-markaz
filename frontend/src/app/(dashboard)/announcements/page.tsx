'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Bell, Plus, Calendar, Megaphone, Trash2, X,
  Loader2, CheckCircle2, AlertCircle, Users
} from 'lucide-react';
import { getCurrentUserFromToken, isStudent } from '@/lib/auth';

interface AnnouncementItem {
  id: number;
  author_id: number;
  author_name: string | null;
  target_type: string;
  title: string;
  content: string;
  published_at: number;
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();

  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) {
      setCanCreate(!isStudent(user.role));
    }
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_type: 'all',
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Fetch Announcements
  const { data, isLoading } = useQuery({
    queryKey: ['announcements-list'],
    queryFn: async () => {
      const resp = await api.get('/api/announcements');
      return resp.data?.items || [];
    },
  });

  // Create Announcement Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post('/api/announcements', formData);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-list'] });
      setIsModalOpen(false);
      setFormData({ title: '', content: '', target_type: 'all' });
      setSuccessMessage("E'lon barchaga e'lon qilindi va bildirishnomalar yuborildi!");
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: () => {
      setFormError("E'lonni chop etishda xatolik yuz berdi");
    },
  });

  // Delete Announcement Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await api.delete(`/api/announcements/${id}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-list'] });
    },
  });

  const announcements: AnnouncementItem[] = data || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">E&apos;lonlar Taxtasi</h1>
          <p className="text-sm text-gray-500">
            Markaziy e&apos;lonlar, bayram tabriklari va muhim xabarnomalar
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi e&apos;lon</span>
          </button>
        )}
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Announcements List */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Hozircha e&apos;lonlar mavjud emas</p>
          <p className="text-xs text-gray-400 mt-1">Yangi e&apos;lon chop eting</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{item.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Muallif: {item.author_name || 'Admin'} • {new Date(item.published_at * 1000).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    Barcha uchun
                  </span>
                  {canCreate && (
                    <button
                      onClick={() => {
                        if (confirm("Ushbu e'lonni o'chirishni xohlaysizmi?")) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-700 leading-relaxed pt-2 border-t border-gray-50 whitespace-pre-line">
                {item.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Yangi E'lon */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Yangi e&apos;lon chop etish</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  E&apos;lon sarlavhasi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masalan: Navro'z bayrami munosabati bilan..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kimlar uchun *
                </label>
                <select
                  value={formData.target_type}
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="all">Barcha o&apos;quvchilar va xodimlar</option>
                  <option value="group">Muayyan guruh uchun</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  E&apos;lon matni *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Batafsil ma'lumot, sana va vaqtlar..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !formData.title || !formData.content}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Chop etish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
