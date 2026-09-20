'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BookMarked, Plus, Calendar, Clock, Award,
  Loader2, X, AlertCircle, CheckCircle, FileText, CheckCircle2
} from 'lucide-react';

interface HomeworkItem {
  id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  max_score: number;
  submissions_count: number;
  created_at: number;
}

export default function HomeworkPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    group_id: '',
    lesson_id: '',
    title: '',
    description: '',
    deadline: '',
    max_score: 10,
  });
  const [formError, setFormError] = useState('');

  // 1. Fetch Homeworks
  const { data, isLoading } = useQuery({
    queryKey: ['homework-list'],
    queryFn: async () => {
      const resp = await api.get('/api/homework');
      return resp.data?.items || [];
    },
  });

  // 2. Fetch Groups for dropdown
  const { data: groupsData } = useQuery({
    queryKey: ['groups-for-hw'],
    queryFn: async () => {
      const resp = await api.get('/api/groups');
      return resp.data?.items || [];
    },
  });

  // 3. Fetch Lessons for selected group
  const { data: lessonsData } = useQuery({
    queryKey: ['lessons-for-hw', formData.group_id],
    queryFn: async () => {
      if (!formData.group_id) return [];
      const resp = await api.get('/api/attendance', { params: { group_id: formData.group_id } });
      return resp.data?.lessons || [];
    },
    enabled: !!formData.group_id,
  });

  // Create Homework Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const resp = await api.post('/api/homework', {
        lesson_id: Number(payload.lesson_id),
        title: payload.title,
        description: payload.description,
        deadline: payload.deadline || null,
        max_score: Number(payload.max_score),
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-list'] });
      setIsModalOpen(false);
      setFormData({
        group_id: '',
        lesson_id: '',
        title: '',
        description: '',
        deadline: '',
        max_score: 10,
      });
      setFormError('');
    },
    onError: () => {
      setFormError("Uy vazifasini yaratishda xatolik yuz berdi");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lesson_id || !formData.title) {
      setFormError('Dars va vazifa sarlavhasi kiritilishi shart');
      return;
    }
    createMutation.mutate(formData);
  };

  const homeworks: HomeworkItem[] = data || [];
  const groups = groupsData || [];
  const lessons = lessonsData || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Uy Vazifalari</h1>
          <p className="text-sm text-gray-500">
            Darslar bo&apos;yicha topshiriqlar berish, muddatlar va baholash
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi vazifa</span>
        </button>
      </div>

      {/* Homework Grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : homeworks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Hozircha uy vazifalari mavjud emas</p>
          <p className="text-xs text-gray-400 mt-1">Yangi topshiriq yarating</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {homeworks.map((hw) => (
            <div
              key={hw.id}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 text-base">{hw.title}</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    Max: {hw.max_score} ball
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-2 line-clamp-3">
                  {hw.description || 'Topshiriq tavsifi kiritilmagan'}
                </p>

                <div className="space-y-2 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Dars ID: #{hw.lesson_id}</span>
                  </div>

                  {hw.deadline && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Muddat: {new Date(hw.deadline).toLocaleString('uz-UZ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-600">
                  {hw.submissions_count || 0} ta topshirilgan
                </span>
                <span className="text-gray-400">
                  {new Date(hw.created_at * 1000).toLocaleDateString('uz-UZ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Yangi Vazifa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Yangi uy vazifasi berish</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Guruhni tanlang *
                </label>
                <select
                  required
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value, lesson_id: '' })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="">Guruhni tanlang...</option>
                  {groups.map((g: { id: number; name: string }) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Darsni tanlang *
                </label>
                <select
                  required
                  disabled={!formData.group_id}
                  value={formData.lesson_id}
                  onChange={(e) => setFormData({ ...formData, lesson_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-gray-100"
                >
                  <option value="">Darsni tanlang...</option>
                  {lessons.map((l: { id: number; topic: string; started_at: string }) => (
                    <option key={l.id} value={l.id}>
                      #{l.id} - {l.topic} ({new Date(l.started_at).toLocaleDateString('uz-UZ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Topshiriq sarlavhasi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masalan: Essay Writing Task 2 & Reading Passages"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Maksimal ball
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Topshirish muddati
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Batafsil topshiriq tavsifi
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Vazifa tafsilotlari, kitob betlari yoki savollar..."
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
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
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
