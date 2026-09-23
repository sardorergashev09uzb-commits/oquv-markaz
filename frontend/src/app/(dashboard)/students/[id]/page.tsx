'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  User, Phone, Mail, Calendar, BookOpen, ChevronLeft,
  Loader2, CheckCircle, AlertCircle, PlusCircle, Shield,
  Pencil, Trash2, AlertTriangle, KeyRound, X, CreditCard,
  CheckCircle2, DollarSign, Receipt, History
} from 'lucide-react';
import Link from 'next/link';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useCurrentUser } from '@/lib/useCurrentUser';

function formatMoney(amount: number) {
  return (amount || 0).toLocaleString('uz-UZ') + " so'm";
}

const PAYMENT_METHOD_NAMES: Record<string, string> = {
  cash: 'Naqd pul',
  card: 'Plastik karta',
  payme: 'Payme / Click',
  bank: 'Bank o\'tkazmasi',
};

interface StudentGroup {
  membership_id: number;
  group_id: number;
  group_name: string;
  course_name: string;
  teacher_name: string;
  enrolled_at: string;
  status: string;
}

interface PaymentPlanItem {
  id: number;
  student_id: number;
  group_id: number;
  month: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  group?: {
    id: number;
    name: string;
    course?: { name: string; price: number };
  };
}

interface PaymentHistoryItem {
  id: number;
  plan_id: number;
  amount: number;
  paid_at: string;
  payment_method: string;
  note?: string;
  plan?: {
    month: string;
    group?: { name: string };
  };
  receivedBy?: {
    name: string;
  };
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

  // Payment Tab/Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentSubTab, setPaymentSubTab] = useState<'plans' | 'history'>('plans');
  const [payFormData, setPayFormData] = useState({
    group_id: '',
    amount: 500000,
    method: 'cash',
    month: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })(),
    note: '',
  });
  const [payError, setPayError] = useState('');

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

  // 6. Fetch Student Payments Plans
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery({
    queryKey: ['student-payments', studentId],
    queryFn: async () => {
      const resp = await api.get('/api/payments', { params: { student_id: studentId } });
      return resp.data;
    },
  });

  // 7. Fetch Student Payment History
  const { data: paymentHistoryData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['student-payment-history', studentId],
    queryFn: async () => {
      const resp = await api.get('/api/payments/history', { params: { student_id: studentId } });
      return resp.data?.items || [];
    },
  });

  // 8. Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (payload: typeof payFormData) => {
      const resp = await api.post('/api/payments', {
        student_id: Number(studentId),
        group_id: Number(payload.group_id),
        amount: Number(payload.amount),
        method: payload.method,
        month: payload.month,
        note: payload.note,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-payments', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-payment-history', studentId] });
      queryClient.invalidateQueries({ queryKey: ['group-payments'] });
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

  const paymentPlans: PaymentPlanItem[] = paymentsData?.items || [];
  const paymentHistory: PaymentHistoryItem[] = paymentHistoryData || [];
  const paymentSummary = paymentsData?.summary || {
    total_billed: 0,
    total_paid: 0,
    total_remaining: 0,
    count_paid: 0,
    count_partial: 0,
    count_pending: 0,
    count_overdue: 0,
  };

  const handleOpenPayModal = (groupId?: number, amount?: number, month?: string) => {
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const defaultGroup = groupId || (groups.length > 0 ? groups[0].group_id : '');
    setPayFormData({
      group_id: defaultGroup ? String(defaultGroup) : '',
      amount: amount && amount > 0 ? amount : 500000,
      method: 'cash',
      month: month || currentMonth,
      note: '',
    });
    setPayError('');
    setIsPayModalOpen(true);
  };

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

      {/* Payments & Financial History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>To&apos;lovlar va Moliyaviy Balans</span>
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              O&apos;quvchining oylik kurs to&apos;lovlari, qarzdorlik holati va kvitansiyalar tarixi
            </p>
          </div>

          {!isStudent && (
            <button
              type="button"
              onClick={() => handleOpenPayModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm shrink-0"
            >
              <CreditCard className="w-4 h-4" />
              <span>To&apos;lov qabul qilish</span>
            </button>
          )}
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-400 font-medium">Rejalashtirilgan summa</p>
            <p className="text-base font-bold text-gray-900 dark:text-white mt-1">
              {formatMoney(paymentSummary.total_billed)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Jami to&apos;langan</p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {formatMoney(paymentSummary.total_paid)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Umumiy qoldiq qarz</p>
            <p className="text-base font-bold text-rose-700 dark:text-rose-300 mt-1">
              {formatMoney(paymentSummary.total_remaining)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">To&apos;lov holati</p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-300 mt-1">
              {paymentSummary.count_paid} ta to&apos;liq to&apos;langan
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher: Plans vs History */}
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-750 pb-2">
          <button
            type="button"
            onClick={() => setPaymentSubTab('plans')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              paymentSubTab === 'plans'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Oylik To&apos;lov Rejalari ({paymentPlans.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentSubTab('history')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              paymentSubTab === 'history'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>To&apos;lov Cheklari / Tarixi ({paymentHistory.length})</span>
          </button>
        </div>

        {/* Sub-tab 1: Monthly Plans */}
        {paymentSubTab === 'plans' && (
          <div>
            {isPaymentsLoading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : paymentPlans.length === 0 ? (
              <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                Ushbu o&apos;quvchi uchun to&apos;lov rejalari hali shakllantirilmagan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Guruh & Kurs</th>
                      <th className="px-4 py-3">Oy</th>
                      <th className="px-4 py-3">Rejadagi summa</th>
                      <th className="px-4 py-3">To&apos;langan</th>
                      <th className="px-4 py-3">Qoldiq qarz</th>
                      <th className="px-4 py-3">Holati</th>
                      {!isStudent && <th className="px-4 py-3 text-right">Amal</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paymentPlans.map((plan) => {
                      const isPaid = plan.status === 'paid';
                      const isPartial = plan.status === 'partial';
                      const isOverdue = plan.status === 'overdue';

                      return (
                        <tr key={plan.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {plan.group?.name || `Guruh #${plan.group_id}`}
                            </span>
                            {plan.group?.course && (
                              <p className="text-xs text-gray-400">{plan.group.course.name}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                            {plan.month}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                            {formatMoney(plan.amount)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(plan.paid_amount)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-rose-600 dark:text-rose-400">
                            {formatMoney(plan.remaining_amount)}
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
                          {!isStudent && (
                            <td className="px-4 py-3 text-right">
                              {plan.remaining_amount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayModal(plan.group_id, plan.remaining_amount, plan.month)}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>To&apos;lov olish</span>
                                </button>
                              )}
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

        {/* Sub-tab 2: Payment History */}
        {paymentSubTab === 'history' && (
          <div>
            {isHistoryLoading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                To&apos;lov cheklari va o&apos;tkazmalar tarixi mavjud emas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Chek №</th>
                      <th className="px-4 py-3">Sana & Vaqt</th>
                      <th className="px-4 py-3">Guruh / Oy</th>
                      <th className="px-4 py-3">Summa</th>
                      <th className="px-4 py-3">To&apos;lov usuli</th>
                      <th className="px-4 py-3">Qabul qiluvchi</th>
                      <th className="px-4 py-3">Izoh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paymentHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          #{item.id}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                          {item.paid_at}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {item.plan?.group?.name || '-'}
                          </span>
                          {item.plan?.month && (
                            <span className="text-gray-400 ml-1">({item.plan.month})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          +{formatMoney(item.amount)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                          {PAYMENT_METHOD_NAMES[item.payment_method] || item.payment_method}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.receivedBy?.name || 'Administrator'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 italic">
                          {item.note || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

      {/* Modal: To'lov qabul qilish */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">To&apos;lov qabul qilish</h3>
                <p className="text-xs text-gray-400">{student.name} • #{student.id}</p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!payFormData.group_id) {
                  setPayError("Iltimos, guruhni tanlang");
                  return;
                }
                if (!payFormData.amount || payFormData.amount <= 0) {
                  setPayError("To'lov summasi 0 dan katta bo'lishi kerak");
                  return;
                }
                recordPaymentMutation.mutate(payFormData);
              }}
              className="p-6 space-y-4"
            >
              {payError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900 rounded-xl text-red-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Guruh *
                </label>
                <select
                  required
                  value={payFormData.group_id}
                  onChange={(e) => setPayFormData({ ...payFormData, group_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="">Guruhni tanlang...</option>
                  {groups.map((g) => (
                    <option key={g.group_id} value={g.group_id}>
                      {g.group_name} ({g.course_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    To&apos;lov oyi *
                  </label>
                  <input
                    type="month"
                    required
                    value={payFormData.month}
                    onChange={(e) => setPayFormData({ ...payFormData, month: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                    <option value="cash">Naqd pul</option>
                    <option value="card">Plastik karta</option>
                    <option value="payme">Payme / Click</option>
                    <option value="bank">Bank o&apos;tkazmasi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  To&apos;lov summasi (so&apos;mda) *
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={1000}
                  value={payFormData.amount}
                  onChange={(e) => setPayFormData({ ...payFormData, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Izoh (ixtiyoriy)
                </label>
                <input
                  type="text"
                  placeholder="Kvitansiya raqami yoki eslatma"
                  value={payFormData.note}
                  onChange={(e) => setPayFormData({ ...payFormData, note: e.target.value })}
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {recordPaymentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
