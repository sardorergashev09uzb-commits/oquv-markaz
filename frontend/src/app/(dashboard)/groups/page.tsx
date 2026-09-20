'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BookOpen, Plus, Search, Users, Calendar, DoorOpen,
  GraduationCap, Loader2, X, AlertCircle, Eye, Clock
} from 'lucide-react';
import Link from 'next/link';

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

  const [isManager, setIsManager] = useState<boolean>(false);
  useEffect(() => {
    import('@/lib/auth').then(({ getCurrentUserFromToken, canManage }) => {
      const user = getCurrentUserFromToken();
      if (user) setIsManager(canManage(user.role));
    });
  }, []);
  const [courseFilter, setCourseFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Group Form
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

  // 1. Fetch Groups
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

  // 2. Fetch Courses for dropdown
  const { data: coursesData } = useQuery({
    queryKey: ['courses-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/courses');
      return resp.data?.items || [];
    },
  });

  // 3. Fetch Teachers for dropdown
  const { data: teachersData } = useQuery({
    queryKey: ['teachers-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/teachers');
      return resp.data?.items || [];
    },
  });

  // 4. Fetch Rooms for dropdown
  const { data: roomsData } = useQuery({
    queryKey: ['rooms-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/rooms');
      return resp.data?.items || [];
    },
  });

  // Create Group Mutation
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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name || !formData.course_id || !formData.teacher_id) {
      setFormError("Guruh nomi, kursi va o'qituvchisi tanlanishi shart");
      return;
    }
    createMutation.mutate(formData);
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
          <h1 className="text-xl font-bold text-gray-900">Guruhlar</h1>
          <p className="text-sm text-gray-500">
            Jami {groups.length} ta guruh faoliyat ko&apos;rsatmoqda
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi guruh</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Guruh nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="">Barcha kurslar</option>
            {courses.map((c: { id: number; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Hech qanday guruh topilmadi</p>
          <p className="text-xs text-gray-400 mt-1">Yangi guruh oching yoki qidiruvni tozalang</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 text-base">{group.name}</h3>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {group.status}
                  </span>
                </div>

                <p className="text-xs font-medium text-blue-600 mt-1">
                  {group.course_name}
                </p>

                <div className="space-y-2 mt-4 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    <span>O&apos;qituvchi: <strong>{group.teacher_name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-gray-400" />
                    <span>Xona: <strong>{group.room_name || 'Belgilanmagan'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>
                      Jadval: {group.schedule?.length ? group.schedule.map((s) => s.day).join(', ') : 'Belgilanmagan'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>
                    <strong>{group.students_count}</strong> / {group.max_students} o&apos;quvchi
                  </span>
                </div>

                <Link
                  href={`/groups/${group.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Batafsil</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Yangi Guruh Ochish */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Yangi guruh ochish</h3>
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
                  Guruh nomi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: IELTS Morning-1"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kurs *
                  </label>
                  <select
                    required
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    O&apos;qituvchi *
                  </label>
                  <select
                    required
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Xona (ixtiyoriy)
                  </label>
                  <select
                    value={formData.room_id}
                    onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Maksimal o&apos;quvchilar soni
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.max_students}
                    onChange={(e) => setFormData({ ...formData, max_students: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Hafta kunlari
                  </label>
                  <input
                    type="text"
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                    placeholder="Dush-Chor-Jum"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Dars vaqti
                  </label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="14:00 - 16:00"
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
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
                  <span>Ochish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
