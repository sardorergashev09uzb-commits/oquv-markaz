'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BookOpen, Users, GraduationCap, DoorOpen, Clock, Calendar,
  ChevronLeft, PlusCircle, Trash2, Loader2, AlertCircle, Phone, Mail
} from 'lucide-react';
import Link from 'next/link';

interface StudentInGroup {
  membership_id: number;
  student_id: number;
  name: string;
  phone: string;
  email: string | null;
  enrolled_at: string;
  left_at: string | null;
  status: string;
}

interface LessonInGroup {
  id: number;
  group_id: number;
  topic: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  note: string | null;
}

export default function GroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.id;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'students' | 'lessons'>('students');
  const [userRole, setUserRole] = useState<string>('');
  const [isUserStudent, setIsUserStudent] = useState<boolean>(false);

  useEffect(() => {
    import('@/lib/auth').then(({ getCurrentUserFromToken, isStudent }) => {
      const user = getCurrentUserFromToken();
      if (user) {
        setUserRole(user.role);
        setIsUserStudent(isStudent(user.role));
      }
    });
  }, []);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [addError, setAddError] = useState('');

  // 1. Fetch Group Details & Students & Lessons
  const { data, isLoading, isError } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const resp = await api.get(`/api/groups/${groupId}`);
      return resp.data;
    },
  });

  // 2. Fetch all students for adding dropdown
  const { data: studentsData } = useQuery({
    queryKey: ['students-all-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/students', { params: { per_page: 100 } });
      return resp.data?.items || [];
    },
  });

  // 3. Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const resp = await api.post(`/api/groups/${groupId}/add-student`, {
        student_id: studentId,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSelectedStudentId('');
      setAddError('');
    },
    onError: () => {
      setAddError("O'quvchini qo'shishda xatolik yuz berdi");
    },
  });

  // 4. Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const resp = await api.post(`/api/groups/${groupId}/remove-student`, {
        student_id: studentId,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  // 5. Generate lessons mutation
  const generateLessonsMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post(`/api/groups/${groupId}/generate-lessons`, {
        duration_months: 3,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !data?.group) {
    return (
      <div className="py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">Guruh topilmadi</p>
        <Link href="/groups" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          &larr; Guruhlar ro&apos;yxatiga qaytish
        </Link>
      </div>
    );
  }

  const group = data.group;
  const students: StudentInGroup[] = data.students || [];
  const lessons: LessonInGroup[] = data.lessons || [];
  const activeStudents = students.filter((s) => s.status === 'active');
  const availableStudents = (studentsData || []).filter(
    (s: { id: number }) => !activeStudents.some((as) => as.student_id === s.id)
  );

  const completedLessonsCount = lessons.filter((l) => l.status === 'completed').length;
  const progressPercent = lessons.length > 0 ? Math.round((completedLessonsCount / lessons.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Back button */}
      <div>
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Guruhlar ro&apos;yxatiga</span>
        </Link>
      </div>

      {/* Group Info Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 capitalize">
                {group.status}
              </span>
            </div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">{group.course_name}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
              {activeStudents.length} / {group.max_students} o&apos;quvchi
            </span>
            {lessons.length > 0 && (
              <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                {completedLessonsCount} / {lessons.length} dars ({progressPercent}%)
              </span>
            )}
          </div>
        </div>

        {/* Group Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 text-sm">
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
            <GraduationCap className="w-5 h-5 text-violet-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">O&apos;qituvchi</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{group.teacher_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
            <DoorOpen className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Xona</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{group.room_name || 'Mavjud emas'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
            <Clock className="w-5 h-5 text-cyan-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Jadval</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {group.schedule?.length ? group.schedule.map((s: { day: string; time: string }) => `${s.day} (${s.time})`).join(', ') : 'Belgilanmagan'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-300">
            <Calendar className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Kurs muddati</p>
              <p className="font-semibold text-gray-800 dark:text-gray-100">
                {group.start_date || 'Noma\'lum'} {group.end_date ? `— ${group.end_date}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'students'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>O&apos;quvchilar ({activeStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('lessons')}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'lessons'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Darslar Jadvali ({lessons.length})</span>
        </button>
      </div>

      {/* Tab Content: Students */}
      {activeTab === 'students' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Guruh O&apos;quvchilari</h2>
              <p className="text-xs text-gray-400">Ushbu guruhda o&apos;qiyotgan faol o&apos;quvchilar ro&apos;yxati</p>
            </div>

            {/* Add student dropdown */}
            {!isUserStudent && availableStudents.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">O&apos;quvchini tanlang...</option>
                  {availableStudents.map((s: { id: number; name: string; phone: string }) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone})
                    </option>
                  ))}
                </select>
                <button
                  disabled={!selectedStudentId || addStudentMutation.isPending}
                  onClick={() => selectedStudentId && addStudentMutation.mutate(Number(selectedStudentId))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  {addStudentMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Guruhga qo&apos;shish</span>
                </button>
              </div>
            )}
          </div>

          {addError && <p className="text-xs text-red-600">{addError}</p>}

          {activeStudents.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              Ushbu guruhda hozircha o&apos;quvchilar yo&apos;q.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">O&apos;quvchi</th>
                    <th className="px-4 py-3">Telefon</th>
                    <th className="px-4 py-3">Qo&apos;shilgan sana</th>
                    {!isUserStudent && (
                      <th className="px-4 py-3 text-right">Amal</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {activeStudents.map((s) => (
                    <tr key={s.membership_id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                            {s.name.charAt(0)}
                          </div>
                          <Link
                            href={`/students/${s.student_id}`}
                            className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
                          >
                            {s.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 text-xs">
                        {s.phone}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs">
                        {s.enrolled_at}
                      </td>
                      {!isUserStudent && (
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`${s.name} ni ushbu guruhdan chiqarishni xohlaysizmi?`)) {
                                removeStudentMutation.mutate(s.student_id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                            title="Guruhdan chiqarish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Lessons Schedule */}
      {activeTab === 'lessons' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Darslar Jadvali va O&apos;quv Rejasi</h2>
              <p className="text-xs text-gray-400">
                Guruh uchun rejalashtirilgan barcha darslar ketma-ketligi
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!isUserStudent && (
                <Link
                  href={`/attendance?group_id=${groupId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Davomatga o&apos;tish</span>
                </Link>
              )}

              {!isUserStudent && lessons.length === 0 && (
                <button
                  onClick={() => generateLessonsMutation.mutate()}
                  disabled={generateLessonsMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  {generateLessonsMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5" />
                  )}
                  <span>Rejani shakllantirish</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {lessons.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300">
                <span>Kurs bo&apos;yicha umumiy o&apos;zlashtirish va darslar borishi</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{completedLessonsCount} / {lessons.length} ta dars ({progressPercent}%)</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {lessons.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Bu guruhda darslar hali belgilanmagan</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-4">
                Standart o&apos;quv markazi tartibida dars jadvalini avtomatik yaratishingiz mumkin.
              </p>
              {!isUserStudent && (
                <button
                  onClick={() => generateLessonsMutation.mutate()}
                  disabled={generateLessonsMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  {generateLessonsMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Avtomatik dars jadvalini shakllantirish</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">№</th>
                    <th className="px-4 py-3">Dars Mavzusi</th>
                    <th className="px-4 py-3">Sana va Vaqt</th>
                    <th className="px-4 py-3">Holati</th>
                    {!isUserStudent && <th className="px-4 py-3 text-right">Amal</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lessons.map((lesson, idx) => {
                    const isCompleted = lesson.status === 'completed';
                    const isActive = lesson.status === 'active';
                    return (
                      <tr key={lesson.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition">
                        <td className="px-4 py-3 font-semibold text-gray-500 text-xs">
                          #{idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white text-xs">
                          {lesson.topic || `${idx + 1}-Dars`}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs font-mono">
                          {lesson.started_at ? lesson.started_at.substring(0, 16) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Bajarildi
                            </span>
                          ) : isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                              Faol dars
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                              Rejalashtirilgan
                            </span>
                          )}
                        </td>
                        {!isUserStudent && (
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/attendance?group_id=${groupId}&lesson_id=${lesson.id}`}
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Davomat
                            </Link>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
