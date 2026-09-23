'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BookOpen, Plus, Search, Users, Calendar, DoorOpen,
  GraduationCap, Loader2, X, AlertCircle, Clock,
  Pencil, Trash2, ArrowRight, AlertTriangle
} from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface GroupItem {
  id: number;
  name: string;
  course_id: number;
  course_name: string;
  teacher_id: number;
  teacher_name: string;
  room_id: number | null;
  room_name: string | null;
  schedule: Array<{ day: string; time: string }>;
  start_date: string | null;
  max_students: number;
  students_count: number;
  status: string;
}

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const { isStudent: isUserStudent, isLoading: isUserLoading } = useCurrentUser();
  const [courseFilter, setCourseFilter] = useState('');

  // ─── Create State ──────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    teacher_id: '',
    room_id: '',
    days: 'Dush-Chor-Jum',
    time: '14:00 - 16:00',
    max_students: 16,
    start_date: new Date().toISOString().split('T')[0],
  });
  const [formError, setFormError] = useState('');

  // ─── Edit State ────────────────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    course_id: '',
    teacher_id: '',
    room_id: '',
    days: 'Dush-Chor-Jum',
    time: '14:00 - 16:00',
    max_students: 16,
    start_date: '',
    status: 'active',
  });
  const [editFormError, setEditFormError] = useState('');

  // ─── Delete State ──────────────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<GroupItem | null>(null);

  // ─── 1. Fetch Groups ───────────────────────────────────────────────────────
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups', search, courseFilter],
    queryFn: async () => {
      const resp = await api.get('/api/groups', {
        params: {
          search: search || undefined,
          course_id: courseFilter || undefined,
        },
      });
      return resp.data?.items || [];
    },
  });

  // ─── 2. Fetch Courses for dropdown ─────────────────────────────────────────
  const { data: coursesData } = useQuery({
    queryKey: ['courses-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/courses');
      return resp.data?.items || [];
    },
  });

  // ─── 3. Fetch Teachers for dropdown ────────────────────────────────────────
  const { data: teachersData } = useQuery({
    queryKey: ['teachers-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/teachers');
      return resp.data?.items || [];
    },
  });

  // ─── 4. Fetch Rooms for dropdown ───────────────────────────────────────────
  const { data: roomsData } = useQuery({
    queryKey: ['rooms-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/rooms');
      return resp.data?.items || [];
    },
  });

  // ─── Create Group Mutation ─────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const scheduleArray = data.days.split('-').map((d) => ({
        day: d.trim(),
        time: data.time,
      }));

      const payload = {
        name: data.name,
        course_id: Number(data.course_id),
        teacher_id: Number(data.teacher_id),
        room_id: data.room_id ? Number(data.room_id) : null,
        schedule: scheduleArray,
        start_date: data.start_date,
        max_students: Number(data.max_students),
        status: 'active',
      };

      const resp = await api.post('/api/groups', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        course_id: '',
        teacher_id: '',
        room_id: '',
        days: 'Dush-Chor-Jum',
        time: '14:00 - 16:00',
        max_students: 16,
        start_date: new Date().toISOString().split('T')[0],
      });
      setFormError('');
    },
    onError: (err: { response?: { data?: { errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        setFormError(Object.values(errors).flat().join(', '));
      } else {
        setFormError("Guruh yaratishda xatolik yuz berdi");
      }
    },
  });

  // ─── Update Group Mutation ─────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async (data: typeof editFormData) => {
      if (!editingGroupId) return;
      const scheduleArray = data.days.split('-').map((d) => ({
        day: d.trim(),
        time: data.time,
      }));

      const payload = {
        name: data.name,
        course_id: Number(data.course_id),
        teacher_id: Number(data.teacher_id),
        room_id: data.room_id ? Number(data.room_id) : null,
        schedule: scheduleArray,
        start_date: data.start_date,
        max_students: Number(data.max_students),
        status: data.status,
      };

      const resp = await api.put(`/api/groups/${editingGroupId}`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setIsEditModalOpen(false);
      setEditingGroupId(null);
    },
    onError: (err: { response?: { data?: { errors?: Record<string, string[]> } } }) => {
      const errors = err.response?.data?.errors;
      if (errors) {
        setEditFormError(Object.values(errors).flat().join(', '));
      } else {
        setEditFormError("Guruhni yangilashda xatolik yuz berdi");
      }
    },
  });

  // ─── Delete Group Mutation ─────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await api.delete(`/api/groups/${id}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setIsDeleteModalOpen(false);
      setDeletingGroup(null);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name || !formData.course_id || !formData.teacher_id) {
      setFormError("Guruh nomi, kursi va o'qituvchisi tanlanishi shart");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError('');
    if (!editFormData.name || !editFormData.course_id || !editFormData.teacher_id) {
      setEditFormError("Guruh nomi, kursi va o'qituvchisi tanlanishi shart");
      return;
    }
    updateMutation.mutate(editFormData);
  };

  const handleOpenEdit = (group: GroupItem) => {
    setEditingGroupId(group.id);
    const firstSchedule = group.schedule && group.schedule.length > 0 ? group.schedule[0] : null;
    const daysStr = group.schedule && group.schedule.length > 0 ? group.schedule.map((s) => s.day).join('-') : 'Dush-Chor-Jum';
    const timeStr = firstSchedule ? firstSchedule.time : '14:00 - 16:00';

    setEditFormData({
      name: group.name,
      course_id: String(group.course_id),
      teacher_id: String(group.teacher_id),
      room_id: group.room_id ? String(group.room_id) : '',
      days: daysStr,
      time: timeStr,
      max_students: group.max_students || 16,
      start_date: group.start_date || new Date().toISOString().split('T')[0],
      status: group.status || 'active',
    });
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (group: GroupItem) => {
    setDeletingGroup(group);
    setIsDeleteModalOpen(true);
  };

  const groups: GroupItem[] = groupsData || [];
  const courses = coursesData || [];
  const teachers = teachersData || [];
  const rooms = roomsData || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isUserStudent
              ? "Mening Guruhlarim"
              : "Guruhlar Boshqaruvi"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isUserStudent
              ? "Siz ta'lim olayotgan guruhlar va dars jadvali"
              : `Jami ${groups.length} ta guruh faoliyat ko'rsatmoqda`}
          </p>
        </div>

        {/* Faqat Teacher va Admin ko'radi */}
        {!isUserStudent && !isUserLoading && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi guruh</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Guruh nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div className="w-full sm:w-60">
          <CustomSelect
            value={courseFilter}
            onChange={(val) => setCourseFilter(val)}
            placeholder="Barcha kurslar"
            searchable={courses.length > 5}
            options={[
              { value: '', label: 'Barcha kurslar' },
              ...courses.map((c: { id: number; name: string }) => ({
                value: String(c.id),
                label: c.name,
              })),
            ]}
          />
        </div>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Hech qanday guruh topilmadi</p>
          <p className="text-xs text-gray-400 mt-1">
            {isUserStudent
              ? "Siz hali hech qaysi guruhga biriktirilmagansiz"
              : "Yangi guruh oching yoki qidiruvni tozalang"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/groups/${group.id}`}
                    className="font-bold text-gray-900 dark:text-white text-base hover:text-blue-600 dark:hover:text-blue-400 transition"
                  >
                    {group.name}
                  </Link>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 capitalize">
                    {group.status}
                  </span>
                </div>

                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                  {group.course_name}
                </p>

                <div className="space-y-2 mt-4 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>O&apos;qituvchi: <strong className="text-gray-900 dark:text-white">{group.teacher_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Xona: <strong className="text-gray-900 dark:text-white">{group.room_name || 'Belgilanmagan'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>
                      Jadval: {group.schedule?.length ? group.schedule.map((s) => `${s.day} (${s.time})`).join(', ') : 'Belgilanmagan'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Users className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    <strong className="text-gray-900 dark:text-white">{group.students_count}</strong> / {group.max_students} o&apos;quvchi
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/groups/${group.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition"
                    title="Guruhga kirish"
                  >
                    <span>Guruh</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {!isUserStudent && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(group)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer"
                        title="Tahrirlash"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(group)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                        title="O'chirish / Arxivlash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Yangi Guruh Ochish */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Yangi guruh yaratish</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
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
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Guruh nomi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Front-end React 12"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Kursni tanlang *
                  </label>
                  <select
                    required
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">Kursni tanlang...</option>
                    {courses.map((c: { id: number; name: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    O&apos;qituvchi *
                  </label>
                  <select
                    required
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">O&apos;qituvchini tanlang...</option>
                    {teachers.map((t: { id: number; name: string }) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Dars xonasi
                  </label>
                  <select
                    value={formData.room_id}
                    onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">Xonani tanlang (ixtiyoriy)...</option>
                    {rooms.map((r: { id: number; name: string }) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Maksimal o&apos;quvchilar soni
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.max_students}
                    onChange={(e) => setFormData({ ...formData, max_students: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Hafta kunlari
                  </label>
                  <input
                    type="text"
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                    placeholder="Dush-Chor-Jum"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Dars vaqti
                  </label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="14:00 - 16:00"
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Ochish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Guruhni Tahrirlash (Edit) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Guruh ma&apos;lumotlarini tahrirlash</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
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
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Guruh nomi *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Kurs *
                  </label>
                  <select
                    required
                    value={editFormData.course_id}
                    onChange={(e) => setEditFormData({ ...editFormData, course_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">Kursni tanlang...</option>
                    {courses.map((c: { id: number; name: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    O&apos;qituvchi *
                  </label>
                  <select
                    required
                    value={editFormData.teacher_id}
                    onChange={(e) => setEditFormData({ ...editFormData, teacher_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">O&apos;qituvchini tanlang...</option>
                    {teachers.map((t: { id: number; name: string }) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Dars xonasi
                  </label>
                  <select
                    value={editFormData.room_id}
                    onChange={(e) => setEditFormData({ ...editFormData, room_id: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">Xonani tanlang...</option>
                    {rooms.map((r: { id: number; name: string }) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Maksimal o&apos;quvchilar soni
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editFormData.max_students}
                    onChange={(e) => setEditFormData({ ...editFormData, max_students: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Hafta kunlari
                  </label>
                  <input
                    type="text"
                    value={editFormData.days}
                    onChange={(e) => setEditFormData({ ...editFormData, days: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Dars vaqti
                  </label>
                  <input
                    type="text"
                    value={editFormData.time}
                    onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Holati
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="active">Faol (Active)</option>
                    <option value="completed">Yakunlangan (Completed)</option>
                    <option value="cancelled">Bekor qilingan (Cancelled)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Guruhni O'chirish / Arxivlash tasdig'i */}
      {isDeleteModalOpen && deletingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Guruhni o&apos;chirishni tasdiqlaysizmi?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong className="text-gray-800 dark:text-gray-200">&quot;{deletingGroup.name}&quot;</strong> guruhi arxiv holatiga o&apos;tkaziladi va faol guruhlar ro&apos;yxatidan olib tashlanadi.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingGroup.id)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
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
