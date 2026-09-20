'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Award, Plus, Search, ShieldCheck, Printer, CheckCircle2,
  AlertCircle, X, Loader2, QrCode, ExternalLink, Calendar, GraduationCap
} from 'lucide-react';

interface CertificateItem {
  id: number;
  student_id: number;
  student_name: string | null;
  group_id: number;
  group_name: string | null;
  course_name: string | null;
  cert_number: string;
  final_score: number | null;
  issued_at: string;
  created_at: number;
}

export default function CertificatesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyNumber, setVerifyNumber] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    message?: string;
    certificate?: {
      cert_number: string;
      student_name: string;
      course_name: string;
      group_name: string;
      final_score: number;
      issued_at: string;
      center: string;
    };
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Form state for generating certificate
  const [formData, setFormData] = useState({
    student_id: '',
    group_id: '',
    final_score: '',
  });
  const [formError, setFormError] = useState('');

  // 1. Fetch certificates
  const { data: certs = [], isLoading } = useQuery<CertificateItem[]>({
    queryKey: ['certificates-list'],
    queryFn: async () => {
      const res = await api.get('/api/certificates');
      return res.data?.items || [];
    },
  });

  // 2. Fetch students for generator dropdown
  const { data: students = [] } = useQuery({
    queryKey: ['students-list-mini'],
    queryFn: async () => {
      const res = await api.get('/api/students');
      return res.data?.items || [];
    },
    enabled: isGenerateModalOpen,
  });

  // 3. Fetch groups for generator dropdown
  const { data: groups = [] } = useQuery({
    queryKey: ['groups-list-mini'],
    queryFn: async () => {
      const res = await api.get('/api/groups');
      return res.data?.items || [];
    },
    enabled: isGenerateModalOpen,
  });

  // 4. Generate mutation
  const generateMutation = useMutation({
    mutationFn: async (payload: { student_id: number; group_id: number; final_score?: number }) => {
      const res = await api.post('/api/certificates/generate', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['certificates-list'] });
      setIsGenerateModalOpen(false);
      setFormData({ student_id: '', group_id: '', final_score: '' });
      setFormError('');
      if (data.certificate) {
        setSelectedCert(data.certificate);
      }
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Xatolik yuz berdi');
    },
  });

  // 5. Verify certificate function
  const handleVerify = async (numberToVerify: string) => {
    if (!numberToVerify.trim()) return;
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await api.get(`/api/certificates/verify/${encodeURIComponent(numberToVerify.trim())}`);
      setVerificationResult(res.data);
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        message: err.response?.data?.message || 'Tekshirishda xatolik',
      });
    } finally {
      setVerifying(false);
    }
  };

  const filteredCerts = certs.filter((c) => {
    const s = search.toLowerCase();
    return (
      (c.student_name && c.student_name.toLowerCase().includes(s)) ||
      (c.cert_number && c.cert_number.toLowerCase().includes(s)) ||
      (c.course_name && c.course_name.toLowerCase().includes(s))
    );
  });

  const totalCerts = certs.length;
  const avgScore =
    certs.length > 0
      ? (
          certs.reduce((acc, c) => acc + (c.final_score ? Number(c.final_score) : 0), 0) /
          certs.filter((c) => c.final_score != null).length || 0
        ).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bitiruv Sertifikatlari</h1>
          <p className="text-sm text-gray-500 mt-1">
            Rasmiy sertifikatlar generatsiya qilish va QR-kod orqali haqiqiyligini tekshirish
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setVerificationResult(null);
              setVerifyNumber('');
              setVerifyModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            QR Tekshirish
          </button>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Sertifikat berish
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Jami Berilgan</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">{totalCerts} ta</div>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">O&apos;rtacha Ball</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{avgScore} / 100</div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">QR Verifikatsiya</span>
            <div className="text-sm font-semibold text-gray-800 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Faol va himoyalangan
            </div>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <QrCode className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="O'quvchi ismi, sertifikat raqami yoki kurs nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            Yuklanmoqda...
          </div>
        ) : filteredCerts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            Sertifikatlar topilmadi
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Sertifikat №</th>
                  <th className="py-3 px-4">O&apos;quvchi</th>
                  <th className="py-3 px-4">Kurs / Guruh</th>
                  <th className="py-3 px-4 text-center">Yakuniy ball</th>
                  <th className="py-3 px-4">Berilgan sana</th>
                  <th className="py-3 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                      {cert.cert_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      {cert.student_name || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <span className="font-medium text-gray-800">{cert.course_name}</span>
                      <span className="text-gray-400 block text-xs">{cert.group_name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {cert.final_score != null ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          {cert.final_score} ball
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Belgilanmagan</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {cert.issued_at}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedCert(cert)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                        Ko&apos;rish & Chop etish
                      </button>
                      <button
                        onClick={() => {
                          setVerifyNumber(cert.cert_number);
                          setVerifyModalOpen(true);
                          handleVerify(cert.cert_number);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition"
                        title="QR tekshiruvini sinash"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Tekshirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Generate Certificate */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Award className="w-5 h-5 text-blue-600" />
                Sertifikat Generatsiya Qilish
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formData.student_id || !formData.group_id) {
                  setFormError("O'quvchi va guruhni tanlang");
                  return;
                }
                generateMutation.mutate({
                  student_id: Number(formData.student_id),
                  group_id: Number(formData.group_id),
                  final_score: formData.final_score ? Number(formData.final_score) : undefined,
                });
              }}
              className="p-5 space-y-4"
            >
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  O&apos;quvchini tanlang *
                </label>
                <select
                  required
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tanlang...</option>
                  {students.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tugatgan guruhi *
                </label>
                <select
                  required
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tanlang...</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.course?.name || 'Kurs'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Yakuniy Imtihon Bali (100 ballik tizimda)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="Masalan: 94.5"
                  value={formData.final_score}
                  onChange={(e) => setFormData({ ...formData, final_score: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={generateMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Yaratilmoqda...
                    </>
                  ) : (
                    'Sertifikat Yaratish'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Certificate Preview & Print */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal header */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 font-bold text-gray-800">
                <Award className="w-5 h-5 text-amber-500" />
                Sertifikat Ko&apos;rinishi & Chop Etish
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  <Printer className="w-4 h-4" />
                  Chop etish (PDF)
                </button>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Certificate Canvas */}
            <div className="p-8 sm:p-12 bg-[#faf9f6]">
              <div className="relative border-8 border-double border-amber-600/60 bg-white p-8 sm:p-12 text-center shadow-lg rounded-sm">
                {/* Decorative corner flourishes */}
                <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-700" />
                <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-700" />
                <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-700" />
                <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-700" />

                {/* Logo & header */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-300 text-amber-600 mb-3 shadow-sm">
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="font-serif tracking-widest text-2xl sm:text-3xl font-bold uppercase text-gray-800">
                  SERTIFIKAT
                </h2>
                <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold mt-1">
                  O&apos;quv Markaz N1 • Bitiruv Hujjati
                </p>

                <div className="my-6">
                  <p className="text-sm text-gray-500 italic">Ushbu sertifikat tasdiqlaydiki,</p>
                  <h3 className="text-2xl sm:text-4xl font-serif font-bold text-gray-900 mt-2 tracking-wide border-b-2 border-amber-200 pb-2 inline-block px-8">
                    {selectedCert.student_name}
                  </h3>
                </div>

                <p className="text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
                  Markazimizdagi <strong className="text-gray-900 font-bold">{selectedCert.course_name}</strong> bo&apos;yicha
                  intensiv o&apos;quv kursini muvaffaqiyatli tamomladi hamda barcha amaliy talablarni bajardi.
                </p>

                {selectedCert.final_score != null && (
                  <div className="mt-4">
                    <span className="inline-block px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-900">
                      Yakuniy Baholash Natijasi: {selectedCert.final_score} ball
                    </span>
                  </div>
                )}

                {/* Footer signatures & verification */}
                <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
                  <div>
                    <div className="text-xs text-gray-400 uppercase font-semibold">Berilgan sana</div>
                    <div className="text-sm font-semibold text-gray-800 mt-0.5">{selectedCert.issued_at}</div>
                    <div className="text-[11px] font-mono text-gray-500 mt-1">№ {selectedCert.cert_number}</div>
                  </div>

                  {/* QR placeholder box */}
                  <div className="p-2 border border-gray-300 rounded-lg bg-white flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded border border-dashed border-gray-400">
                      <QrCode className="w-8 h-8 text-gray-700" />
                    </div>
                    <div className="text-left text-[10px] text-gray-500">
                      <span className="font-semibold text-gray-700 block">QR Verifikatsiya</span>
                      Haqiqiylikni tekshirish uchun skaner qiling
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-400 uppercase font-semibold">O&apos;quv Markaz Rahbari</div>
                    <div className="font-serif italic text-base text-gray-800 mt-1">A. Rahimov</div>
                    <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Tasdiqlangan va Muhrlangan</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Public QR Verifier Dialog */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Sertifikatni Haqiqiyligini Tekshirish
              </div>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Sertifikat Raqami (CERT-YYYY-XXXXXX)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Masalan: CERT-2026-8941"
                    value={verifyNumber}
                    onChange={(e) => setVerifyNumber(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleVerify(verifyNumber)}
                    disabled={verifying || !verifyNumber.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tekshirish'}
                  </button>
                </div>
              </div>

              {/* Verification Result */}
              {verificationResult && (
                <div className={`p-4 rounded-xl border ${
                  verificationResult.valid
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-red-50/70 border-red-200 text-red-900'
                }`}>
                  <div className="flex items-start gap-3">
                    {verificationResult.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm">
                        {verificationResult.valid
                          ? 'Rasmiy Tasdiqlangan Sertifikat'
                          : 'Sertifikat Topilmadi'}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">
                        {verificationResult.message || (verificationResult.valid ? 'Ushbu sertifikat rasmiy markaz bazasida ro\'yxatdan o\'tgan.' : '')}
                      </p>

                      {verificationResult.valid && verificationResult.certificate && (
                        <div className="mt-3 space-y-1.5 text-xs border-t border-emerald-200/60 pt-2.5">
                          <div>
                            <span className="text-emerald-700 font-medium">O&apos;quvchi: </span>
                            <span className="font-bold text-gray-900">{verificationResult.certificate.student_name}</span>
                          </div>
                          <div>
                            <span className="text-emerald-700 font-medium">Kurs: </span>
                            <span className="font-bold text-gray-900">{verificationResult.certificate.course_name}</span>
                          </div>
                          <div>
                            <span className="text-emerald-700 font-medium">Berilgan sana: </span>
                            <span className="text-gray-800">{verificationResult.certificate.issued_at}</span>
                          </div>
                          {verificationResult.certificate.final_score && (
                            <div>
                              <span className="text-emerald-700 font-medium">Natija: </span>
                              <span className="font-bold text-emerald-700">{verificationResult.certificate.final_score} ball</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
