'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Award, Plus, Calendar, Check, Users, FileText,
  Loader2, CheckCircle2, AlertCircle, Sparkles, X, TrendingUp,
  Star, BookOpen, Clock, HelpCircle
} from 'lucide-react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface AssessmentItem {
  id: number;
  group_id: number;
  group_name: string;
  title: string;
  type: string;
  max_score: number;
  date: string;
  average_score: number;
  scores_count: number;
}

interface StudentScore {
  student_id: number;
  student_name: string;
  score: number | string;
  feedback: string;
}

interface MyScoreItem {
  id: number;
  title: string;
  type: string;
  max_score: number;
  date: string;
  group_name: string;
  score: number | null;
  feedback: string | null;
  status: string;
}

export default function ExamsPage() {
  const queryClient = useQueryClient();
  const { isStudent: isUserStudent, isLoading: isUserLoading } = useCurrentUser();

  // ─── Student Mode: O'quvchining shaxsiy imtihon va test natijalari ─────────
  const { data: myScoresData, isLoading: isMyScoresLoading } = useQuery({
    queryKey: ['my-scores'],
    queryFn: async () => {
      const resp = await api.get('/api/assessments/my-scores');
      return resp.data as {
        scores: MyScoreItem[];
        stats: { total: number; average: number; highest: number };
      };
    },
    enabled: isUserStudent,
  });

  // ─── Teacher / Admin Mode: Baholash va guruhlarni boshqarish ───────────────
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Yangi imtihon modali
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'test',
    max_score: 100,
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  // 1. Fetch Groups for dropdown
  const { data: groupsData } = useQuery({
    queryKey: ['groups-for-exams'],
    queryFn: async () => {
      const resp = await api.get('/api/groups');
      return resp.data?.items || [];
    },
    enabled: !isUserStudent,
  });

  useEffect(() => {
    if (!isUserStudent && !selectedGroupId && groupsData && groupsData.length > 0) {
      setSelectedGroupId(String(groupsData[0].id));
    }
  }, [groupsData, selectedGroupId, isUserStudent]);

  // 2. Fetch Exams for selected group
  const { data: examsData, isLoading: isExamsLoading } = useQuery({
    queryKey: ['assessments', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const resp = await api.get('/api/assessments', { params: { group_id: selectedGroupId } });
      return resp.data?.items || [];
    },
    enabled: !isUserStudent && !!selectedGroupId,
  });

  const exams: AssessmentItem[] = examsData || [];

  useEffect(() => {
    if (!isUserStudent) {
      if (exams.length > 0) {
        if (!selectedExamId || !exams.some((e) => e.id === selectedExamId)) {
          setSelectedExamId(exams[0].id);
        }
      } else {
        setSelectedExamId(null);
        setScores([]);
      }
    }
  }, [exams, selectedExamId, isUserStudent]);

  // 3. Fetch Scores for selected exam
  const { data: examDetailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['assessment-details', selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return null;
      const resp = await api.get(`/api/assessments/${selectedExamId}`);
      return resp.data;
    },
    enabled: !isUserStudent && !!selectedExamId,
  });

  useEffect(() => {
    if (examDetailsData?.scores) {
      setScores(
        examDetailsData.scores.map((s: { student_id: number; student_name: string; score: number | null; feedback: string | null }) => ({
          student_id: s.student_id,
          student_name: s.student_name,
          score: s.score !== null ? s.score : '',
          feedback: s.feedback || '',
        }))
      );
    }
  }, [examDetailsData]);

  // 4. Create Exam Mutation (Teacher/Admin only)
  const createExamMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        group_id: Number(selectedGroupId),
        max_score: Number(formData.max_score),
      };
      const resp = await api.post('/api/assessments', payload);
      return resp.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assessments', selectedGroupId] });
      setIsModalOpen(false);
      setFormData({
        title: '',
        type: 'test',
        max_score: 100,
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
      if (data?.assessment?.id) {
        setSelectedExamId(data.assessment.id);
      }
    },
  });

  // 5. Save Scores Mutation (Teacher/Admin only)
  const saveScoresMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        scores: scores.map((s) => ({
          student_id: s.student_id,
          score: s.score !== '' ? Number(s.score) : null,
          feedback: s.feedback,
        })),
      };
      const resp = await api.post(`/api/assessments/${selectedExamId}/save-scores`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['assessment-details', selectedExamId] });
      setSaveMessage("Baholar muvaffaqiyatli saqlandi!");
      setTimeout(() => setSaveMessage(''), 4000);
    },
  });

  const handleScoreChange = (studentId: number, score: string) => {
    setScores((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, score } : s))
    );
  };

  const handleFeedbackChange = (studentId: number, feedback: string) => {
    setScores((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, feedback } : s))
    );
  };

  const currentExam = exams.find((e) => e.id === selectedExamId);

  // ─── Loading State ────────────────────────────────────────────────────────
  if (isUserLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs text-gray-400">Yuklanmoqda...</p>
      </div>
    );
  }

  // ─── O'quvchi UI qismi ───────────────────────────────────────────────────
  if (isUserStudent) {
    const myScores = myScoresData?.scores || [];
    const stats = myScoresData?.stats || { total: 0, average: 0, highest: 0 };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Mening Imtihon va Test Natijalarim
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Darslar bo&apos;yicha topshirgan testlaringiz, imtihon ballari va o&apos;qituvchi izohlari
          </p>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Jami baholashlar</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{stats.total} ta</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">O&apos;rtacha natija</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.average > 0 ? `${stats.average} ball` : "Baholanmagan"}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Eng yuqori ball</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {stats.highest > 0 ? `${stats.highest} ball` : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Exams List Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white text-base">Topshirilgan testlar va imtihonlar</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
              {myScores.length} ta natija
            </span>
          </div>

          {isMyScoresLoading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : myScores.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Sizda hali topshirilgan imtihon yoki test natijalari mavjud emas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3.5">Imtihon / Test</th>
                    <th className="px-6 py-3.5">Guruh</th>
                    <th className="px-6 py-3.5">Turi</th>
                    <th className="px-6 py-3.5">Ball / Natija</th>
                    <th className="px-6 py-3.5">Baho darajasi</th>
                    <th className="px-6 py-3.5">O&apos;qituvchi fikri</th>
                    <th className="px-6 py-3.5">Sana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {myScores.map((item) => {
                    const hasScore = item.score !== null;
                    const percent = hasScore ? Math.round((Number(item.score) / item.max_score) * 100) : 0;

                    let gradeBadge = (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">
                        Kutilmoqda
                      </span>
                    );
                    if (hasScore) {
                      if (percent >= 86) {
                        gradeBadge = (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                            A&apos;lo ({percent}%)
                          </span>
                        );
                      } else if (percent >= 71) {
                        gradeBadge = (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold">
                            Yaxshi ({percent}%)
                          </span>
                        );
                      } else if (percent >= 55) {
                        gradeBadge = (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold">
                            Qoniqarli ({percent}%)
                          </span>
                        );
                      } else {
                        gradeBadge = (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold">
                            Qayta topshirish ({percent}%)
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition">
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                          {item.title}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                          {item.group_name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {hasScore ? (
                            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                              {item.score} <span className="text-xs text-gray-400 font-normal">/ {item.max_score}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Baholanmagan</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {gradeBadge}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300 max-w-xs">
                          {item.feedback || <span className="text-gray-400 italic">-</span>}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                          {item.date}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── O'qituvchi / Admin UI qismi ──────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Imtihonlar va Baholash Tizimi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Guruhlar bo&apos;yicha testlar, imtihonlar o&apos;tkazish va o&apos;quvchilarni baholash
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-56">
            <CustomSelect
              value={selectedGroupId}
              onChange={(val) => {
                setSelectedGroupId(val);
                setSelectedExamId(null);
              }}
              placeholder="Guruhni tanlang..."
              searchable={(groupsData || []).length > 5}
              options={(groupsData || []).map((g: { id: number; name: string }) => ({
                value: String(g.id),
                label: g.name,
              }))}
            />
          </div>

          <button
            disabled={!selectedGroupId}
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi baholash</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {saveMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-2xl text-green-800 dark:text-green-300 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold">{saveMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left: Exams list */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
            <h2 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Imtihonlar</h2>
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
              {exams.length} ta
            </span>
          </div>

          {isExamsLoading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : exams.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              Bu guruhda hali imtihonlar yo&apos;q.
              <br />
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 text-blue-600 font-semibold hover:underline"
              >
                + Baholash yaratish
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-[500px] pr-1">
              {exams.map((exam) => {
                const isSelected = exam.id === selectedExamId;
                return (
                  <button
                    key={exam.id}
                    onClick={() => setSelectedExamId(exam.id)}
                    className={`w-full text-left p-3 rounded-xl transition text-xs flex flex-col gap-1 border ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'bg-white dark:bg-gray-900 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate max-w-[140px]">{exam.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 uppercase font-semibold">
                        {exam.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                      <span>Max: {exam.max_score} ball</span>
                      {exam.average_score > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          O&apos;rtacha: {exam.average_score}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Scores entry sheet */}
        <div className="lg:col-span-3 space-y-4">
          {selectedExamId && currentExam ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-6">

              {/* Exam Info Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 rounded-md text-xs font-bold uppercase">
                      {currentExam.type}
                    </span>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{currentExam.title}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Sana: {currentExam.date} • Maksimal ball: {currentExam.max_score}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {currentExam.average_score > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Guruh o&apos;rtacha bali</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{currentExam.average_score} ball</p>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={saveScoresMutation.isPending}
                    onClick={() => saveScoresMutation.mutate()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                  >
                    {saveScoresMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Ballarni saqlash</span>
                  </button>
                </div>
              </div>

              {/* Scores Table */}
              {isDetailsLoading ? (
                <div className="py-16 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : scores.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  Ushbu guruhda o&apos;quvchilar yo&apos;q.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                      <tr>
                        <th className="px-4 py-3">O&apos;quvchi</th>
                        <th className="px-4 py-3 w-36">Ball (/{currentExam.max_score})</th>
                        <th className="px-4 py-3">Izoh / Fikr</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {scores.map((item) => (
                        <tr key={item.student_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-gray-900 dark:text-white">{item.student_name}</p>
                          </td>

                          {/* Score Input */}
                          <td className="px-4 py-3.5">
                            <input
                              type="number"
                              min="0"
                              max={currentExam.max_score}
                              step="0.5"
                              value={item.score}
                              onChange={(e) => handleScoreChange(item.student_id, e.target.value)}
                              placeholder="0"
                              className="w-28 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 text-center"
                            />
                          </td>

                          {/* Feedback Input */}
                          <td className="px-4 py-3.5">
                            <input
                              type="text"
                              value={item.feedback}
                              onChange={(e) => handleFeedbackChange(item.student_id, e.target.value)}
                              placeholder="Fikr yoki tavsiya yozing..."
                              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 transition"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottom save bar */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                <button
                  type="button"
                  disabled={saveScoresMutation.isPending}
                  onClick={() => saveScoresMutation.mutate()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition shadow-sm"
                >
                  {saveScoresMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Barcha ballarni saqlash</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-16 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
              <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-700 dark:text-gray-300 font-semibold">Baholash tanlanmagan</p>
              <p className="text-xs text-gray-400 mt-1">
                Chap tarafdan baholashni tanlang yoki yangi imtihon oching
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Yangi Baholash yaratish */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white">Yangi baholash/imtihon ochish</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createExamMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Baholash nomi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masalan: Monthly Mock Exam #1"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Turi *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="test">Test</option>
                    <option value="exam">Imtihon (Exam)</option>
                    <option value="speaking">Speaking</option>
                    <option value="homework">Uy vazifasi</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Maksimal ball *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Sana *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tavsif (ixtiyoriy)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Imtihon bo'limlari yoki ko'rsatmalar..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createExamMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  {createExamMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Yaratish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
