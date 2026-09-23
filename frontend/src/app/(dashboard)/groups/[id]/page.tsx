'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  BookOpen, Users, GraduationCap, DoorOpen, Clock, Calendar,
  ChevronLeft, PlusCircle, Trash2, Loader2, AlertCircle, Phone, Mail,
  Pencil, AlertTriangle, X, CreditCard, DollarSign, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { formatMoney } from '@/lib/utils';

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

interface PaymentPlanItem {
  id: number;
  student_id: number;
  student_name: string;
  student_phone: string;
  group_id: number;
  group_name: string;
  month: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue' | 'cancelled';
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const label = d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' });
  return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) };
});

export default function GroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const groupId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'students' | 'lessons' | 'payments'>('students');
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

  // ─── To'lovlar Tab State ───────────────────────────────────────────────────
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payFormData, setPayFormData] = useState({
    student_id: '',
    student_name: '',
    amount: 500000,
    method: 'cash',
    month: selectedPaymentMonth,
    note: '',
  });
  const [payError, setPayError] = useState('');

  // ─── Edit Modal State ──────────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  // ─── Delete Modal State ────────────────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  // 3. Dropdowns for edit
  const { data: coursesData } = useQuery({
    queryKey: ['courses-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/courses');
      return resp.data?.items || [];
    },
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/teachers');
      return resp.data?.items || [];
    },
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms-dropdown'],
    queryFn: async () => {
      const resp = await api.get('/api/rooms');
      return resp.data?.items || [];
    },
  });

  // 4. Fetch Group Payments for selected month
  const { data: groupPaymentsData, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ['group-payments', groupId, selectedPaymentMonth],
    queryFn: async () => {
      const resp = await api.get('/api/payments', {
        params: {
          group_id: groupId,
          month: selectedPaymentMonth,
        },
      });
      return resp.data;
    },
    enabled: activeTab === 'payments',
  });

  // 5. Add student mutation
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

  // 6. Remove student mutation
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

  // 7. Generate lessons mutation
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

  // 8. Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async (payload: typeof editFormData) => {
      const scheduleArray = payload.days.split('-').map((d) => ({
        day: d.trim(),
        time: payload.time,
      }));

      const body = {
        name: payload.name,
        course_id: Number(payload.course_id),
        teacher_id: Number(payload.teacher_id),
        room_id: payload.room_id ? Number(payload.room_id) : null,
        schedule: scheduleArray,
        start_date: payload.start_date,
        max_students: Number(payload.max_students),
        status: payload.status,
      };

      const resp = await api.put(`/api/groups/${groupId}`, body);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setIsEditModalOpen(false);
      setEditFormError('');
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

  // 9. Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      const resp = await api.delete(`/api/groups/${groupId}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setIsDeleteModalOpen(false);
      router.push('/groups');
    },
  });

  // 10. Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (payload: typeof payFormData) => {
      const resp = await api.post('/api/payments', {
        student_id: Number(payload.student_id),
        group_id: Number(groupId),
        amount: Number(payload.amount),
        method: payload.method,
        month: payload.month,
        note: payload.note,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-payments', groupId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsPayModalOpen(false);
      setPayError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setPayError(err.response?.data?.message || "To'lovni saqlashda xatolik yuz berdi");
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
        <p className="text-gray-700 dark:text-gray-300 font-semibold">Guruh topilmadi</p>
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

  const courses = coursesData || [];
  const teachers = teachersData || [];
  const rooms = roomsData || [];

  const paymentPlans: PaymentPlanItem[] = groupPaymentsData?.items || [];
  const paymentSummary = groupPaymentsData?.summary || {
    total_billed: 0,
    total_paid: 0,
    total_remaining: 0,
    count_paid: 0,
    count_partial: 0,
    count_pending: 0,
    count_overdue: 0,
  };

  const handleOpenEdit = () => {
    const firstSchedule = group.schedule && group.schedule.length > 0 ? group.schedule[0] : null;
    const daysStr = group.schedule && group.schedule.length > 0 ? group.schedule.map((s: { day: string }) => s.day).join('-') : 'Dush-Chor-Jum';
    const timeStr = firstSchedule ? firstSchedule.time : '14:00 - 16:00';

    setEditFormData({
      name: group.name || '',
      course_id: String(group.course_id || ''),
      teacher_id: String(group.teacher_id || ''),
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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.course_id || !editFormData.teacher_id) {
      setEditFormError("Guruh nomi, kursi va o'qituvchisi tanlanishi shart");
      return;
    }
    updateGroupMutation.mutate(editFormData);
  };

  const handleOpenPaymentModal = (studentId: number, studentName: string, remainingAmount?: number) => {
    const defaultAmount = remainingAmount && remainingAmount > 0 
      ? remainingAmount 
      : (group.course_price || 500000);

    setPayFormData({
      student_id: String(studentId),
      student_name: studentName,
      amount: defaultAmount,
      method: 'cash',
      month: selectedPaymentMonth,
      note: `${group.name} guruhi uchun to'lov`,
    });
    setPayError('');
    setIsPayModalOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payFormData.student_id || payFormData.amount <= 0) {
      setPayError("To'lov summasi 0 dan katta bo'lishi kerak");
      return;
    }
    recordPaymentMutation.mutate(payFormData);
  };

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

            {!isUserStudent && (
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Guruhni tahrirlash"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Tahrirlash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Guruhni arxivlash"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Arxivlash</span>
                </button>
              </div>
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

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>To&apos;lovlar</span>
        </button>
      </div>

      {/* Tab 1: Students */}
      {activeTab === 'students' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Guruh O&apos;quvchilari Ro&apos;yxati</h2>
              <p className="text-xs text-gray-400">Guruh tarkibidagi o&apos;quvchilar va ularning holati</p>
            </div>

            {/* Add student dropdown form */}
            {!isUserStudent && availableStudents.length > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-64">
                  <CustomSelect
                    value={selectedStudentId}
                    onChange={(val) => setSelectedStudentId(val)}
                    placeholder="O'quvchini tanlang..."
                    searchable={availableStudents.length > 5}
                    options={availableStudents.map((s: { id: number; name: string; phone: string }) => ({
                      value: String(s.id),
                      label: s.name,
                      subLabel: s.phone,
                    }))}
                  />
                </div>
                <button
                  disabled={!selectedStudentId || addStudentMutation.isPending}
                  onClick={() => selectedStudentId && addStudentMutation.mutate(Number(selectedStudentId))}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer"
                >
                  {addStudentMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Qo&apos;shish</span>
                </button>
              </div>
            )}
          </div>

          {addError && (
            <p className="text-xs text-red-600">{addError}</p>
          )}

          {students.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              Bu guruhda hozircha o&apos;quvchilar yo&apos;q.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">O&apos;quvchi</th>
                    <th className="px-4 py-3">Telefon</th>
                    <th className="px-4 py-3">Qo&apos;shilgan sana</th>
                    <th className="px-4 py-3">Holati</th>
                    {!isUserStudent && <th className="px-4 py-3 text-right">Amal</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {students.map((student) => (
                    <tr key={student.membership_id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <Link
                              href={`/students/${student.student_id}`}
                              className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition"
                            >
                              {student.name}
                            </Link>
                            {student.email && (
                              <p className="text-[11px] text-gray-400">{student.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                        {student.phone}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {student.enrolled_at}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                          student.status === 'active'
                            ? 'bg-green-100 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {student.status === 'active' ? 'O\'qimoqda' : 'Tark etgan'}
                        </span>
                      </td>
                      {!isUserStudent && (
                        <td className="px-4 py-3 text-right">
                          {student.status === 'active' && (
                            <button
                              onClick={() => removeStudentMutation.mutate(student.student_id)}
                              disabled={removeStudentMutation.isPending}
                              className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                              title="Guruhdan chiqarish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Tab 2: Lessons */}
      {activeTab === 'lessons' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Darslar Jadvali va Reja</h2>
              <p className="text-xs text-gray-400">Guruh darslari, mavzulari va o&apos;tkazilish vaqtlari</p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/attendance?group_id=${groupId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 text-violet-700 dark:text-violet-300 rounded-xl text-xs font-semibold transition"
              >
                <span>Davomatga o&apos;tish</span>
              </Link>

              {!isUserStudent && (
                <button
                  onClick={() => generateLessonsMutation.mutate()}
                  disabled={generateLessonsMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  {generateLessonsMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Rejani yangilash</span>
                </button>
              )}
            </div>
          </div>

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

      {/* Tab 3: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Guruh To&apos;lovlari va Balansi</h2>
              <p className="text-xs text-gray-400">O&apos;quvchilarning oylik to&apos;lov holati va qarzdorliklari</p>
            </div>

            <div className="w-full sm:w-60">
              <CustomSelect
                value={selectedPaymentMonth}
                onChange={(val) => setSelectedPaymentMonth(val)}
                options={MONTH_OPTIONS}
                placeholder="Oyni tanlang..."
              />
            </div>
          </div>

          {/* Payment Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 font-medium">Rejadagi to&apos;lov</p>
              <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
                {formatMoney(paymentSummary.total_billed)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Yig&apos;ilgan summa</p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {formatMoney(paymentSummary.total_paid)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Qolgan qarz</p>
              <p className="text-base font-bold text-rose-700 dark:text-rose-300 mt-1">
                {formatMoney(paymentSummary.total_remaining)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">To&apos;lov holati</p>
              <p className="text-base font-bold text-blue-700 dark:text-blue-300 mt-1">
                {paymentSummary.count_paid} / {activeStudents.length} ta to&apos;lagan
              </p>
            </div>
          </div>

          {/* Students Payments Table */}
          {isPaymentsLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : activeStudents.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              Bu guruhda o&apos;quvchilar mavjud emas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">O&apos;quvchi</th>
                    <th className="px-4 py-3">Kurs narxi</th>
                    <th className="px-4 py-3">To&apos;langan</th>
                    <th className="px-4 py-3">Qoldiq qarz</th>
                    <th className="px-4 py-3">Holati</th>
                    {!isUserStudent && <th className="px-4 py-3 text-right">Amal</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {activeStudents.map((student) => {
                    const plan = paymentPlans.find((p) => p.student_id === student.student_id);
                    const isPaid = plan?.status === 'paid';
                    const isPartial = plan?.status === 'partial';
                    const isOverdue = plan?.status === 'overdue';
                    const remaining = plan ? plan.remaining_amount : (group.course_price || 500000);

                    return (
                      <tr key={student.student_id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition">
                        <td className="px-4 py-3">
                          <Link
                            href={`/students/${student.student_id}`}
                            className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition"
                          >
                            {student.name}
                          </Link>
                          <p className="text-xs text-gray-400">{student.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                          {formatMoney(plan ? plan.amount : (group.course_price || 500000))}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(plan ? plan.paid_amount : 0)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">
                          {formatMoney(remaining)}
                        </td>
                        <td className="px-4 py-3">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> To&apos;langan
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Qisman to&apos;langan
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              Muddati o&apos;tgan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              To&apos;lanmagan
                            </span>
                          )}
                        </td>
                        {!isUserStudent && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(student.student_id, student.name, remaining)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>To&apos;lov olish</span>
                            </button>
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

      {/* Modal: To'lov qabul qilish */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">To&apos;lov qabul qilish</h3>
                <p className="text-xs text-gray-400">{payFormData.student_name} • {group.name}</p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              {payError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900 rounded-xl text-red-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  To&apos;lov summasi (so&apos;m) *
                </label>
                <input
                  type="number"
                  min="1000"
                  step="5000"
                  required
                  value={payFormData.amount}
                  onChange={(e) => setPayFormData({ ...payFormData, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  To&apos;lov usuli *
                </label>
                <select
                  value={payFormData.method}
                  onChange={(e) => setPayFormData({ ...payFormData, method: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="cash">Naqd pul (Cash)</option>
                  <option value="card">Plastik karta (Terminal)</option>
                  <option value="click">Click</option>
                  <option value="payme">Payme</option>
                  <option value="bank">Bank o&apos;tkazmasi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  To&apos;lov qaysi oy uchun
                </label>
                <select
                  value={payFormData.month}
                  onChange={(e) => setPayFormData({ ...payFormData, month: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Izoh (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={payFormData.note}
                  onChange={(e) => setPayFormData({ ...payFormData, note: e.target.value })}
                  placeholder="Kvitansiya yoki to'lov maqsadi..."
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
                >
                  {recordPaymentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>To&apos;lovni tasdiqlash</span>
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
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={updateGroupMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
                >
                  {updateGroupMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Guruhni O'chirish / Arxivlash tasdig'i */}
      {isDeleteModalOpen && (
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
                <strong className="text-gray-800 dark:text-gray-200">&quot;{group.name}&quot;</strong> guruhi arxiv holatiga o&apos;tkaziladi va faol guruhlar ro&apos;yxatidan olib tashlanadi.
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
                disabled={deleteGroupMutation.isPending}
                onClick={() => deleteGroupMutation.mutate()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                {deleteGroupMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Ha, arxivlash</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
