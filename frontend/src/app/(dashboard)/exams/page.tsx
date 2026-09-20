'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Award, Plus, Calendar, Check, Users, FileText,
  Loader2, CheckCircle2, AlertCircle, Sparkles, X, TrendingUp
} from 'lucide-react';

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

export default function ExamsPage() {
  const queryClient = useQueryClient();

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
  });

  useEffect(() => {
    if (!selectedGroupId && groupsData && groupsData.length > 0) {
      setSelectedGroupId(String(groupsData[0].id));
    }
  }, [groupsData, selectedGroupId]);

  // 2. Fetch Exams for selected group
  const { data: examsData, isLoading: isExamsLoading } = useQuery({
    queryKey: ['assessments', selectedGroupId],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const resp = await api.get('/api/assessments', { params: { group_id: selectedGroupId } });
      return resp.data?.items || [];
    },
    enabled: !!selectedGroupId,
  });

  const exams: AssessmentItem[] = examsData || [];

  useEffect(() => {
    if (exams.length > 0) {
      if (!selectedExamId || !exams.some((e) => e.id === selectedExamId)) {
        setSelectedExamId(exams[0].id);
      }
    } else {
      setSelectedExamId(null);
      setScores([]);
    }
  }, [exams, selectedExamId]);

  // 3. Fetch Scores for selected exam
  const { data: examDetailsData, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['assessment-details', selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return null;
      const resp = await api.get(`/api/assessments/${selectedExamId}`);
      return resp.data;
    },
    enabled: !!selectedExamId,
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

  // 4. Create Exam Mutation
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

  // 5. Save Scores Mutation
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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Imtihonlar va Baholash</h1>
          <p className="text-sm text-gray-500">
            Guruhlar bo&apos;yicha testlar, imtihonlar va o&apos;quvchilar natijalarini kiritish
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setSelectedExamId(null);
            }}
            className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(groupsData || []).map((g: { id: number; name: string }) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <button
            disabled={!selectedGroupId}
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi baholash</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {saveMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="font-semibold">{saveMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left: Exams list */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <h2 className="font-bold text-gray-800 text-sm">Imtihonlar</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
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
                        ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-xs'
                        : 'bg-white border-transparent hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate max-w-[140px]">{exam.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 uppercase font-semibold">
                        {exam.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                      <span>Max: {exam.max_score} ball</span>
                      {exam.average_score > 0 && (
                        <span className="text-emerald-600 font-semibold">
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

              {/* Exam Info Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-md text-xs font-bold uppercase">
                      {currentExam.type}
                    </span>
                    <h2 className="text-lg font-bold text-gray-900">{currentExam.title}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Sana: {currentExam.date} • Maksimal ball: {currentExam.max_score}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {currentExam.average_score > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Guruh o&apos;rtacha bali</p>
                      <p className="text-base font-bold text-emerald-600">{currentExam.average_score} ball</p>
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
                    <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3">O&apos;quvchi</th>
                        <th className="px-4 py-3 w-32">Ball (/{currentExam.max_score})</th>
                        <th className="px-4 py-3">Izoh / Fikr</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scores.map((item) => (
                        <tr key={item.student_id} className="hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-gray-900">{item.student_name}</p>
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
                              className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-center"
                            />
                          </td>

                          {/* Feedback Input */}
                          <td className="px-4 py-3.5">
                            <input
                              type="text"
                              value={item.feedback}
                              onChange={(e) => handleFeedbackChange(item.student_id, e.target.value)}
                              placeholder="Masalan: Yaxshi, faqat Listening bo'limida xatolar bor"
                              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottom save bar */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
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
            <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
              <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-semibold">Baholash tanlanmagan</p>
              <p className="text-xs text-gray-400 mt-1">
                Chap tarafdan baholashni tanlang yoki yangi imtihon oching
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Yangi Baholash yaratish */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Yangi baholash/imtihon ochish</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Baholash nomi *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masalan: Monthly Mock Exam #1"
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Turi *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="test">Test</option>
                    <option value="exam">Imtihon (Exam)</option>
                    <option value="speaking">Speaking</option>
                    <option value="homework">Uy vazifasi</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Maksimal ball *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Sana *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tavsif (ixtiyoriy)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Imtihon bo'limlari yoki ko'rsatmalar..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
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
