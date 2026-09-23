'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  DoorOpen, Plus, Users, Loader2, X, AlertCircle, CheckCircle,
  Pencil, Trash2, Search, AlertTriangle
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useCurrentUser } from '@/lib/useCurrentUser';

interface RoomItem {
  id: number;
  name: string;
  capacity: number;
  groups_count: number;
  status: number;
}

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const { isTeacher, isStudent } = useCurrentUser();
  const canEdit = !isStudent;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    capacity: 20,
  });
  const [formError, setFormError] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    capacity: 20,
    status: 1,
  });
  const [editFormError, setEditFormError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState<RoomItem | null>(null);

  // Fetch Rooms
  const { data, isLoading } = useQuery({
    queryKey: ['rooms', search, statusFilter],
    queryFn: async () => {
      const resp = await api.get('/api/rooms', {
        params: {
          search: search || undefined,
          status: statusFilter !== '' ? statusFilter : undefined,
        },
      });
      return resp.data?.items || [];
    },
  });

  // Create Room Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const resp = await api.post('/api/rooms', payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsModalOpen(false);
      setFormData({ name: '', capacity: 20 });
      setFormError('');
    },
    onError: () => {
      setFormError("Xonani qo'shishda xatolik yuz berdi");
    },
  });

  // Update Room Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: typeof editFormData) => {
      if (!editingRoom) return;
      const resp = await api.put(`/api/rooms/${editingRoom.id}`, payload);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsEditModalOpen(false);
      setEditingRoom(null);
      setEditFormError('');
    },
    onError: () => {
      setEditFormError("Xonani yangilashda xatolik yuz berdi");
    },
  });

  // Delete Room Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await api.delete(`/api/rooms/${id}`);
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-manager'] });
      setIsDeleteModalOpen(false);
      setDeletingRoom(null);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setFormError('Xona nomi kiritilishi shart');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleOpenEdit = (room: RoomItem) => {
    setEditingRoom(room);
    setEditFormData({
      name: room.name,
      capacity: room.capacity,
      status: room.status,
    });
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name) {
      setEditFormError('Xona nomi kiritilishi shart');
      return;
    }
    updateMutation.mutate(editFormData);
  };

  const handleOpenDelete = (room: RoomItem) => {
    setDeletingRoom(room);
    setIsDeleteModalOpen(true);
  };

  const rooms: RoomItem[] = data || [];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Auditoriyalar (Xonalar)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Jami {rooms.length} ta dars xonasi ro&apos;yxatga olingan
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi xona</span>
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Xona nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 transition"
          />
        </div>

        <div className="w-full sm:w-48">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: '', label: 'Barcha holatlar' },
              { value: '1', label: 'Faol xonalar' },
              { value: '0', label: 'Nofaol / Arxiv' },
            ]}
            placeholder="Barcha holatlar"
          />
        </div>
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
          <DoorOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Hech qanday xona topilmadi</p>
          <p className="text-xs text-gray-400 mt-1">Yangi xona qo&apos;shing yoki qidiruv filtrini tozalang</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                    room.status === 1 
                      ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}>
                    <DoorOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{room.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" /> {room.capacity} o&apos;rin
                      </span>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {room.groups_count || 0} ta guruh
                      </span>
                    </div>
                  </div>
                </div>

                {room.status === 1 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle className="w-3 h-3" /> Faol
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500">
                    Nofaol
                  </span>
                )}
              </div>

              {/* Action buttons */}
              {canEdit && (
                <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(room)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Tahrirlash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(room)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                    title="Arxivlash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Arxivlash</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Yangi Xona */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Yangi xona qo&apos;shish</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900 rounded-xl text-red-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Xona nomi yoki raqami *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: 202-xona (IELTS)"
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Sig&apos;imi (o&apos;quvchilar o&apos;rni)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-750 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xonani Tahrirlash (Edit) */}
      {isEditModalOpen && editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">Xonani tahrirlash</h3>
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
                  Xona nomi yoki raqami *
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
                  Sig&apos;imi (o&apos;quvchilar o&apos;rni)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editFormData.capacity}
                  onChange={(e) => setEditFormData({ ...editFormData, capacity: Number(e.target.value) })}
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
                  <option value={1}>Faol xona</option>
                  <option value={0}>Nofaol / Arxiv</option>
                </select>
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

      {/* Modal: Xonani Arxivlash / O'chirish Tasdig'i */}
      {isDeleteModalOpen && deletingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border dark:border-gray-700 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Xonani arxivlashni tasdiqlaysizmi?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong className="text-gray-800 dark:text-gray-200">&quot;{deletingRoom.name}&quot;</strong> xonasi nofaol holatga o&apos;tkaziladi va faol xonalar ro&apos;yxatida ko&apos;rinmaydi.
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
                onClick={() => deleteMutation.mutate(deletingRoom.id)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Ha, arxivlash</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
