'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BookOpen, Plus, Search, Clock, DollarSign, Users,
  Loader2, X, AlertCircle, CheckCircle, Edit2
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { getCurrentUserFromToken, canManage } from '@/lib/auth';

interface CourseItem {
  id: number;
  name: string;
  level: string | null;
  description: string | null;
  duration_months: number;
  price: number;
  groups_count: number;
  status: number;
}

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) {
      setIsManager(canManage(user.role));
    }
  }, []);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    level: 'A1-B2',
    duration_months: 3,
    price: 500000,
    description: '',
  });
  const [formError, setFormError] = useState('');

  // Fetch Courses
  const { data, isLoading } = useQuery({
    queryKey: ['courses', search],
    queryFn: async () => {
      const resp = await api.get('/api/courses', {
        params: { search: search || undefined },
      });
      return resp.data?.items || [];
    },
  });

  // Create Course Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const resp = await api.post('/api/courses', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        level: 'A1-B2',
        duration_months: 3,
        price: 500000,
        description: '',
      });
      setFormError('');
    },
    onError: () => {
      setFormError("Kursni yaratishda xatolik yuz berdi");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setFormError('Kurs nomi kiritilishi shart');
      return;
    }
    createMutation.mutate(formData);
  };

  const courses: CourseItem[] = data || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kurslar</h1>
          <p className="text-sm text-gray-500">
            Jami {courses.length} ta o&apos;quv yo&apos;nalishi mavjud
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi kurs</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Kurs nomi yoki darajasi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Courses Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Hech qanday kurs topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 text-lg leading-snug">{course.name}</h3>
                  {course.level && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                      {course.level}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {course.description || 'Tavsif kiritilmagan'}
                </p>

                <div className="space-y-2.5 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Clock className="w-4 h-4" /> Davomiyligi:
                    </span>
                    <strong className="text-gray-800">{course.duration_months} oy</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <DollarSign className="w-4 h-4" /> Oylik to&apos;lov:
                    </span>
                    <strong className="text-emerald-700 font-bold">{formatMoney(course.price)}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Users className="w-4 h-4" /> Faol guruhlar:
                    </span>
                    <strong className="text-blue-600 font-bold">{course.groups_count || 0} ta</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Yangi Kurs */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Yangi kurs qo&apos;shish</h3>
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
                  Kurs nomi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: IELTS Intensive"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Darajasi (Level)
                  </label>
                  <input
                    type="text"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    placeholder="B1-B2"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Davomiyligi (oy)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Oylik to&apos;lov (so&apos;m)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tavsif
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kurs haqida qisqacha ma'lumot..."
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
