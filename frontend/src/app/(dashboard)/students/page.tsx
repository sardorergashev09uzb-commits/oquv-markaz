'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Users, Search, UserPlus, Filter, X, Loader2,
  Phone, Mail, Calendar, Eye, Pencil, Trash2, CheckCircle, AlertCircle,
  AlertTriangle, KeyRound
} from 'lucide-react';
import Link from 'next/link';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useCurrentUser } from '@/lib/useCurrentUser';

interface Student {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  status: number;
  groups_count: number;
  created_at: number;
}

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const { isTeacher, isStudent } = useCurrentUser();
  const canManageStudents = !isTeacher && !isStudent;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Yangi o'quvchi form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '+998',
    email: '',
    password: '',
  });
  const [formError, setFormError] = useState('');

  // Tahrirlash form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    status: 10,
    password: '',
  });
  const [editFormError, setEditFormError] = useState('');

  // Arxivlash state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Fetch students
  const { data, isLoading } = useQuery({
    queryKey: ['students', search, statusFilter, page],
    queryFn: async () => {
      const resp = await api.get('/api/students', {
        params: {
          search: search || undefined,
          status: statusFilter !== '' ? statusFilter : undefined,
          page,
          per_page: 15,
        },
      });
      return resp.data;
    },
  });

  // Create student mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const resp = await api.post('/api/students', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
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
        setFormError("O'quvchini saqlashda xatolik yuz berdi");
      }
    },
  });

  // Update student mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: typeof editFormData) => {
      if (!editingStudent) return;
      const resp = await api.put(`/api/students/${editingStudent.id}`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsEditModalOpen(false);
      setEditingStudent(null);
      setEditFormError('');
    },
    onError: (err: { response?: { data?: { errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        setEditFormError(Object.values(errors).flat().join(', '));
      } else {
        setEditFormError("O'quvchi ma'lumotlarini yangilashda xatolik yuz berdi");
      }
    },
  });

  // Delete/Archive student mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await api.delete(`/api/students/${id}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsDeleteModalOpen(false);
      setDeletingStudent(null);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name || !formData.phone) {
      setFormError('Ism va telefon raqami majburiy');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name,
      phone: student.phone,
      email: student.email || '',
      status: student.status,
      password: '',
    });
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.phone) {
      setEditFormError('Ism va telefon raqami majburiy');
      return;
    }
    updateMutation.mutate(editFormData);
  };

  const handleOpenDelete = (student: Student) => {
    setDeletingStudent(student);
    setIsDeleteModalOpen(true);
  };

  const students: Student[] = data?.items || [];
  const pagination = data?.pagination || { total: 0, page: 1, pageCount: 1 };

  return (
    <div className="space-y-6">

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isTeacher ? "Mening O'quvchilarim" : "O'quvchilar"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isTeacher 
              ? `Sizning guruhlaringizdagi jami ${pagination.total} ta faol o'quvchi` 
              : `Jami ${pagination.total} ta o'quvchi ro'yxatga olingan`}
          </p>
        </div>
        {canManageStudents && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yangi o&apos;quvchi</span>
          </button>
        )}
      </div>

      {/* Filter & Search bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Ism, telefon yoki email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-750 transition"
          />
        </div>

        <div className="w-full sm:w-48">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Barcha holatlar' },
              { value: '10', label: 'Faol o\'quvchilar' },
              { value: '0', label: 'Arxiv / Nofaol' },
            ]}
            placeholder="Barcha holatlar"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">Hech qanday o&apos;quvchi topilmadi</p>
            <p className="text-xs text-gray-400 mt-1">Qidiruv parametrlarini o&apos;zgartirib ko&apos;ring yoki yangi o&apos;quvchi qo&apos;shing</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-750">
                <tr>
                  <th className="px-6 py-3.5">O&apos;quvchi</th>
                  <th className="px-6 py-3.5">Telefon</th>
                  <th className="px-6 py-3.5">Guruhlar</th>
                  <th className="px-6 py-3.5">Holati</th>
                  <th className="px-6 py-3.5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <Link
                            href={`/students/${student.id}`}
                            className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition"
                          >
                            {student.name}
                          </Link>
                          {student.email && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {student.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{student.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                        {student.groups_count || 0} ta guruh
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {student.status === 10 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Faol
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500">
                          Arxiv / Nofaol
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/students/${student.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-xs font-medium transition"
                          title="Batafsil ko'rish"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Batafsil</span>
                        </Link>

                        {canManageStudents && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(student)}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                              title="Tahrirlash"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(student)}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                              title="Arxivlash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pageCount > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Sahifa {pagination.page} / {pagination.pageCount}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Oldingi
              </button>
              <button
                disabled={page >= pagination.pageCount}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Yangi o'quvchi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Yangi o&apos;quvchi qo&apos;shish</h3>
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
                  F.I.SH. (Ism va familiya) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: Sardorbek Aliyev"
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
                  Email manzili (ixtiyoriy)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="student@example.com"
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Boshlang&apos;ich parol (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Standart: Student123!"
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
                  <span>Qo&apos;shish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: O'quvchini Tahrirlash (Edit) */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">O&apos;quvchi ma&apos;lumotlarini tahrirlash</h3>
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
                  Email manzili
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="student@example.com"
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
                  <option value={10}>Faol o&apos;quvchi</option>
                  <option value={0}>Arxiv / Nofaol</option>
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

      {/* Modal: O'quvchini Arxivlash Tasdig'i */}
      {isDeleteModalOpen && deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                O&apos;quvchini arxivlashni tasdiqlaysizmi?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong className="text-gray-800 dark:text-gray-200">&quot;{deletingStudent.name}&quot;</strong> arxiv holatiga o&apos;tkaziladi va faol o&apos;quvchilar ro&apos;yxatida ko&apos;rinmaydi.
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
                onClick={() => deleteMutation.mutate(deletingStudent.id)}
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
