'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  GraduationCap, Plus, Search, Phone, Mail, BookOpen,
  Loader2, X, AlertCircle, CheckCircle, Pencil, Trash2, AlertTriangle, KeyRound
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useCurrentUser } from '@/lib/useCurrentUser';

interface TeacherItem {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  groups_count: number;
  status: number;
  created_at: number;
}

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const { isTeacher: isUserTeacher, isStudent } = useCurrentUser();
  const canManageTeachers = !isUserTeacher && !isStudent;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '+998',
    email: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    status: 10,
    password: '',
  });
  const [editFormError, setEditFormError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTeacher, setDeletingTeacher] = useState<TeacherItem | null>(null);

  // Fetch Teachers
  const { data, isLoading } = useQuery({
    queryKey: ['teachers', search, statusFilter],
    queryFn: async () => {
      const resp = await api.get('/api/teachers', {
        params: {
          search: search || undefined,
          status: statusFilter !== '' ? statusFilter : undefined,
        },
      });
      return resp.data?.items || [];
    },
  });

  // Create Teacher Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const resp = await api.post('/api/teachers', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsModalOpen(false);
      setFormData({ name: '', phone: '+998', email: '', password: '' });
      setFormError('');
    },
    onError: (err: { response?: { data?: { errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        setFormError(Object.values(errors).flat().join(', '));
      } else {
        setFormError("O'qituvchini saqlashda xatolik yuz berdi");
      }
    },
  });

  // Update Teacher Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: typeof editFormData) => {
      if (!editingTeacher) return;
      const resp = await api.put(`/api/teachers/${editingTeacher.id}`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsEditModalOpen(false);
      setEditingTeacher(null);
      setEditFormError('');
    },
    onError: (err: { response?: { data?: { errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        setEditFormError(Object.values(errors).flat().join(', '));
      } else {
        setEditFormError("O'qituvchi ma'lumotlarini yangilashda xatolik yuz berdi");
      }
    },
  });

  // Delete/Archive Teacher Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await api.delete(`/api/teachers/${id}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsDeleteModalOpen(false);
      setDeletingTeacher(null);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      setFormError('Ism va telefon raqami kiritilishi shart');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleOpenEdit = (teacher: TeacherItem) => {
    setEditingTeacher(teacher);
    setEditFormData({
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email || '',
      status: teacher.status,
      password: '',
    });
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.phone) {
      setEditFormError('Ism va telefon raqami kiritilishi shart');
      return;
    }
    updateMutation.mutate(editFormData);
  };

  const handleOpenDelete = (teacher: TeacherItem) => {
    setDeletingTeacher(teacher);
    setIsDeleteModalOpen(true);
  };

  const teachers: TeacherItem[] = data || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">O&apos;qituvchilar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Jami {teachers.length} nafar o&apos;qituvchi faoliyat yuritmoqda
          </p>
        </div>
        {canManageTeachers && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi o&apos;qituvchi</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="O'qituvchi ismi, telefoni yoki emaili..."
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
              { value: '10', label: 'Faol o\'qituvchilar' },
              { value: '0', label: 'Arxiv / Nofaol' },
            ]}
            placeholder="Barcha holatlar"
          />
        </div>
      </div>

      {/* Teachers Grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
          <GraduationCap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Hech qanday o&apos;qituvchi topilmadi</p>
          <p className="text-xs text-gray-400 mt-1">Qidiruv parametrlarini o&apos;zgartirib ko&apos;ring</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-lg">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{teacher.name}</h3>
                      {teacher.status === 10 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                          <CheckCircle className="w-3 h-3" /> Faol o&apos;qituvchi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                          Nofaol / Arxiv
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{teacher.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{teacher.email || 'Email kiritilmagan'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <BookOpen className="w-4 h-4 text-violet-500 shrink-0" />
                  <span>
                    <strong>{teacher.groups_count || 0}</strong> ta guruh
                  </span>
                </div>

                {canManageTeachers && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(teacher)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Tahrirlash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(teacher)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                      title="Arxivlash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Arxiv</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Yangi O'qituvchi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Yangi o&apos;qituvchi qo&apos;shish</h3>
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
                  F.I.SH. *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: Sardorbek Karimov"
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Telefon raqami *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="teacher@example.com"
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Boshlang&apos;ich parol
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Standart: Teacher123!"
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

      {/* Modal: O'qituvchini Tahrirlash (Edit) */}
      {isEditModalOpen && editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">O&apos;qituvchini tahrirlash</h3>
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
                  F.I.SH. *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Telefon raqami *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="teacher@example.com"
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
                  <option value={10}>Faol o&apos;qituvchi</option>
                  <option value={0}>Nofaol / Arxiv</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                  <span>Yangi parol o&apos;rnatish (ixtiyoriy)</span>
                </label>
                <input
                  type="text"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="O'zgartirish kerak bo'lsa yangi parol yozing"
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

      {/* Modal: O'qituvchini Arxivlash Tasdig'i */}
      {isDeleteModalOpen && deletingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                O&apos;qituvchini arxivlashni tasdiqlaysizmi?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong className="text-gray-800 dark:text-gray-200">&quot;{deletingTeacher.name}&quot;</strong> nofaol holatga o&apos;tkaziladi va tizimga kirish cheklanadi.
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
                onClick={() => deleteMutation.mutate(deletingTeacher.id)}
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
