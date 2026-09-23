'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  User, Phone, Mail, Calendar, BookOpen, ChevronLeft,
  Loader2, CheckCircle, AlertCircle, PlusCircle, Shield,
  Pencil, Trash2, AlertTriangle, KeyRound, X
} from 'lucide-react';
import Link from 'next/link';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useCurrentUser } from '@/lib/useCurrentUser';

interface StudentGroup {
  membership_id: number;
  group_id: number;
  group_name: string;
  course_name: string;
  teacher_name: string;
  enrolled_at: string;
  status: string;
}

export default function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isTeacher, isStudent } = useCurrentUser();
  const canManage = !isTeacher && !isStudent;

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [assignError, setAssignError] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  // 1. Fetch Student Details
  const { data, isLoading, isError } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const resp = await api.get(`/api/students/${studentId}`);
      return resp.data;
    },
  });

  // 2. Fetch all groups for assign dropdown
  const { data: groupsData } = useQuery({
    queryKey: ['groups-all'],
    queryFn: async () => {
      const resp = await api.get('/api/groups');
      return resp.data?.items || [];
    },
  });

  // 3. Assign to group mutation
  const assignMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const resp = await api.post(`/api/students/${studentId}/assign-group`, {
        group_id: groupId,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setSelectedGroupId('');
      setAssignError('');
    },
    onError: () => {
      setAssignError("Guruhga biriktirishda xatolik yuz berdi");
    },
  });

  // 4. Update student mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: typeof editFormData) => {
      const resp = await api.put(`/api/students/${studentId}`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsEditModalOpen(false);
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

  // 5. Delete/Archive student mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.delete(`/api/students/${studentId}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsDeleteModalOpen(false);
      router.push('/students');
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !data?.student) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-700 dark:text-gray-300 font-semibold">O&apos;quvchi topilmadi</p>
        <Link href="/students" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          &larr; O&apos;quvchilar ro&apos;yxatiga qaytish
        </Link>
      </div>
    );
  }

  const student = data.student;
  const groups: StudentGroup[] = data.groups || [];
  const availableGroups = (groupsData || []).filter(
    (g: { id: number }) => !groups.some((mg) => mg.group_id === g.id && mg.status === 'active')
  );

  const handleOpenEdit = () => {
    setEditFormData({
      name: student.name || '',
      phone: student.phone || '',
      email: student.email || '',
      status: student.status ?? 10,
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Back button */}
      <div>
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>O&apos;quvchilar ro&apos;yxatiga</span>
        </Link>
      </div>

      {/* Student Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{student.name}</h1>
                {student.status === 10 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle className="w-3 h-3" /> Faol o&apos;quvchi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500">
                    Arxiv / Nofaol
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">ID: #{student.id} • Rol: O&apos;quvchi</p>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Tahrirlash</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Arxivlash</span>
              </button>
            </div>
          )}
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 text-sm">
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
            <Phone className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Telefon</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">{student.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
            <Mail className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Email</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">{student.email || 'Kiritilmagan'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Ro&apos;yxatdan o&apos;tgan</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {student.created_at ? new Date(student.created_at * 1000).toLocaleDateString('uz-UZ') : 'Noma\'lum'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Groups Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Biriktirilgan Guruhlar</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">O&apos;quvchi ta&apos;lim olayotgan kurslar</p>
          </div>

          {/* Add to group form */}
          {canManage && availableGroups.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-64">
                <CustomSelect
                  value={selectedGroupId}
                  onChange={(val) => setSelectedGroupId(val)}
                  placeholder="Guruhni tanlang..."
                  searchable={availableGroups.length > 5}
                  options={availableGroups.map((g: { id: number; name: string; course_name: string }) => ({
                    value: String(g.id),
                    label: g.name,
                    subLabel: g.course_name,
                  }))}
                />
              </div>
              <button
                disabled={!selectedGroupId || assignMutation.isPending}
                onClick={() => selectedGroupId && assignMutation.mutate(Number(selectedGroupId))}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer"
              >
                {assignMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                <span>Biriktirish</span>
              </button>
            </div>
          )}
        </div>

        {assignError && (
          <p className="text-xs text-red-600">{assignError}</p>
        )}

        {groups.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            Hozircha hech qanday guruhga biriktirilmagan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {groups.map((g) => (
              <div
                key={g.membership_id}
                className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <Link
                      href={`/groups/${g.group_id}`}
                      className="font-bold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition"
                    >
                      {g.group_name}
                    </Link>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Kurs: {g.course_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">O&apos;qituvchi: {g.teacher_name}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">Qo&apos;shilgan: {g.enrolled_at}</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-green-100 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-300">
                  {g.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: O'quvchini Tahrirlash */}
      {isEditModalOpen && (
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
                  placeholder="Parolni yangilamoqchi bo'lsangiz yozing"
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
      {isDeleteModalOpen && (
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
                <strong className="text-gray-800 dark:text-gray-200">&quot;{student.name}&quot;</strong> arxiv holatiga o&apos;tkaziladi va faol o&apos;quvchilar ro&apos;yxatida ko&apos;rinmaydi.
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
                onClick={() => deleteMutation.mutate()}
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
