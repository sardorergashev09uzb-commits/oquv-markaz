'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BookOpen, Plus, Search, Clock, DollarSign, Users,
  Loader2, X, AlertCircle, CheckCircle, Pencil, Trash2, AlertTriangle
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { getCurrentUserFromToken, canManage } from '@/lib/auth';
import { CustomSelect } from '@/components/ui/CustomSelect';

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
  const [statusFilter, setStatusFilter] = useState('');

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    level: 'A1-B2',
    duration_months: 3,
    price: 500000,
    description: '',
  });
  const [formError, setFormError] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    level: '',
    duration_months: 3,
    price: 500000,
    description: '',
    status: 1,
  });
  const [editFormError, setEditFormError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<CourseItem | null>(null);

  // Fetch Courses
  const { data, isLoading } = useQuery({
    queryKey: ['courses', search, statusFilter],
    queryFn: async () => {
      const resp = await api.get('/api/courses', {
        params: {
          search: search || undefined,
          status: statusFilter !== '' ? statusFilter : undefined,
        },
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

  // Update Course Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: typeof editFormData) => {
      if (!editingCourse) return;
      const resp = await api.put(`/api/courses/${editingCourse.id}`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsEditModalOpen(false);
      setEditingCourse(null);
      setEditFormError('');
    },
    onError: () => {
      setEditFormError("Kursni yangilashda xatolik yuz berdi");
    },
  });

  // Delete Course Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await api.delete(`/api/courses/${id}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsDeleteModalOpen(false);
      setDeletingCourse(null);
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

  const handleOpenEdit = (course: CourseItem) => {
    setEditingCourse(course);
    setEditFormData({
      name: course.name,
      level: course.level || '',
      duration_months: course.duration_months || 3,
      price: course.price || 0,
      description: course.description || '',
      status: course.status ?? 1,
    });
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name) {
      setEditFormError('Kurs nomi kiritilishi shart');
      return;
    }
    updateMutation.mutate(editFormData);
  };

  const handleOpenDelete = (course: CourseItem) => {
    setDeletingCourse(course);
    setIsDeleteModalOpen(true);
  };

  const courses: CourseItem[] = data || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Kurslar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Jami {courses.length} ta o&apos;quv yo&apos;nalishi mavjud
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi kurs</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Kurs nomi yoki darajasi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition"
          />
        </div>

        <div className="w-full sm:w-48">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: '', label: 'Barcha holatlar' },
              { value: '1', label: 'Faol kurslar' },
              { value: '0', label: 'Arxiv / Nofaol' },
            ]}
            placeholder="Barcha holatlar"
          />
        </div>
      </div>

      {/* Courses Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Hech qanday kurs topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg leading-snug">{course.name}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {course.level && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                        {course.level}
                      </span>
                    )}
                    {course.status === 1 ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="Faol" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400" title="Arxiv / Nofaol" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                  {course.description || 'Tavsif kiritilmagan'}
                </p>

                <div className="space-y-2.5 mt-5 pt-4 border-t border-gray-100 dark:border-gray-750 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Clock className="w-4 h-4" /> Davomiyligi:
                    </span>
                    <strong className="text-gray-800 dark:text-gray-100">{course.duration_months} oy</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <DollarSign className="w-4 h-4" /> Oylik to&apos;lov:
                    </span>
                    <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatMoney(course.price)}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Users className="w-4 h-4" /> Faol guruhlar:
                    </span>
                    <strong className="text-blue-600 dark:text-blue-400 font-bold">{course.groups_count || 0} ta</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Manager */}
              {isManager && (
                <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-750 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(course)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Tahrirlash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(course)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                    title="Arxivlash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Arxivlash</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Yangi Kurs */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Yangi kurs qo&apos;shish</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900 rounded-xl text-red-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Kurs nomi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: IELTS Intensive"
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Darajasi (Level)
                  </label>
                  <input
                    type="text"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    placeholder="B1-B2"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Davomiyligi (oy)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Oylik to&apos;lov (so&apos;m)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tavsif
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kurs haqida qisqacha ma'lumot..."
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Kursni Tahrirlash (Edit) */}
      {isEditModalOpen && editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Kursni tahrirlash</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editFormError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900 rounded-xl text-red-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Kurs nomi *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Darajasi (Level)
                  </label>
                  <input
                    type="text"
                    value={editFormData.level}
                    onChange={(e) => setEditFormData({ ...editFormData, level: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Davomiyligi (oy)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.duration_months}
                    onChange={(e) => setEditFormData({ ...editFormData, duration_months: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Oylik to&apos;lov (so&apos;m)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Holati
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value={1}>Faol kurs</option>
                    <option value={0}>Nofaol / Arxiv</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tavsif
                </label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Yangilash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Kursni Arxivlash Tasdig'i */}
      {isDeleteModalOpen && deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Kursni arxivlashni tasdiqlaysizmi?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong className="text-gray-800 dark:text-gray-200">&quot;{deletingCourse.name}&quot;</strong> kursi arxiv holatiga o&apos;tkaziladi va faol kurslar ro&apos;yxatida ko&apos;rinmaydi.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingCourse.id)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Ha, arxivlash</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
