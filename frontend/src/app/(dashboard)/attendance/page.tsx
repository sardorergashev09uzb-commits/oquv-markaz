'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  ClipboardCheck, Users, Calendar, Plus, Check, X, Clock,
  FileText, Loader2, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';
import { getCurrentUserFromToken, isStudent } from '@/lib/auth';

interface StudentAttendance {
  student_id: number;
  student_name: string;
  phone: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note: string;
}

interface LessonItem {
  id: number;
  topic: string;
  started_at: string;
  status: string;
}

export default function AttendancePage() {
  const queryClient = useQueryClient();

  const [userRole, setUserRole] = useState<string>('');
  const [isUserStudent, setIsUserStudent] = useState<boolean>(false);

  useEffect(() => {
    const user = getCurrentUserFromToken();
    if (user) {
      setUserRole(user.role);
      setIsUserStudent(isStudent(user.role));
    }
  }, []);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Student shaxsiy davomat statistikasi
  const { data: myAttendance } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: async () => {
      const resp = await api.get('/api/attendance/my');
      return resp.data;
    },
    enabled: isUserStudent,
  });

  // Yangi dars modali
  const [isNewLessonModalOpen, setIsNewLessonModalOpen] = useState(false);
  const [newLessonTopic, setNewLessonTopic] = useState('');
  const [newLessonDate, setNewLessonDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Fetch all groups for dropdown
  const { data: groupsData } = useQuery({
    queryKey: ['groups-for-attendance'],
    queryFn: async () => {
      const resp = await api.get('/api/groups');
      return resp.data?.items || [];
    },
  });

  // Agar guruh tanlanmagan bo'lsa, birinchisini avtomatik tanlaymiz
  useEffect(() => {
    if (!selectedGroupId && groupsData && groupsData.length > 0) {
      setSelectedGroupId(String(groupsData[0].id));
    }
  }, [groupsData, selectedGroupId]);

  // 2. Fetch lessons for selected group
  const { data: lessonsData, isLoading: isLessonsLoading } = useQuery({
    queryKey: ['lessons', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const resp = await api.get('/api/attendance', { params: { group_id: selectedGroupId } });
      return resp.data?.lessons || [];
    },
    enabled: !!selectedGroupId,
  });

  const lessons: LessonItem[] = lessonsData || [];

  // Darslar yuklanganda avtomatik eng so'nggi darsni tanlash
  useEffect(() => {
    const currentLessons = lessonsData || [];
    if (currentLessons.length > 0) {
      if (!selectedLessonId || !currentLessons.some((l: LessonItem) => l.id === selectedLessonId)) {
        setSelectedLessonId(currentLessons[0].id);
      }
    } else {
      if (selectedLessonId !== null) {
        setSelectedLessonId(null);
      }
      setStudents([]);
    }
  }, [lessonsData, selectedLessonId]);

  // 3. Fetch attendance for selected lesson
  const { data: lessonAttendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ['lesson-attendance', selectedLessonId],
    queryFn: async () => {
      if (!selectedLessonId) return null;
      const resp = await api.get(`/api/attendance/lesson/${selectedLessonId}`);
      return resp.data;
    },
    enabled: !!selectedLessonId,
  });

  useEffect(() => {
    if (lessonAttendanceData?.students) {
      setStudents(lessonAttendanceData.students);
    }
  }, [lessonAttendanceData]);

  // 4. Create Lesson Mutation
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
      queryClient.invalidateQueries({ queryKey: ['lessons', selectedGroupId] });
      setIsNewLessonModalOpen(false);
      setNewLessonTopic('');
      if (data?.lesson?.id) {
        setSelectedLessonId(data.lesson.id);
      }
    },
  });

  // 5. Bulk Save Attendance Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        lesson_id: selectedLessonId,
        attendance: students.map((s) => ({
          student_id: s.student_id,
          status: s.status,
          note: s.note,
        })),
      };
      const resp = await api.post('/api/attendance/bulk-save', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-attendance', selectedLessonId] });
      setSaveMessage("Davomat muvaffaqiyatli saqlandi!");
      setTimeout(() => setSaveMessage(''), 4000);
    },
  });

  // Quick Action: Hamma keldi
  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, status: 'present' }))
    );
  };

  // Change single student status
  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  };

  // Change single student note
  const handleNoteChange = (studentId: number, note: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, note } : s))
    );
  };

  const currentLesson = lessons.find((l) => l.id === selectedLessonId);

  // Status counts
  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const lateCount = students.filter((s) => s.status === 'late').length;
  const excusedCount = students.filter((s) => s.status === 'excused').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Davomat Tizimi</h1>
          <p className="text-sm text-gray-500">
            Darslar bo&apos;yicha o&apos;quvchilar qatnashuvini belgilash va kuzatish
          </p>
        </div>

        {/* Group Selector & Create Lesson Button */}
        <div className="flex items-center gap-3">
          <select
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setSelectedLessonId(null);
            }}
            className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(groupsData || []).map((g: { id: number; name: string }) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {!isUserStudent && (
            <button
              disabled={!selectedGroupId}
              onClick={() => setIsNewLessonModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi dars</span>
            </button>
          )}
        </div>
      </div>

      {/* Student Personal Stats Banner */}
      {isUserStudent && myAttendance && (
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
              {myAttendance.rate}%
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Sizning umumiy davomatingiz</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Jami {myAttendance.total} ta darsdan {myAttendance.present} tasida ishtirok etgansiz
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100/80 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {myAttendance.rate >= 80 ? "A'lo davomat" : "Nazorat zarur"}
          </span>
        </div>
      )}

      {/* Save Success Alert */}
      {saveMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold">{saveMessage}</span>
        </div>
      )}

      {/* Main Container: Lessons on Left, Attendance Table on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left: Lessons List */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <h2 className="font-bold text-gray-800 text-sm">Darslar tarixi</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
              {lessons.length} ta
            </span>
          </div>

          {isLessonsLoading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : lessons.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              Bu guruhda hali darslar ochilmagan.
              <br />
              {!isUserStudent && (
                <button
                  onClick={() => setIsNewLessonModalOpen(true)}
                  className="mt-2 text-blue-600 font-semibold hover:underline"
                >
                  + Dars qo&apos;shish
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-[500px] pr-1">
              {lessons.map((lesson) => {
                const isSelected = lesson.id === selectedLessonId;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full text-left p-3 rounded-xl transition text-xs flex flex-col gap-1 border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-xs'
                        : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate max-w-[150px]">{lesson.topic}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(lesson.started_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Vaqti: {new Date(lesson.started_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Attendance Sheet */}
        <div className="lg:col-span-3 space-y-4">
          {selectedLessonId && currentLesson ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

              {/* Lesson Banner & Stats */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">
                      Dars #{currentLesson.id}
                    </span>
                    <h2 className="text-lg font-bold text-gray-900">{currentLesson.topic}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Sana: {new Date(currentLesson.started_at).toLocaleString('uz-UZ')}
                  </p>
                </div>

                {/* Quick actions */}
                {!isUserStudent && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMarkAllPresent}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition border border-emerald-200"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Hamma keldi</span>
                    </button>

                    <button
                      type="button"
                      disabled={saveMutation.isPending}
                      onClick={() => saveMutation.mutate()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-semibold transition shadow-xs"
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

              {/* Attendance Mini Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-green-50/70 border border-green-100 rounded-xl flex items-center justify-between">
                  <span className="text-green-700 font-medium">Kelganlar:</span>
                  <strong className="text-green-800 text-sm font-bold">{presentCount} ta</strong>
                </div>
                <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-center justify-between">
                  <span className="text-red-700 font-medium">Kelmadi:</span>
                  <strong className="text-red-800 text-sm font-bold">{absentCount} ta</strong>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl flex items-center justify-between">
                  <span className="text-amber-700 font-medium">Kechikdi:</span>
                  <strong className="text-amber-800 text-sm font-bold">{lateCount} ta</strong>
                </div>
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
                  <span className="text-blue-700 font-medium">Sababli:</span>
                  <strong className="text-blue-800 text-sm font-bold">{excusedCount} ta</strong>
                </div>
              </div>

              {/* Students Attendance Table */}
              {isAttendanceLoading ? (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : students.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  Ushbu guruhda o&apos;quvchilar yo&apos;q.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3">O&apos;quvchi</th>
                        <th className="px-4 py-3 text-center">Davomat</th>
                        <th className="px-4 py-3">Izoh / Sabab</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((student) => (
                        <tr key={student.student_id} className="hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-gray-900">{student.student_name}</p>
                            <p className="text-xs text-gray-400">{student.phone}</p>
                          </td>

                          {/* Status Toggle Buttons */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex rounded-xl p-1 bg-gray-100 gap-1">
                              <button
                                type="button"
                                disabled={isUserStudent}
                                onClick={() => handleStatusChange(student.student_id, 'present')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  student.status === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-emerald-700'
                                } ${isUserStudent ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                Keldi
                              </button>
                              <button
                                type="button"
                                disabled={isUserStudent}
                                onClick={() => handleStatusChange(student.student_id, 'absent')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  student.status === 'absent'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-rose-700'
                                } ${isUserStudent ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                Kelmadi
                              </button>
                              <button
                                type="button"
                                disabled={isUserStudent}
                                onClick={() => handleStatusChange(student.student_id, 'late')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  student.status === 'late'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-amber-700'
                                } ${isUserStudent ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                Kechikdi
                              </button>
                              <button
                                type="button"
                                disabled={isUserStudent}
                                onClick={() => handleStatusChange(student.student_id, 'excused')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  student.status === 'excused'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-blue-700'
                                } ${isUserStudent ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                Sababli
                              </button>
                            </div>
                          </td>

                          {/* Note Input */}
                          <td className="px-4 py-3.5">
                              <input
                                type="text"
                                disabled={isUserStudent}
                                value={student.note || ''}
                                onChange={(e) => handleNoteChange(student.student_id, e.target.value)}
                                placeholder="Sabab yoki qo'shimcha izoh..."
                                className={`w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition ${isUserStudent ? 'cursor-not-allowed opacity-70' : ''}`}
                              />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottom save bar */}
              {!isUserStudent && (
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Davomat o&apos;zgarishlarini saqlashni unutmang.
                  </span>
                  <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                  >
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Davomatni saqlash</span>
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
              <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold">Dars tanlanmagan</p>
              <p className="text-xs text-gray-400 mt-1">
                Chap tarafdan kerakli darsni tanlang yoki yangi dars yarating
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Yangi Dars Ochish */}
      {isNewLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Yangi dars ochish</h3>
              <button
                onClick={() => setIsNewLessonModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLessonMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dars mavzusi *
                </label>
                <input
                  type="text"
                  required
                  value={newLessonTopic}
                  onChange={(e) => setNewLessonTopic(e.target.value)}
                  placeholder="Masalan: Unit 3: Conditionals & Future Tenses"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dars sanasi *
                </label>
                <input
                  type="date"
                  required
                  value={newLessonDate}
                  onChange={(e) => setNewLessonDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewLessonModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createLessonMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {createLessonMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
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
