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

export default function GroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.id;
  const queryClient = useQueryClient();

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

  // 1. Fetch Group Details & Students
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
  const activeStudents = students.filter((s) => s.status === 'active');
  const availableStudents = (studentsData || []).filter(
    (s: { id: number }) => !activeStudents.some((as) => as.student_id === s.id)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Back button */}
      <div>
        <Link
          href="/groups"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Guruhlar ro&apos;yxatiga</span>
        </Link>
      </div>

      {/* Group Info Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {group.status}
              </span>
            </div>
            <p className="text-sm font-medium text-blue-600 mt-1">{group.course_name}</p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
              {activeStudents.length} / {group.max_students} o&apos;quvchi
            </span>
          </div>
        </div>

        {/* Group Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-2.5 text-gray-600">
            <GraduationCap className="w-5 h-5 text-violet-500" />
            <div>
              <p className="text-xs text-gray-400">O&apos;qituvchi</p>
              <p className="font-semibold text-gray-800">{group.teacher_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600">
            <DoorOpen className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs text-gray-400">Xona</p>
              <p className="font-semibold text-gray-800">{group.room_name || 'Mavjud emas'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600">
            <Clock className="w-5 h-5 text-cyan-500" />
            <div>
              <p className="text-xs text-gray-400">Jadval</p>
              <p className="font-semibold text-gray-800">
                {group.schedule?.length ? group.schedule.map((s: { day: string; time: string }) => `${s.day} (${s.time})`).join(', ') : 'Belgilanmagan'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-gray-600">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-xs text-gray-400">Boshlanish sanasi</p>
              <p className="font-semibold text-gray-800">{group.start_date || 'Noma\'lum'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Students List in Group */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Guruh O&apos;quvchilari</h2>
            <p className="text-xs text-gray-400">Ushbu guruhda o&apos;qiyotgan faol o&apos;quvchilar ro&apos;yxati</p>
          </div>

          {/* Add student dropdown */}
          {!isUserStudent && availableStudents.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
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
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">O&apos;quvchi</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Qo&apos;shilgan sana</th>
                  {!isUserStudent && (
                    <th className="px-4 py-3 text-right">Amal</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeStudents.map((s) => (
                  <tr key={s.membership_id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {s.name.charAt(0)}
                        </div>
                        <Link
                          href={`/students/${s.student_id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600 transition"
                        >
                          {s.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-xs">
                      {s.phone}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">
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
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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

    </div>
  );
}
