'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Calendar, Plus, Check, X, Clock,
  Loader2, CheckCircle2, AlertCircle,
  Award, Zap, BarChart3, ListFilter,
  CheckCheck, ChevronLeft, ChevronRight, UserCheck
} from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface StudentAttendance {
  student_id: number;
  student_name: string;
  phone: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note: string;
  score?: number | string | null;
  feedback?: string;
}

interface GroupItem {
  id: number;
  name: string;
}

interface LessonItem {
  id: number;
  topic: string;
  started_at: string;
  status: string;
}

interface MyAttendanceItem {
  id: number;
  lesson_id: number;
  topic: string;
  group_name: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note: string;
}

interface GroupStudentStat {
  student_id: number;
  student_name: string;
  phone: string;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
  average_score: number | null;
}

function AttendanceContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const urlGroupId = searchParams.get('group_id');
  const urlLessonId = searchParams.get('lesson_id');

  const { isStudent: isUserStudent, isTeacher: isUserTeacher, isLoading: isUserLoading } = useCurrentUser();
  const canTakeAttendance = isUserTeacher; // Admin/Manager faqat monitoring qiladi

  const [selectedGroupId, setSelectedGroupId] = useState<string>(urlGroupId || '');
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(urlLessonId ? Number(urlLessonId) : null);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Darslarni filtrlash rejimi: 'today' | 'week' | 'month' | 'all'
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Admin/Manager ko'rinish rejimi: 'lessons' (darslar) | 'overview' (guruh monitoringi)
  const [adminViewMode, setAdminViewMode] = useState<'lessons' | 'overview'>('lessons');

  // Student shaxsiy davomat statistikasi
  const { data: myAttendance, isLoading: isMyAttendanceLoading } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: async () => {
      const resp = await api.get('/api/attendance/my');
      return resp.data as {
        rate: number;
        total: number;
        present: number;
        items: MyAttendanceItem[];
      };
    },
    enabled: isUserStudent,
  });

  // Yangi dars modali (faqat teacher uchun)
  const [isNewLessonModalOpen, setIsNewLessonModalOpen] = useState(false);
  const [newLessonTopic, setNewLessonTopic] = useState('');
  const [newLessonDate, setNewLessonDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Fetch all groups for dropdown (Teacher/Admin)
  const { data: groupsData } = useQuery<GroupItem[]>({
    queryKey: ['groups-for-attendance'],
    queryFn: async () => {
      const resp = await api.get('/api/groups');
      const raw = Array.isArray(resp.data) ? resp.data : (resp.data?.items || []);
      return (Array.isArray(raw) ? raw : []) as GroupItem[];
    },
    enabled: !isUserStudent,
  });

  const groups: GroupItem[] = groupsData || [];

  // URL yoki birinchi guruhni tanlash
  useEffect(() => {
    if (!isUserStudent && !selectedGroupId) {
      if (urlGroupId) {
        setSelectedGroupId(urlGroupId);
      } else if (groups.length > 0) {
        setSelectedGroupId(String(groups[0].id));
      }
    }
  }, [groups, selectedGroupId, isUserStudent, urlGroupId]);

  // 2. Fetch lessons for selected group with period & month filter
  const { data: attendanceIndexData, isLoading: isLessonsLoading } = useQuery({
    queryKey: ['attendance-lessons', selectedGroupId, period, selectedMonth],
    queryFn: async () => {
      if (!selectedGroupId) return null;
      const resp = await api.get('/api/attendance', {
        params: {
          group_id: selectedGroupId,
          period,
          month: selectedMonth,
        },
      });
      return resp.data;
    },
    enabled: !isUserStudent && !!selectedGroupId,
  });

  const lessons: LessonItem[] = attendanceIndexData?.lessons || [];
  const availableMonths: string[] = attendanceIndexData?.available_months || [];

  // 2b. Admin/Manager uchun guruh monitoring statistikasi
  const { data: groupStatsData, isLoading: isGroupStatsLoading } = useQuery({
    queryKey: ['group-stats', selectedGroupId, selectedMonth, period],
    queryFn: async () => {
      if (!selectedGroupId) return null;
      const resp = await api.get('/api/attendance/group-stats', {
        params: {
          group_id: selectedGroupId,
          month: period === 'month' ? selectedMonth : undefined,
        },
      });
      return resp.data;
    },
    enabled: !isUserStudent && !canTakeAttendance && !!selectedGroupId && adminViewMode === 'overview',
  });

  const groupStudentsStats: GroupStudentStat[] = groupStatsData?.students || [];

  // Darsni avtomatik aqlli tanlash (bugungi yoki shu oydagi dastlabki dars)
  useEffect(() => {
    if (!isUserStudent && lessons.length > 0) {
      if (urlLessonId && lessons.some((l: LessonItem) => l.id === Number(urlLessonId))) {
        setSelectedLessonId(Number(urlLessonId));
      } else if (!selectedLessonId || !lessons.some((l: LessonItem) => l.id === selectedLessonId)) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLesson = lessons.find((l) => l.started_at && l.started_at.startsWith(todayStr));
        if (todayLesson) {
          setSelectedLessonId(todayLesson.id);
        } else {
          setSelectedLessonId(lessons[0].id);
        }
      }
    } else if (!isUserStudent && lessons.length === 0) {
      setSelectedLessonId(null);
      setStudents([]);
    }
  }, [lessons, selectedLessonId, isUserStudent, urlLessonId]);

  // 3. Fetch attendance for selected lesson
  const { data: lessonAttendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['lesson-attendance', selectedLessonId],
    queryFn: async () => {
      if (!selectedLessonId) return null;
      const resp = await api.get(`/api/attendance/lesson/${selectedLessonId}`);
      return resp.data;
    },
    enabled: !isUserStudent && !!selectedLessonId,
  });

  useEffect(() => {
    if (lessonAttendanceData?.students) {
      setStudents(lessonAttendanceData.students);
    }
  }, [lessonAttendanceData]);

  // 4. Create Lesson Mutation (Teacher)
  const createLessonMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.post('/api/attendance/create-lesson', {
        group_id: Number(selectedGroupId),
        topic: newLessonTopic || 'Dars',
        date: newLessonDate,
      });
      return resp.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-lessons', selectedGroupId] });
      setIsNewLessonModalOpen(false);
      setNewLessonTopic('');
      if (data?.lesson?.id) {
        setSelectedLessonId(data.lesson.id);
      }
    },
  });

  const todayDateStr = new Date().toISOString().split('T')[0];
  const hasTodayLesson = lessons.some((l) => l.started_at && l.started_at.startsWith(todayDateStr));

  // 4b. Start Today's Lesson with 1-click (Faqat O'qituvchi uchun)
  const startTodayLessonMutation = useMutation({
    mutationFn: async () => {
      const todayFormatted = new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
      const resp = await api.post('/api/attendance/create-lesson', {
        group_id: Number(selectedGroupId),
        topic: `Bugungi dars (${todayFormatted})`,
        date: todayDateStr,
      });
      return resp.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-lessons', selectedGroupId] });
      if (data?.lesson?.id) {
        setSelectedLessonId(data.lesson.id);
      }
      setSaveMessage("Bugungi dars ochildi! Endi davomat va baholarni belgilashingiz mumkin.");
      setTimeout(() => setSaveMessage(''), 4000);
    },
  });

  // 5. Bulk Save Attendance & Daily Scores Mutation (Faqat O'qituvchi uchun)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        lesson_id: selectedLessonId,
        attendance: students.map((s) => ({
          student_id: s.student_id,
          status: s.status,
          note: s.note,
          score: s.score !== undefined && s.score !== '' && s.score !== null ? Number(s.score) : null,
          feedback: s.feedback || s.note || '',
        })),
      };
      const resp = await api.post('/api/attendance/bulk-save', payload);
      return resp.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-attendance', selectedLessonId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-lessons', selectedGroupId] });
      setSaveMessage(data?.message || "Davomat va baholar muvaffaqiyatli saqlandi!");
      setTimeout(() => setSaveMessage(''), 4000);
    },
  });

  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, status: 'present' }))
    );
  };

  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  const handleScoreChange = (studentId: number, score: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, score: score === '' ? '' : score } : s))
    );
  };

  const handleSetAllScores = (val: number) => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, score: val }))
    );
  };

  const handleNoteChange = (studentId: number, note: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, note } : s))
    );
  };

  const currentLesson = lessons.find((l) => l.id === selectedLessonId);

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const lateCount = students.filter((s) => s.status === 'late').length;
  const excusedCount = students.filter((s) => s.status === 'excused').length;

  const scoredStudents = students.filter((s) => s.score !== undefined && s.score !== null && s.score !== '');
  const avgScore = scoredStudents.length > 0
    ? Math.round(scoredStudents.reduce((acc, curr) => acc + Number(curr.score), 0) / scoredStudents.length)
    : null;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Kelgan
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <X className="w-3.5 h-3.5" />
            Kelmadi
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Kechikdi
          </span>
        );
      case 'excused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <AlertCircle className="w-3.5 h-3.5" />
            Sababli
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            Noma&apos;lum
          </span>
        );
    }
  };

  const formatMonthTitle = (ym: string) => {
    if (!ym || ym.length < 7) return ym;
    const [year, month] = ym.split('-');
    const monthNames = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];
    const mIdx = Number(month) - 1;
    return `${monthNames[mIdx] || month} ${year}`;
  };

  // ─── Loading State ────────────────────────────────────────────────────────
  if (isUserLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs text-gray-400">Yuklanmoqda...</p>
      </div>
    );
  }

  // ─── O'quvchi uchun maxsus davomat sahifasi ──────────────────────────────
  if (isUserStudent) {
    const rate = myAttendance?.rate ?? 100;
    const total = myAttendance?.total ?? 0;
    const present = myAttendance?.present ?? 0;
    const absent = Math.max(0, total - present);
    const items = myAttendance?.items || [];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mening Davomatim</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Darslarda qatnashish ko&apos;rsatkichingiz va o&apos;tkazilgan darslar ro&apos;yxati
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-extrabold text-lg">
              {rate}%
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Qatnashish darajasi</p>
              <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                {rate >= 85 ? "A'lo davomat" : rate >= 70 ? "Yaxshi" : "Nazorat zarur"}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Jami darslar</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{total} ta</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Qatnashilgan</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{present} ta</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <X className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Qoldirilgan</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{absent} ta</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white text-base">Darslar bo&apos;yicha davomat tarixi</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
              {items.length} ta dars
            </span>
          </div>

          {isMyAttendanceLoading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Hozircha davomat qaydlari kiritilmagan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3.5">Dars mavzusi</th>
                    <th className="px-6 py-3.5">Guruh</th>
                    <th className="px-6 py-3.5">Sana</th>
                    <th className="px-6 py-3.5">Davomat holati</th>
                    <th className="px-6 py-3.5">O&apos;qituvchi izohi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {record.topic}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                        {record.group_name}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {record.date}
                      </td>
                      <td className="px-6 py-4">
                        {renderStatusBadge(record.status)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {record.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── O'qituvchi va Admin/Manager boshqaruvi ─────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {canTakeAttendance ? 'Davomat va Baholash' : 'Davomat Nazorati & Monitoringi'}
            </h1>
            {!canTakeAttendance && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Nazorat rejimi
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {canTakeAttendance
              ? "Darslar bo'yicha o'quvchilar qatnashuvini belgilash va kunlik ballarini kiritish"
              : "Guruhlar davomati, o'qituvchilar darslari va o'quvchilar qatnashuvi tahlili"}
          </p>
        </div>

        {/* Group Selector & Role Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-64">
            <CustomSelect
              value={selectedGroupId}
              onChange={(val) => {
                setSelectedGroupId(val);
                setSelectedLessonId(null);
              }}
              placeholder="Guruhni tanlang..."
              searchable={groups.length > 5}
              options={groups.map((g) => ({
                value: String(g.id),
                label: g.name,
              }))}
            />
          </div>

          {/* O'qituvchi uchun tugmalar: Bugungi darsni boshlash va Yangi dars */}
          {canTakeAttendance && (
            <>
              {selectedGroupId && !hasTodayLesson && (
                <button
                  type="button"
                  disabled={startTodayLessonMutation.isPending}
                  onClick={() => startTodayLessonMutation.mutate()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition shrink-0 cursor-pointer"
                >
                  {startTodayLessonMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 text-yellow-200 fill-yellow-200" />
                  )}
                  <span>Bugungi darsni boshlash</span>
                </button>
              )}

              <button
                type="button"
                disabled={!selectedGroupId}
                onClick={() => setIsNewLessonModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi dars</span>
              </button>
            </>
          )}

          {/* Admin / Manager uchun Tab almashtirish */}
          {!canTakeAttendance && selectedGroupId && (
            <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <button
                type="button"
                onClick={() => setAdminViewMode('lessons')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminViewMode === 'lessons'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Darslar davomati</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminViewMode('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminViewMode === 'overview'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Guruh monitoringi</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Period Filter Bar (Kunlik, Haftalik, Oylik) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mr-1">
            <Calendar className="w-4 h-4 text-blue-600" />
            Davr bo&apos;yicha:
          </span>

          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                period === 'today'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Bugun
            </button>
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                period === 'week'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Shu hafta
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                period === 'month'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Oylik
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                period === 'all'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              Barchasi
            </button>
          </div>
        </div>

        {/* Agar Oylik tanlangan bo'lsa, Oy tanlagich */}
        {period === 'month' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Oy:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              {availableMonths.length > 0 ? (
                availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatMonthTitle(ym)}
                  </option>
                ))
              ) : (
                <option value={selectedMonth}>{formatMonthTitle(selectedMonth)}</option>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Save Success Alert */}
      {saveMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl text-green-800 dark:text-green-300 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold">{saveMessage}</span>
        </div>
      )}

      {/* ─── ADMIN/MANAGER: GURUH MONITORING JADVALI ─────────────────────── */}
      {!canTakeAttendance && adminViewMode === 'overview' ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-base">
                O&apos;quvchilar umumiy davomat va ballar monitoringi
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {period === 'month' ? `${formatMonthTitle(selectedMonth)} davridagi tahlil` : 'Tanlangan davr bo\'yicha'}
              </p>
            </div>
            <span className="text-xs px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-xl font-bold">
              Jami darslar: {groupStatsData?.total_lessons ?? lessons.length} ta
            </span>
          </div>

          {isGroupStatsLoading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : groupStudentsStats.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Bu guruhda faol o&apos;quvchilar yoki tanlangan davrda o&apos;tkazilgan darslar yo&apos;q.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3.5">O&apos;quvchi</th>
                    <th className="px-6 py-3.5">Telefon</th>
                    <th className="px-6 py-3.5 text-center">Davomat darajasi</th>
                    <th className="px-6 py-3.5 text-center">Kelgan</th>
                    <th className="px-6 py-3.5 text-center">Kelmadi</th>
                    <th className="px-6 py-3.5 text-center">Kechikdi</th>
                    <th className="px-6 py-3.5 text-center">O&apos;rtacha ball</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {groupStudentsStats.map((st) => (
                    <tr key={st.student_id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition">
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {st.student_name}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {st.phone}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ${
                          st.attendance_rate >= 85
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : st.attendance_rate >= 70
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {st.attendance_rate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {st.present_count} ta
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-rose-600 dark:text-rose-400">
                        {st.absent_count} ta
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-amber-600 dark:text-amber-400">
                        {st.late_count} ta
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-extrabold text-purple-700 dark:text-purple-300">
                        {st.average_score !== null ? `${st.average_score} ball` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ─── DARSLAR VA DAVOMAT PANEL (Teacher yoki Admin dars ko'rinishi) ─ */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left: Lessons List */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
              <div>
                <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Darslar ro&apos;yxati</h2>
                <span className="text-[11px] text-gray-400">
                  {period === 'today' ? 'Bugungi' : period === 'week' ? 'Haftalik' : period === 'month' ? 'Oylik' : 'Barcha'} darslar
                </span>
              </div>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-0.5 rounded-full font-bold">
                {lessons.length} ta
              </span>
            </div>

            {isLessonsLoading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : !selectedGroupId ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Iltimos, yuqoridagi ro&apos;yxatdan guruhni tanlang.
              </div>
            ) : lessons.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                <p>Tanlangan davr bo&apos;yicha darslar topilmadi.</p>
                {canTakeAttendance && (
                  <button
                    onClick={() => setIsNewLessonModalOpen(true)}
                    className="text-blue-600 font-semibold hover:underline cursor-pointer"
                  >
                    + Yangi dars ochish
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[550px] pr-1">
                {lessons.map((lesson) => {
                  const isSelected = lesson.id === selectedLessonId;
                  const isCompleted = lesson.status === 'completed';
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`w-full text-left p-3 rounded-xl transition text-xs flex flex-col gap-1 border cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 shadow-xs'
                          : 'bg-white dark:bg-gray-900 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate max-w-[150px]">{lesson.topic}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          isCompleted
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300'
                        }`}>
                          {isCompleted ? '✓ Bajarildi' : 'Reja'}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {lesson.started_at ? new Date(lesson.started_at).toLocaleDateString('uz-UZ') : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Attendance Table */}
          <div className="lg:col-span-3 space-y-4">
            {selectedLessonId && currentLesson ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6 space-y-6">

                {/* Lesson Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md text-xs font-bold uppercase">
                        Dars #{currentLesson.id}
                      </span>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{currentLesson.topic}</h2>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Sana: {currentLesson.started_at ? currentLesson.started_at.substring(0, 16) : '-'}
                    </p>
                  </div>

                  {/* O'qituvchi uchun tezkor harakatlar */}
                  {canTakeAttendance && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleMarkAllPresent}
                        className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Hamma keldi
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetAllScores(100)}
                        className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Hammaga 100</span>
                      </button>

                      <button
                        type="button"
                        disabled={saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Saqlash</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Attendance & Grading Mini Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 text-xs">
                  <div className="p-3 bg-green-50/70 dark:bg-emerald-950/30 border border-green-100 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
                    <span className="text-green-700 dark:text-emerald-400 font-medium">Kelganlar:</span>
                    <strong className="text-green-800 dark:text-emerald-300 text-sm font-bold">{presentCount} ta</strong>
                  </div>
                  <div className="p-3 bg-red-50/70 dark:bg-rose-950/30 border border-red-100 dark:border-rose-900/50 rounded-xl flex items-center justify-between">
                    <span className="text-red-700 dark:text-rose-400 font-medium">Kelmadi:</span>
                    <strong className="text-red-800 dark:text-rose-300 text-sm font-bold">{absentCount} ta</strong>
                  </div>
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl flex items-center justify-between">
                    <span className="text-amber-700 dark:text-amber-400 font-medium">Kechikdi:</span>
                    <strong className="text-amber-800 dark:text-amber-300 text-sm font-bold">{lateCount} ta</strong>
                  </div>
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
                    <span className="text-blue-700 dark:text-blue-400 font-medium">Sababli:</span>
                    <strong className="text-blue-800 dark:text-blue-300 text-sm font-bold">{excusedCount} ta</strong>
                  </div>
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl flex items-center justify-between col-span-2 sm:col-span-1">
                    <span className="text-purple-700 dark:text-purple-400 font-medium flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      O&apos;rtacha:
                    </span>
                    <strong className="text-purple-800 dark:text-purple-300 text-sm font-bold">
                      {avgScore !== null ? `${avgScore} ball` : '-'}
                    </strong>
                  </div>
                </div>

                {isAttendanceLoading ? (
                  <div className="py-16 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    Ushbu guruhda faol o&apos;quvchilar yo&apos;q.
                  </div>
                ) : (
                  <>
                    {/* DESKTOP VIEW */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                          <tr>
                            <th className="px-4 py-3">O&apos;quvchi</th>
                            <th className="px-4 py-3 text-center">Davomat</th>
                            <th className="px-4 py-3 text-center">Kunlik Ball</th>
                            <th className="px-4 py-3">Izoh / Sabab</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {students.map((student) => (
                            <tr key={student.student_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                              <td className="px-4 py-3.5">
                                <p className="font-semibold text-gray-900 dark:text-white">{student.student_name}</p>
                                <p className="text-xs text-gray-400">{student.phone}</p>
                              </td>

                              {/* Davomat holati */}
                              <td className="px-4 py-3.5 text-center">
                                {canTakeAttendance ? (
                                  <div className="inline-flex rounded-xl p-1 bg-gray-100 dark:bg-gray-800 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(student.student_id, 'present')}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        student.status === 'present'
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'text-gray-600 dark:text-gray-300 hover:text-emerald-700'
                                      }`}
                                    >
                                      Keldi
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(student.student_id, 'absent')}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        student.status === 'absent'
                                          ? 'bg-rose-600 text-white shadow-xs'
                                          : 'text-gray-600 dark:text-gray-300 hover:text-rose-700'
                                      }`}
                                    >
                                      Kelmadi
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(student.student_id, 'late')}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        student.status === 'late'
                                          ? 'bg-amber-500 text-white shadow-xs'
                                          : 'text-gray-600 dark:text-gray-300 hover:text-amber-700'
                                      }`}
                                    >
                                      Kechikdi
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(student.student_id, 'excused')}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        student.status === 'excused'
                                          ? 'bg-blue-600 text-white shadow-xs'
                                          : 'text-gray-600 dark:text-gray-300 hover:text-blue-700'
                                      }`}
                                    >
                                      Sababli
                                    </button>
                                  </div>
                                ) : (
                                  renderStatusBadge(student.status)
                                )}
                              </td>

                              {/* Kunlik ball */}
                              <td className="px-4 py-3.5 text-center">
                                {canTakeAttendance ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={student.score ?? ''}
                                      onChange={(e) => handleScoreChange(student.student_id, e.target.value)}
                                      placeholder="Ball"
                                      className="w-20 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-gray-900 transition"
                                    />
                                    <div className="hidden xl:flex items-center gap-1">
                                      {[100, 85, 70].map((preset) => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => handleScoreChange(student.student_id, String(preset))}
                                          className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 hover:bg-purple-100 dark:bg-gray-800 dark:hover:bg-purple-950/50 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700 transition cursor-pointer"
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="font-bold text-purple-700 dark:text-purple-300 text-xs">
                                    {student.score !== null && student.score !== undefined && student.score !== ''
                                      ? `${student.score} ball`
                                      : '-'}
                                  </span>
                                )}
                              </td>

                              {/* Izoh / Sabab */}
                              <td className="px-4 py-3.5">
                                {canTakeAttendance ? (
                                  <input
                                    type="text"
                                    value={student.note}
                                    onChange={(e) => handleNoteChange(student.student_id, e.target.value)}
                                    placeholder="Sababi yoki izoh..."
                                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 transition"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {student.note || '-'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Faqat o'qituvchi uchun pastki Saqlash tugmasi */}
                    {canTakeAttendance && (
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-medium">
                          Jami: {students.length} nafar o&apos;quvchi
                        </span>
                        <button
                          type="button"
                          disabled={saveMutation.isPending}
                          onClick={() => saveMutation.mutate()}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
                        >
                          {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                          <span>Davomat va baholarni saqlash</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 sm:p-16 text-center border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-700 dark:text-gray-200 font-semibold text-base">Dars tanlanmagan</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  {canTakeAttendance
                    ? "Darslar ro'yxatidan darsni tanlang yoki bugungi darsni boshlang"
                    : "Chap tarafdagi ro'yxatdan darsni tanlab, uning davomatini ko'rishingiz mumkin"}
                </p>
                {canTakeAttendance && selectedGroupId && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    {!hasTodayLesson && (
                      <button
                        type="button"
                        disabled={startTodayLessonMutation.isPending}
                        onClick={() => startTodayLessonMutation.mutate()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        {startTodayLessonMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                        )}
                        <span>Bugungi darsni boshlash</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsNewLessonModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yangi dars ochish</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modal: Yangi Dars ochish (Faqat O'qituvchi uchun) */}
      {isNewLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md my-auto max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-white">Yangi dars ochish</h3>
              <button
                type="button"
                onClick={() => setIsNewLessonModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLessonMutation.mutate();
              }}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Dars mavzusi *
                </label>
                <input
                  type="text"
                  required
                  value={newLessonTopic}
                  onChange={(e) => setNewLessonTopic(e.target.value)}
                  placeholder="Masalan: Unit 5: Past Continuous Tense"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Sana *
                </label>
                <input
                  type="date"
                  required
                  value={newLessonDate}
                  onChange={(e) => setNewLessonDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-4 mt-6 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xs -mx-6 -mb-6 px-6 py-4 z-10">
                <button
                  type="button"
                  onClick={() => setIsNewLessonModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createLessonMutation.isPending}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {createLessonMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Darsni ochish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-gray-400">Yuklanmoqda...</p>
        </div>
      }
    >
      <AttendanceContent />
    </Suspense>
  );
}
