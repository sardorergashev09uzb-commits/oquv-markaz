'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { exportToCSV } from '@/lib/exportExcel';
import {
  BookMarked, Plus, Calendar, Clock, Award,
  Loader2, X, AlertCircle, CheckCircle, FileText, CheckCircle2,
  Send, ExternalLink, MessageSquare, Download, Check, UserCheck, Eye
} from 'lucide-react';

interface SubmissionData {
  id?: number | null;
  student_id?: number;
  student_name?: string;
  student_phone?: string;
  submission_id?: number | null;
  status: string;
  file_url: string | null;
  comment: string | null;
  score: number | null;
  feedback: string | null;
  submitted_at: number | null;
  graded_at: number | null;
}

interface HomeworkItem {
  id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  max_score: number;
  group_name?: string | null;
  group_id?: number | null;
  lesson_topic?: string | null;
  submissions_count?: number;
  graded_count?: number;
  students_count?: number;
  my_submission?: SubmissionData | null;
  created_at: number;
}

export default function HomeworkPage() {
  const { isStudent, isLoading: isUserLoading } = useCurrentUser();
  const queryClient = useQueryClient();

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    group_id: '',
    lesson_id: '',
    title: '',
    description: '',
    deadline: '',
    max_score: 10,
  });
  const [formError, setFormError] = useState('');

  // Student Submission Modal State
  const [selectedHwForSubmit, setSelectedHwForSubmit] = useState<HomeworkItem | null>(null);
  const [submitComment, setSubmitComment] = useState('');
  const [submitFileUrl, setSubmitFileUrl] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Teacher Review & Grading Modal State
  const [selectedHwForReview, setSelectedHwForReview] = useState<HomeworkItem | null>(null);
  const [gradingScores, setGradingScores] = useState<Record<number, { score: string; feedback: string }>>({});
  const [reviewMessage, setReviewMessage] = useState('');

  // 1. Fetch Homeworks
  const { data, isLoading } = useQuery({
    queryKey: ['homework-list'],
    queryFn: async () => {
      const resp = await api.get('/api/homework');
      return resp.data?.items || [];
    },
  });

  // 2. Fetch Groups for dropdown
  const { data: groupsData } = useQuery({
    queryKey: ['groups-for-hw'],
    queryFn: async () => {
      const resp = await api.get('/api/groups');
      return resp.data?.items || [];
    },
  });

  // 3. Fetch Lessons for selected group
  const { data: lessonsData } = useQuery({
    queryKey: ['lessons-for-hw', formData.group_id],
    queryFn: async () => {
      if (!formData.group_id) return [];
      const resp = await api.get('/api/attendance', { params: { group_id: formData.group_id } });
      return resp.data?.lessons || [];
    },
    enabled: !!formData.group_id,
  });

  // 4. Fetch Submissions for Review Modal
  const { data: reviewData, isLoading: isReviewLoading, refetch: refetchSubmissions } = useQuery({
    queryKey: ['homework-submissions', selectedHwForReview?.id],
    queryFn: async () => {
      if (!selectedHwForReview) return null;
      const resp = await api.get(`/api/homework/${selectedHwForReview.id}/submissions`);
      return resp.data;
    },
    enabled: !!selectedHwForReview && !isStudent,
  });

  // Create Homework Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const resp = await api.post('/api/homework', {
        lesson_id: Number(payload.lesson_id),
        title: payload.title,
        description: payload.description,
        deadline: payload.deadline || null,
        max_score: Number(payload.max_score),
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-list'] });
      setIsModalOpen(false);
      setFormData({
        group_id: '',
        lesson_id: '',
        title: '',
        description: '',
        deadline: '',
        max_score: 10,
      });
      setFormError('');
    },
    onError: () => {
      setFormError("Uy vazifasini yaratishda xatolik yuz berdi");
    },
  });

  // Student Submit Homework Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedHwForSubmit) return;
      const resp = await api.post(`/api/homework/${selectedHwForSubmit.id}/submit`, {
        file_url: submitFileUrl,
        comment: submitComment,
      });
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-list'] });
      setSubmitSuccess("Vazifa muvaffaqiyatli topshirildi!");
      setTimeout(() => {
        setSelectedHwForSubmit(null);
        setSubmitSuccess('');
      }, 1200);
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.message || "Vazifani topshirishda xatolik yuz berdi.");
    },
  });

  // Teacher Grade Mutation
  const gradeMutation = useMutation({
    mutationFn: async ({ studentId, score, feedback }: { studentId: number; score: number; feedback: string }) => {
      if (!selectedHwForReview) return;
      const resp = await api.post(`/api/homework/${selectedHwForReview.id}/grade`, {
        student_id: studentId,
        score,
        feedback,
      });
      return resp.data;
    },
    onSuccess: (data) => {
      refetchSubmissions();
      queryClient.invalidateQueries({ queryKey: ['homework-list'] });
      setReviewMessage(data?.message || "Baholandi!");
      setTimeout(() => setReviewMessage(''), 3000);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lesson_id || !formData.title) {
      setFormError('Dars va vazifa sarlavhasi kiritilishi shart');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleOpenSubmitModal = (hw: HomeworkItem) => {
    setSelectedHwForSubmit(hw);
    setSubmitComment(hw.my_submission?.comment || '');
    setSubmitFileUrl(hw.my_submission?.file_url || '');
    setSubmitError('');
    setSubmitSuccess('');
  };

  const handleOpenReviewModal = (hw: HomeworkItem) => {
    setSelectedHwForReview(hw);
    setGradingScores({});
    setReviewMessage('');
  };

  // Excel Export
  const handleExportExcel = () => {
    const homeworks: HomeworkItem[] = data || [];
    if (isStudent) {
      const headers = ['Vazifa sarlavhasi', 'Guruh', 'Mavzu', 'Maksimal ball', 'Mening bahom', 'Holati', 'Muddat', 'Izoh'];
      const rows = homeworks.map(h => [
        h.title,
        h.group_name || '—',
        h.lesson_topic || '—',
        h.max_score,
        h.my_submission?.score != null ? `${h.my_submission.score} ball` : '—',
        h.my_submission?.status === 'graded' ? 'Baholangan' : h.my_submission?.status === 'submitted' ? 'Topshirilgan' : 'Topshirilmagan',
        h.deadline ? new Date(h.deadline).toLocaleDateString('uz-UZ') : '—',
        h.my_submission?.feedback || h.description || '',
      ]);
      exportToCSV(`uy_vazifalarim_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else {
      const headers = ['Vazifa sarlavhasi', 'Guruh', 'Mavzu', 'Maksimal ball', 'Guruh o\'quvchilari', 'Topshirganlar', 'Baholanganlar', 'Muddat'];
      const rows = homeworks.map(h => [
        h.title,
        h.group_name || '—',
        h.lesson_topic || '—',
        h.max_score,
        h.students_count || 0,
        h.submissions_count || 0,
        h.graded_count || 0,
        h.deadline ? new Date(h.deadline).toLocaleDateString('uz-UZ') : '—',
      ]);
      exportToCSV(`uy_vazifalari_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }
  };

  const homeworks: HomeworkItem[] = data || [];
  const groups = groupsData || [];
  const lessons = lessonsData || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isStudent ? 'Mening Uy Vazifalarim' : 'Uy Vazifalari & Topshiriqlar'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isStudent 
              ? "Guruhlaringiz bo'yicha berilgan barcha topshiriqlar, muddatlar va o'qituvchi baholari" 
              : "Darslar bo'yicha vazifalar yaratish, o'quvchilar topshirig'ini tekshirish va baholash"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {homeworks.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>
          )}
          {!isStudent && !isUserLoading && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi vazifa</span>
            </button>
          )}
        </div>
      </div>

      {/* Homework Grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : homeworks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
          <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Hozircha uy vazifalari mavjud emas</p>
          <p className="text-xs text-gray-400 mt-1">
            {isStudent ? "O'qituvchingiz hali yangi vazifa yuklamagan" : "Yangi topshiriq yarating"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {homeworks.map((hw) => {
            const mySub = hw.my_submission;
            const isGraded = mySub?.status === 'graded';
            const isSubmitted = mySub?.status === 'submitted';
            const totalStudents = hw.students_count || 0;
            const submittedCount = hw.submissions_count || 0;
            const gradedCount = hw.graded_count || 0;
            const submissionPercent = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

            return (
              <div
                key={hw.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top: Group & Max Score */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {hw.group_name || 'Guruh'}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Max: {hw.max_score} ball
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug">{hw.title}</h3>

                  {hw.lesson_topic && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span>{hw.lesson_topic}</span>
                    </p>
                  )}

                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-3 line-clamp-3 bg-gray-50 dark:bg-gray-750 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                    {hw.description || 'Topshiriq tavsifi kiritilmagan'}
                  </p>

                  {/* Deadline & Status Details */}
                  <div className="space-y-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    {hw.deadline && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Muddat: {new Date(hw.deadline).toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}

                    {/* Student Status Badge */}
                    {isStudent && (
                      <div className="pt-2">
                        {isGraded ? (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Baholandi: {mySub?.score} / {hw.max_score} ball
                              </span>
                            </div>
                            {mySub?.feedback && (
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 italic">
                                &quot;{mySub.feedback}&quot;
                              </p>
                            )}
                          </div>
                        ) : isSubmitted ? (
                          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span>Topshirilgan (Tekshirilmoqda)</span>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>Hali topshirilmagan</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Teacher Submissions Progress */}
                    {!isStudent && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Topshirish: {submittedCount} / {totalStudents} o&apos;quvchi
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono">{submissionPercent}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${submissionPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-0.5">
                          <span>{gradedCount} ta tekshirilgan</span>
                          <span>{new Date(hw.created_at * 1000).toLocaleDateString('uz-UZ')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                  {isStudent ? (
                    <button
                      onClick={() => handleOpenSubmitModal(hw)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        isSubmitted || isGraded
                          ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-650 text-gray-800 dark:text-gray-200'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitted || isGraded ? 'Topshiriqni ko\'rish / yangilash' : 'Vazifani topshirish'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenReviewModal(hw)}
                      className="w-full py-2.5 px-4 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <span>Tekshirish & Baholash ({submittedCount})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Student Submit Homework */}
      {selectedHwForSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Uy vazifasini topshirish</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedHwForSubmit.title}</p>
              </div>
              <button
                onClick={() => setSelectedHwForSubmit(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
              {submitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* Task Details Info Box */}
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 text-xs space-y-1.5 text-blue-900 dark:text-blue-200">
                <div className="flex items-center justify-between font-semibold">
                  <span>Guruh: {selectedHwForSubmit.group_name || '—'}</span>
                  <span>Maksimal ball: {selectedHwForSubmit.max_score}</span>
                </div>
                {selectedHwForSubmit.deadline && (
                  <div className="text-rose-600 dark:text-rose-400 font-medium">
                    Muddat: {new Date(selectedHwForSubmit.deadline).toLocaleString('uz-UZ')}
                  </div>
                )}
                {selectedHwForSubmit.description && (
                  <p className="text-gray-600 dark:text-gray-300 pt-1 border-t border-blue-100 dark:border-blue-900/40">
                    {selectedHwForSubmit.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Vazifa matni, yechimi yoki izohingiz
                </label>
                <textarea
                  rows={4}
                  value={submitComment}
                  onChange={(e) => setSubmitComment(e.target.value)}
                  placeholder="Vazifa bo'yicha javoblaringiz, matn yoki savollaringizni yozing..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Fayl yoki topshiriq havolasi (Google Drive, Telegram, fayl link)
                </label>
                <input
                  type="url"
                  value={submitFileUrl}
                  onChange={(e) => setSubmitFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/... yoki https://t.me/..."
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-mono"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Google Drive, rasm havolasi yoki topshiriq faylingiz linkini joylang
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedHwForSubmit(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                >
                  Yopish
                </button>
                <button
                  type="submit"
                  disabled={submitMutation.isPending || (!submitComment.trim() && !submitFileUrl.trim())}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Send className="w-4 h-4" />
                  <span>Topshirish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Teacher Review Submissions & Grading Drawer */}
      {selectedHwForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/80 dark:bg-gray-750">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Topshiriqlarni tekshirish: {selectedHwForReview.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Guruh: <span className="font-semibold text-gray-700 dark:text-gray-200">{selectedHwForReview.group_name || '—'}</span> • Maksimal: <span className="font-bold text-amber-700">{selectedHwForReview.max_score} ball</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedHwForReview(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewMessage && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{reviewMessage}</span>
              </div>
            )}

            {/* Modal Content: Students Submissions List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isReviewLoading ? (
                <div className="py-16 text-center flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                  <span className="text-xs text-gray-500">Topshiriqlar yuklanmoqda...</span>
                </div>
              ) : reviewData?.items?.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Ushbu guruhda o&apos;quvchilar topilmadi.
                </div>
              ) : (
                reviewData?.items?.map((st: SubmissionData) => {
                  const isGraded = st.status === 'graded';
                  const isSubmitted = st.status === 'submitted';
                  const studentId = st.student_id!;
                  const currentInput = gradingScores[studentId] || {
                    score: st.score != null ? String(st.score) : '',
                    feedback: st.feedback || '',
                  };

                  return (
                    <div
                      key={studentId}
                      className={`p-4 rounded-xl border transition ${
                        isGraded
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : isSubmitted
                          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                              {st.student_name}
                            </span>
                            <span className="text-xs font-mono text-gray-400">{st.student_phone}</span>
                          </div>
                          {st.submitted_at && (
                            <span className="text-[11px] text-gray-400 mt-0.5 block">
                              Topshirilgan: {new Date(st.submitted_at * 1000).toLocaleString('uz-UZ')}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isGraded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Baholangan: {st.score} ball
                            </span>
                          ) : isSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              Tekshirish kerak
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                              Topshirilmagan
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Student Submitted Content */}
                      {(st.comment || st.file_url) && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-750 rounded-xl space-y-2 text-xs">
                          {st.comment && (
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-0.5">O&apos;quvchi matni / javobi:</span>
                              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{st.comment}</p>
                            </div>
                          )}
                          {st.file_url && (
                            <div className="flex items-center gap-2 pt-1">
                              <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <a
                                href={st.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate max-w-md"
                              >
                                {st.file_url}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Grading Form */}
                      <div className="mt-3 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div className="w-32">
                          <input
                            type="number"
                            min="0"
                            max={selectedHwForReview.max_score}
                            placeholder={`Ball (max: ${selectedHwForReview.max_score})`}
                            value={currentInput.score}
                            onChange={(e) =>
                              setGradingScores({
                                ...gradingScores,
                                [studentId]: { ...currentInput, score: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-sm font-semibold rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="O'qituvchi xulosasi yoki tavsiyasi..."
                            value={currentInput.feedback}
                            onChange={(e) =>
                              setGradingScores({
                                ...gradingScores,
                                [studentId]: { ...currentInput, feedback: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-xs rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={gradeMutation.isPending || currentInput.score === ''}
                          onClick={() => {
                            gradeMutation.mutate({
                              studentId,
                              score: Number(currentInput.score),
                              feedback: currentInput.feedback,
                            });
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Saqlash</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                O&apos;quvchilar baholari saqlangach, ularning shaxsiy kabinetida ko&apos;rinadi
              </span>
              <button
                type="button"
                onClick={() => setSelectedHwForReview(null)}
                className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Teacher Creates New Homework */}
      {!isStudent && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Yangi uy vazifasi berish</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
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
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Guruhni tanlang *
                </label>
                <select
                  required
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value, lesson_id: '' })}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="">Guruhni tanlang...</option>
                  {groups.map((g: { id: number; name: string }) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Darsni tanlang *
                </label>
                <select
                  required
                  disabled={!formData.group_id}
                  value={formData.lesson_id}
                  onChange={(e) => setFormData({ ...formData, lesson_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-gray-100 dark:disabled:bg-gray-700"
                >
                  <option value="">Darsni tanlang...</option>
                  {lessons.map((l: { id: number; topic: string; started_at: string }) => (
                    <option key={l.id} value={l.id}>
                      #{l.id} - {l.topic} ({new Date(l.started_at).toLocaleDateString('uz-UZ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Topshiriq sarlavhasi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masalan: Essay Writing Task 2 & Reading Passages"
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Maksimal ball
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Topshirish muddati
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Batafsil topshiriq tavsifi
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Vazifa tafsilotlari, kitob betlari yoki savollar..."
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-650 bg-white dark:bg-gray-750 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
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
