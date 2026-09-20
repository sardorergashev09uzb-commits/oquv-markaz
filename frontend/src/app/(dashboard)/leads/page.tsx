'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  UserPlus, Search, Phone, MessageSquare, Plus, CheckCircle2,
  AlertCircle, Loader2, X, ChevronRight, GraduationCap, ArrowRight,
  Filter, Calendar, ExternalLink, UserCheck
} from 'lucide-react';
import Link from 'next/link';

interface LeadItem {
  id: number;
  name: string;
  phone: string;
  course_id: number | null;
  course_name: string | null;
  source: string | null;
  status: 'new' | 'contacted' | 'trial' | 'enrolled' | 'lost';
  notes: string | null;
  assigned_to_name: string | null;
  created_at: number;
}

interface ActivityItem {
  id: number;
  action: string;
  note: string | null;
  created_by_name: string | null;
  created_at: number;
}

export default function LeadsPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // 1. Modallar holatlari
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // New lead form
  const [formData, setFormData] = useState({
    name: '',
    phone: '+998',
    course_id: '',
    source: 'instagram',
    notes: '',
  });

  // Convert to student form
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Add activity form
  const [activityData, setActivityData] = useState({
    action: 'call',
    note: '',
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 2. Fetch Leads
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['crm-leads', statusFilter, sourceFilter, search],
    queryFn: async () => {
      const resp = await api.get('/api/leads', {
        params: {
          status: statusFilter || undefined,
          source: sourceFilter || undefined,
          search: search || undefined,
        },
      });
      return resp.data?.items || [];
    },
  });

  // 3. Fetch Courses for dropdown
  const { data: coursesData } = useQuery({
    queryKey: ['courses-crm'],
    queryFn: async () => {
      const resp = await api.get('/api/courses');
      return resp.data?.items || [];
    },
  });

  // 4. Fetch Groups for convert dropdown
  const { data: groupsData } = useQuery({
    queryKey: ['groups-crm'],
    queryFn: async () => {
      const resp = await api.get('/api/groups');
      return resp.data?.items || [];
    },
  });

  // Create Lead Mutation
  const createLeadMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        course_id: formData.course_id ? Number(formData.course_id) : null,
        source: formData.source,
        notes: formData.notes,
      };
      const resp = await api.post('/api/leads', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      setIsNewLeadModalOpen(false);
      setFormData({ name: '', phone: '+998', course_id: '', source: 'instagram', notes: '' });
      setSuccessMessage("Yangi lid ro'yxatga olindi!");
      setTimeout(() => setSuccessMessage(''), 4000);
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: number; status: string; note?: string }) => {
      const resp = await api.patch(`/api/leads/${id}/status`, { status, note });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      setSuccessMessage("Lid statusi yangilandi!");
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  // Convert to Student Mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLead) return;
      const resp = await api.post(`/api/leads/${selectedLead.id}/convert`, {
        group_id: selectedGroupId ? Number(selectedGroupId) : null,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsConvertModalOpen(false);
      setSelectedLead(null);
      setSelectedGroupId('');
      setSuccessMessage("Lid muvaffaqiyatli o'quvchiga aylantirildi va guruhga biriktirildi!");
      setTimeout(() => setSuccessMessage(''), 4000);
    },
  });

  // Add Activity Mutation
  const addActivityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLead) return;
      const resp = await api.post(`/api/leads/${selectedLead.id}/activity`, activityData);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      setIsActivityModalOpen(false);
      setSelectedLead(null);
      setActivityData({ action: 'call', note: '' });
      setSuccessMessage("Faoliyat logiga yozildi!");
      setTimeout(() => setSuccessMessage(''), 3000);
    },
  });

  const leads: LeadItem[] = leadsData || [];
  const courses = coursesData || [];
  const groups = groupsData || [];

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Yangi</span>;
      case 'contacted':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Bog&apos;lanildi</span>;
      case 'trial':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">Sinov darsi</span>;
      case 'enrolled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">O&apos;quvchi bo&apos;ldi</span>;
      case 'lost':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Rad etildi</span>;
      default:
        return null;
    }
  };

  const getSourceBadge = (source: string | null) => {
    if (!source) return null;
    return (
      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
        {source}
      </span>
    );
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">CRM & Lidlar Quvuri</h1>
          <p className="text-sm text-gray-500">
            Yangi arizalar, mijozlar bilan muloqot va o&apos;quvchiga aylantirish
          </p>
        </div>

        <button
          onClick={() => setIsNewLeadModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Yangi lid qo&apos;shish</span>
        </button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Ism yoki telefon raqam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="">Barcha bosqichlar</option>
            <option value="new">Yangi</option>
            <option value="contacted">Bog&apos;lanildi</option>
            <option value="trial">Sinov darsi</option>
            <option value="enrolled">O&apos;quvchi bo&apos;ldi</option>
            <option value="lost">Rad etildi</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="">Barcha manbalar</option>
            <option value="instagram">Instagram</option>
            <option value="telegram">Telegram</option>
            <option value="website">Sayt</option>
            <option value="friend">Tavsiya (Do&apos;st)</option>
            <option value="other">Boshqa</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Hech qanday lid topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5">Mijoz (Lid)</th>
                  <th className="px-6 py-3.5">Telefon</th>
                  <th className="px-6 py-3.5">Qiziqqan kursi</th>
                  <th className="px-6 py-3.5">Manba</th>
                  <th className="px-6 py-3.5">Holati</th>
                  <th className="px-6 py-3.5">Izoh</th>
                  <th className="px-6 py-3.5 text-right">Tezkor amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{lead.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(lead.created_at * 1000).toLocaleDateString('uz-UZ')}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-gray-700">
                      {lead.phone}
                    </td>

                    <td className="px-6 py-4 text-xs font-semibold text-blue-600">
                      {lead.course_name || 'Tanlanmagan'}
                    </td>

                    <td className="px-6 py-4">
                      {getSourceBadge(lead.source)}
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(lead.status)}
                    </td>

                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                      {lead.notes || '—'}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {/* Convert to Student button */}
                      {lead.status !== 'enrolled' && (
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsConvertModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition border border-emerald-200"
                          title="O'quvchiga aylantirish"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>O&apos;quvchi qilish</span>
                        </button>
                      )}

                      {/* Log Activity button */}
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsActivityModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                        title="Faoliyat / Qo'ng'iroq qayd etish"
                      >
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
                        <span>Qo&apos;ng&apos;iroq</span>
                      </button>

                      {/* Quick status stepper */}
                      {lead.status === 'new' && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: lead.id, status: 'contacted' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition border border-amber-200"
                        >
                          <span>Bog&apos;lanildi &rarr;</span>
                        </button>
                      )}

                      {lead.status === 'contacted' && (
                        <button
                          onClick={() => updateStatusMutation.mutate({ id: lead.id, status: 'trial' })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold transition border border-purple-200"
                        >
                          <span>Sinov darsi &rarr;</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Yangi Lid Qo'shish */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Yangi lid (ariza) qo&apos;shish</h3>
              <button
                onClick={() => setIsNewLeadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createLeadMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mijoz ismi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: Dilshod Rahimov"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Telefon raqami *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Qiziqqan kursi
                  </label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">Tanlang...</option>
                    {courses.map((c: { id: number; name: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kelish manbasi
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="telegram">Telegram</option>
                    <option value="website">Sayt</option>
                    <option value="friend">Tavsiya</option>
                    <option value="other">Boshqa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mijoz istagi / Izoh
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Kechki guruhga qiziqmoqda, IELTS topshirmoqchi..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {createLeadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lidni O'quvchiga Aylantirish (Conversion) */}
      {isConvertModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">O&apos;quvchiga aylantirish</h3>
              <button
                onClick={() => setIsConvertModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                convertMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs space-y-1">
                <p className="font-bold text-emerald-900">{selectedLead.name}</p>
                <p className="text-emerald-700">{selectedLead.phone}</p>
                <p className="text-emerald-600 mt-1 text-[11px]">
                  Ushbu lid uchun avtomatik <strong>O&apos;quvchi</strong> akkaunti yaratiladi (parol: Student123!).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Qaysi guruhga biriktirilsin? (ixtiyoriy)
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="">Guruhni tanlang...</option>
                  {groups.map((g: { id: number; name: string; course_name: string }) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.course_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={convertMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {convertMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>O&apos;quvchi qilish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Faoliyat / Qo'ng'iroq Qayd Etish */}
      {isActivityModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Qo&apos;ng&apos;iroq / Faoliyat qayd etish</h3>
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addActivityMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <p className="text-xs text-gray-500">Mijoz:</p>
                <p className="font-bold text-sm text-gray-900">{selectedLead.name} ({selectedLead.phone})</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Muloqot turi *
                </label>
                <select
                  value={activityData.action}
                  onChange={(e) => setActivityData({ ...activityData, action: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="call">Telefon qo&apos;ng&apos;irog&apos;i</option>
                  <option value="meeting">Ofisda uchrashuv</option>
                  <option value="trial_lesson">Sinov darsi</option>
                  <option value="note">Oddiy eslatma / izoh</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Natija / Xulosa *
                </label>
                <textarea
                  rows={3}
                  required
                  value={activityData.note}
                  onChange={(e) => setActivityData({ ...activityData, note: e.target.value })}
                  placeholder="Mijoz bilan nima gaplashildi? Masalan: Ertaga soat 15:00 da sinov darsiga keladigan bo'ldi..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={addActivityMutation.isPending || !activityData.note}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {addActivityMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Qayd etish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
