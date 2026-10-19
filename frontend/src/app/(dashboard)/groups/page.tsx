'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BookOpen, Plus, Search, Users, Calendar, DoorOpen,
  GraduationCap, Loader2, X, AlertCircle, Clock,
  Pencil, Trash2, ArrowRight, AlertTriangle, RotateCcw, Sparkles
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
  end_date: string | null;
  max_students: number;
  students_count: number;
  lessons_count?: number;
  status: string;
}

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const { user, isStudent: isUserStudent, isTeacher: isUserTeacher, isLoading: isUserLoading } = useCurrentUser();
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ─── Create State ──────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    teacher_id: '',
    room_id: '',
    days: 'Dush-Chor-Jum',
    time: '14:00 - 16:00',
    duration_months: 3,
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

  // ─── Delete State (Archive) ────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<GroupItem | null>(null);

  // ─── Force Delete State (Permanent) ────────────────────────────────────────
  const [isForceDeleteModalOpen, setIsForceDeleteModalOpen] = useState(false);
  const [forceDeletingGroup, setForceDeletingGroup] = useState<GroupItem | null>(null);
  const [forceDeleteError, setForceDeleteError] = useState('');

  // ─── Bulk Delete State ─────────────────────────────────────────────────────
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // ─── 1. Fetch Groups ───────────────────────────────────────────────────────
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups', search, courseFilter, statusFilter],
    queryFn: async () => {
      const resp = await api.get('/api/groups', {
        params: {
          search: search || undefined,
          course_id: courseFilter || undefined,
          status: statusFilter || undefined,
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
        days: data.days,
        time: data.time,
        duration_months: Number(data.duration_months),
        schedule: scheduleArray,
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        max_students: Number(data.max_students),
        status: 'active',
      };

      const resp = await api.post('/api/groups', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-teacher'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        course_id: '',
        teacher_id: isUserTeacher && user?.id ? String(user.id) : '',
        room_id: '',
        days: 'Dush-Chor-Jum',
        time: '14:00 - 16:00',
        duration_months: 3,
        max_students: 16,
        start_date: new Date().toISOString().split('T')[0],
      });
      setFormError('');
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      if (errors) {
        setFormError(Object.values(errors).flat().join(', '));
      } else if (message) {
        setFormError(message);
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

  // ─── Delete Group Mutation (Archive) ───────────────────────────────────────
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

  // ─── Restore Group Mutation (Unarchive) ────────────────────────────────────
  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const resp = await api.post(`/api/groups/${id}/restore`);
        return resp.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          const fallback = await api.put(`/api/groups/${id}`, { status: 'active' });
          return fallback.data;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Guruhni qayta faollashtirishda xatolik yuz berdi");
    },
  });

  // ─── Force Delete Group Mutation (Permanent) ───────────────────────────────
  const forceDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const resp = await api.delete(`/api/groups/${id}/force`);
        return resp.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          const fallback = await api.delete(`/api/groups/${id}`, { params: { force: 1 } });
          return fallback.data;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsForceDeleteModalOpen(false);
      setForceDeletingGroup(null);
      setForceDeleteError('');
    },
    onError: (err: any) => {
      setForceDeleteError(err.response?.data?.message || "Guruhni butunlay o'chirishda xatolik yuz berdi");
    },
  });

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      for (const id of selectedGroupIds) {
        try {
          await api.delete(`/api/groups/${id}/force`);
        } catch (e: any) {
          if (e.response?.status === 404) {
            await api.delete(`/api/groups/${id}`, { params: { force: 1 } });
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setSelectedGroupIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.course_id || !formData.teacher_id) {
      setFormError("Kurs va o'qituvchi tanlanishi shart");
      return;
    }
    const selectedCourse = courses.find((c: any) => String(c.id) === String(formData.course_id));
    const finalName = formData.name.trim() || (selectedCourse ? `${selectedCourse.name} (${formData.time.split(' - ')[0] || '14:00'})` : 'Yangi Guruh');
    createMutation.mutate({
      ...formData,
      name: finalName,
    });
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

  const handleOpenForceDelete = (group: GroupItem) => {
    setForceDeletingGroup(group);
    setForceDeleteError('');
    setIsForceDeleteModalOpen(true);
  };

  const rawGroups: GroupItem[] = groupsData || [];
  const groups = rawGroups.filter((group: GroupItem) => {
    if (statusFilter && group.status !== statusFilter) {
      return false;
    }
    if (courseFilter && String(group.course_id) !== String(courseFilter)) {
      return false;
    }
    if (search && !group.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });
  const rawCourses = Array.isArray(coursesData) ? coursesData : (coursesData?.items || []);
  const courses = Array.isArray(rawCourses) ? rawCourses : [];

  const rawTeachers = Array.isArray(teachersData) ? teachersData : (teachersData?.items || []);
  const teachers = Array.isArray(rawTeachers) ? rawTeachers : [];

  const rawRooms = Array.isArray(roomsData) ? roomsData : (roomsData?.items || []);
  const rooms = Array.isArray(rawRooms) ? rawRooms : [];

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

        {/* Faqat O'quvchi bo'lmaganlar ko'radi */}
        {!isUserStudent && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: '',
                course_id: '',
                teacher_id: isUserTeacher && user?.id ? String(user.id) : '',
                room_id: '',
                days: 'Dush-Chor-Jum',
                time: '14:00 - 16:00',
                duration_months: 3,
                max_students: 16,
                start_date: new Date().toISOString().split('T')[0],
              });
              setFormError('');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
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

        <div className="w-full sm:w-48">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            placeholder="Barcha holatlar"
            options={[
              { value: '', label: 'Barcha holatlar' },
              { value: 'active', label: 'Faol guruhlar' },
              { value: 'completed', label: 'Tugallangan / Arxiv' },
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
              className={`bg-white dark:bg-gray-900 rounded-2xl p-5 border transition flex flex-col justify-between ${
                selectedGroupIds.includes(group.id)
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {!isUserStudent && (
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroupIds((prev) => [...prev, group.id]);
                          } else {
                            setSelectedGroupIds((prev) => prev.filter((id) => id !== group.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      />
                    )}
                    <Link
                      href={`/groups/${group.id}`}
                      className="font-bold text-gray-900 dark:text-white text-base hover:text-blue-600 dark:hover:text-blue-400 transition truncate"
                    >
                      {group.name}
                    </Link>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border capitalize ${
                    group.status === 'active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}>
                    {group.status === 'active' ? 'Faol' : group.status === 'completed' ? 'Tugallangan / Arxiv' : group.status}
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
                  {group.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        Davr: <strong className="text-gray-900 dark:text-white">{group.start_date}</strong> {group.end_date ? `— ${group.end_date}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>
                      <strong className="text-gray-900 dark:text-white">{group.students_count}</strong> / {group.max_students} o&apos;quvchi
                    </span>
                  </div>
                  {group.lessons_count !== undefined && group.lessons_count > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>{group.lessons_count} ta dars rejasi</span>
                    </div>
                  )}
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
                      {group.status === 'active' ? (
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
                            title="Arxivlash"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={restoreMutation.isPending}
                            onClick={() => restoreMutation.mutate(group.id)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition cursor-pointer"
                            title="Arxivdan chiqarish (Faollashtirish)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenForceDelete(group)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                            title="Butunlay o'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-white">Yangi guruh ochish</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900 rounded-xl text-red-700 dark:text-rose-300 text-xs flex items-start gap-2 break-words">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="flex-1 break-words leading-relaxed">{formError}</span>
                </div>
              )}

              {(courses.length === 0 || teachers.length === 0) && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold">Diqqat:</p>
                    {courses.length === 0 && (
                      <p>
                        Guruh yaratish uchun avval kamida bitta kurs qo&apos;shishingiz kerak.{' '}
                        <Link href="/courses" className="underline font-bold text-amber-900 dark:text-amber-100">
                          Kurslar bo&apos;limiga o&apos;tish &rarr;
                        </Link>
                      </p>
                    )}
                    {teachers.length === 0 && (
                      <p>
                        Guruh yaratish uchun kamida bitta o&apos;qituvchi mavjud bo&apos;lishi kerak.{' '}
                        <Link href="/teachers" className="underline font-bold text-amber-900 dark:text-amber-100">
                          O&apos;qituvchilar bo&apos;limiga o&apos;tish &rarr;
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 1. Asosiy: Kurs va O'qituvchi */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  1. Kurs va O&apos;qituvchi
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Kursni tanlang *
                    </label>
                    <CustomSelect
                      value={formData.course_id}
                      onChange={(val) => {
                        const selectedCourse = courses.find((c: any) => String(c.id) === String(val));
                        const autoName = selectedCourse
                          ? `${selectedCourse.name} (${formData.time.split(' - ')[0] || '14:00'})`
                          : formData.name;
                        setFormData({
                          ...formData,
                          course_id: val,
                          name: (!formData.name.trim() || courses.some((c: any) => formData.name.startsWith(c.name))) ? autoName : formData.name,
                          duration_months: selectedCourse?.duration_months || formData.duration_months,
                        });
                      }}
                      placeholder="Kursni tanlang..."
                      searchable
                      options={courses.map((c: any) => ({
                        value: String(c.id),
                        label: `${c.name}${c.level ? ` (${c.level})` : ''}${c.price ? ` — ${Number(c.price).toLocaleString('uz-UZ')} so'm` : ''}`,
                      }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      O&apos;qituvchi *
                    </label>
                    <CustomSelect
                      value={formData.teacher_id}
                      onChange={(val) => setFormData({ ...formData, teacher_id: val })}
                      placeholder="O'qituvchini tanlang..."
                      searchable
                      options={teachers.map((t: any) => ({
                        value: String(t.id),
                        label: `${t.name}${t.phone ? ` (${t.phone})` : ''}`,
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Guruh nomi
                    </label>
                    <span className="text-[11px] text-gray-400">
                      (Avtomatik shakllanadi yoki o&apos;zingiz yozing)
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Masalan: Front-end React 12 yoki avtomatik to'ladi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* 2. Dars Jadvali va Vaqti */}
              <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  2. Dars kunlari va Vaqti
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Hafta kunlari
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      { label: 'Toq kunlar (Dush-Chor-Jum)', val: 'Dush-Chor-Jum' },
                      { label: 'Juft kunlar (Sesh-Pay-Shan)', val: 'Sesh-Pay-Shan' },
                      { label: 'Dam olish kunlari (Shan-Yak)', val: 'Shan-Yak' },
                      { label: 'Har kuni (Dush-Shan)', val: 'Dush-Sesh-Chor-Pay-Jum-Shan' },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setFormData({ ...formData, days: p.val })}
                        className={`text-xs px-2.5 py-1 rounded-xl border transition cursor-pointer font-medium ${
                          formData.days === p.val
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                    placeholder="Dush-Chor-Jum"
                    className="w-full px-3.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Dars vaqti
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {['09:00 - 11:00', '11:00 - 13:00', '14:00 - 16:00', '16:00 - 18:00', '18:30 - 20:30'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          const selectedCourse = courses.find((c: any) => String(c.id) === String(formData.course_id));
                          const autoName = selectedCourse
                            ? `${selectedCourse.name} (${t.split(' - ')[0]})`
                            : formData.name;
                          setFormData({
                            ...formData,
                            time: t,
                            name: (!formData.name.trim() || courses.some((c: any) => formData.name.startsWith(c.name))) ? autoName : formData.name,
                          });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-xl border transition cursor-pointer font-medium ${
                          formData.time === t
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="14:00 - 16:00"
                    className="w-full px-3.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* 3. Muddat, Xona va Sig'im */}
              <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-200/70 dark:border-gray-700 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  3. Muddat, Xona va Sig&apos;im
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Boshlanish sanasi *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Kurs davomiyligi (Oylar)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="36"
                        value={formData.duration_months}
                        onChange={(e) => setFormData({ ...formData, duration_months: Math.max(1, Number(e.target.value)) })}
                        className="w-20 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {[1, 2, 3, 6, 9, 12].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setFormData({ ...formData, duration_months: m })}
                            className={`text-xs px-2 py-1.5 rounded-lg border transition cursor-pointer font-semibold ${
                              formData.duration_months === m
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {m} oy
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dinamik Hisob-kitob ko'rsatkichi */}
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Rejalashtirilgan: ~{Number(formData.duration_months || 3) * (formData.days.split('-').length || 3) * 4} ta dars
                  </span>
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
                    Taxminiy yakun: {(() => {
                      try {
                        const d = new Date(formData.start_date || new Date());
                        d.setMonth(d.getMonth() + Number(formData.duration_months || 3));
                        return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
                      } catch {
                        return '';
                      }
                    })()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Dars xonasi
                    </label>
                    <CustomSelect
                      value={formData.room_id}
                      onChange={(val) => setFormData({ ...formData, room_id: val })}
                      placeholder="Xonani tanlang (ixtiyoriy)..."
                      searchable
                      options={[
                        { value: '', label: "Xonani tanlang (ixtiyoriy)..." },
                        ...rooms.map((r: any) => ({
                          value: String(r.id),
                          label: `${r.name}${r.capacity ? ` (${r.capacity} o'rin)` : ''}`,
                        })),
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Maksimal o&apos;quvchilar soni
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.max_students}
                      onChange={(e) => setFormData({ ...formData, max_students: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xs -mx-6 -mb-6 px-6 py-4 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Guruhni ochish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Guruhni Tahrirlash (Edit) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-white">Guruh ma&apos;lumotlarini tahrirlash</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {editFormError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900 rounded-xl text-red-700 dark:text-rose-300 text-xs flex items-start gap-2 break-words">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="flex-1 break-words leading-relaxed">{editFormError}</span>
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
                  <CustomSelect
                    value={editFormData.course_id}
                    onChange={(val) => setEditFormData({ ...editFormData, course_id: val })}
                    placeholder="Kursni tanlang..."
                    searchable
                    options={courses.map((c: any) => ({
                      value: String(c.id),
                      label: `${c.name}${c.level ? ` (${c.level})` : ''}${c.price ? ` — ${Number(c.price).toLocaleString('uz-UZ')} so'm` : ''}`,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    O&apos;qituvchi *
                  </label>
                  <CustomSelect
                    value={editFormData.teacher_id}
                    onChange={(val) => setEditFormData({ ...editFormData, teacher_id: val })}
                    placeholder="O'qituvchini tanlang..."
                    searchable
                    options={teachers.map((t: any) => ({
                      value: String(t.id),
                      label: `${t.name}${t.phone ? ` (${t.phone})` : ''}`,
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Dars xonasi
                  </label>
                  <CustomSelect
                    value={editFormData.room_id}
                    onChange={(val) => setEditFormData({ ...editFormData, room_id: val })}
                    placeholder="Xonani tanlang..."
                    searchable
                    options={[
                      { value: '', label: "Xonani tanlang..." },
                      ...rooms.map((r: any) => ({
                        value: String(r.id),
                        label: `${r.name}${r.capacity ? ` (${r.capacity} o'rin)` : ''}`,
                      })),
                    ]}
                  />
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
                  <CustomSelect
                    value={editFormData.status}
                    onChange={(val) => setEditFormData({ ...editFormData, status: val })}
                    placeholder="Guruh holati..."
                    options={[
                      { value: 'active', label: 'Faol (Active)' },
                      { value: 'completed', label: 'Tugallangan / Arxiv (Completed)' },
                      { value: 'cancelled', label: 'Bekor qilingan (Cancelled)' },
                    ]}
                  />
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xs -mx-6 -mb-6 px-6 py-4 z-10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
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
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingGroup.id)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Ha, arxivlash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Guruhni Butunlay O'chirish Tasdig'i */}
      {isForceDeleteModalOpen && forceDeletingGroup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Guruhni butunlay o&apos;chirmoqchimisiz?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong className="text-gray-800 dark:text-gray-200">&quot;{forceDeletingGroup.name}&quot;</strong> guruhi ma&apos;lumotlar bazasidan qaytarib bo&apos;lmaydigan qilib butunlay o&apos;chiriladi.
              </p>
              {forceDeleteError && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-xs">
                  {forceDeleteError}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsForceDeleteModalOpen(false);
                  setForceDeletingGroup(null);
                  setForceDeleteError('');
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={forceDeleteMutation.isPending}
                onClick={() => forceDeleteMutation.mutate(forceDeletingGroup.id)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] disabled:bg-red-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {forceDeleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Ha, butunlay o&apos;chirish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedGroupIds.length > 0 && !isUserStudent && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-950/90 dark:bg-gray-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700/80 flex items-center gap-4 animate-fade-in">
          <span className="text-xs sm:text-sm font-semibold text-gray-200">
            <strong className="text-white">{selectedGroupIds.length} ta</strong> guruh tanlandi
          </span>
          <button
            type="button"
            onClick={() => setSelectedGroupIds(groups.map((g) => g.id))}
            className="text-xs text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
          >
            Barchasini tanlash
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroupIds([])}
            className="text-xs text-gray-400 hover:text-gray-200 underline cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Tanlanganlarni o&apos;chirish</span>
          </button>
        </div>
      )}

      {/* Modal: Ommaviy O'chirish Tasdig'i */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Tanlangan {selectedGroupIds.length} ta guruhni butunlay o&apos;chirmoqchimisiz?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ushbu barcha tanlangan guruhlar va ularga tegishli dars jadvallari ma&apos;lumotlar bazasidan qaytarib bo&apos;lmaydigan qilib butunlay o&apos;chiriladi.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] disabled:bg-red-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isBulkDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Ha, butunlay o&apos;chirish</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
