'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Calendar as CalendarIcon, Clock, Users, DoorOpen, GraduationCap,
  Filter, ChevronLeft, ChevronRight, Loader2, BookOpen
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'Dush', label: 'Dushanba' },
  { key: 'Sesh', label: 'Seshanba' },
  { key: 'Chor', label: 'Chorshanba' },
  { key: 'Pay',  label: 'Payshanba' },
  { key: 'Jum',  label: 'Juma' },
  { key: 'Shan', label: 'Shanba' },
];

export default function SchedulePage() {
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  // 1. Fetch groups with schedule
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups-schedule-list'],
    queryFn: async () => {
      const res = await api.get('/api/groups');
      return res.data?.items || [];
    },
  });

  // 2. Fetch rooms
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms-schedule-list'],
    queryFn: async () => {
      const res = await api.get('/api/rooms');
      return res.data?.items || [];
    },
  });

  // 3. Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers-schedule-list'],
    queryFn: async () => {
      const res = await api.get('/api/teachers');
      return res.data?.items || [];
    },
  });

  // Filter groups
  const filteredGroups = groups.filter((g: any) => {
    if (selectedRoom !== 'all' && String(g.room_id) !== selectedRoom) return false;
    if (selectedTeacher !== 'all' && String(g.teacher_id) !== selectedTeacher) return false;
    return true;
  });

  // Parse schedule items by day
  const getDaySchedule = (dayKey: string) => {
    const dayItems: Array<{ group: any; time: string }> = [];

    filteredGroups.forEach((g: any) => {
      let schedule = g.schedule;
      if (!schedule && g.schedule_json) {
        try {
          schedule = typeof g.schedule_json === 'string' ? JSON.parse(g.schedule_json) : g.schedule_json;
        } catch {
          schedule = [];
        }
      }
      if (Array.isArray(schedule)) {
        schedule.forEach((slot: any) => {
          if (slot.day === dayKey) {
            dayItems.push({ group: g, time: slot.time });
          }
        });
      }
    });

    // Sort by time
    dayItems.sort((a, b) => a.time.localeCompare(b.time));
    return dayItems;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Haftalik Dars Jadvali</h1>
          <p className="text-sm text-gray-500 mt-1">
            Barcha xonalar, o&apos;qituvchilar va guruhlarning dars vaqtlari
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          <Filter className="w-4 h-4 text-gray-400" />
          Filterlar:
        </div>

        {/* Room Filter */}
        <div className="min-w-[180px]">
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Barcha xonalar</option>
            {rooms.map((r: any) => (
              <option key={r.id} value={String(r.id)}>
                {r.name} ({r.capacity} o&apos;rin)
              </option>
            ))}
          </select>
        </div>

        {/* Teacher Filter */}
        <div className="min-w-[180px]">
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Barcha o&apos;qituvchilar</option>
            {teachers.map((t: any) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {(selectedRoom !== 'all' || selectedTeacher !== 'all') && (
          <button
            onClick={() => {
              setSelectedRoom('all');
              setSelectedTeacher('all');
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition ml-auto"
          >
            Filtrlarni tozalash
          </button>
        )}
      </div>

      {/* Weekly Timetable Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-gray-500 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          Jadval yuklanmoqda...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {DAYS_OF_WEEK.map((day) => {
            const slots = getDaySchedule(day.key);
            return (
              <div key={day.key} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[420px]">
                {/* Day Header */}
                <div className="p-3.5 bg-gray-50/80 border-b border-gray-200 text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                    {day.label}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {slots.length} ta dars
                  </span>
                </div>

                {/* Day slots list */}
                <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto">
                  {slots.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-300 text-xs text-center p-4">
                      Darslar yo&apos;q
                    </div>
                  ) : (
                    slots.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-blue-100 bg-blue-50/40 hover:bg-blue-50 transition space-y-1.5"
                      >
                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                          <Clock className="w-3.5 h-3.5" />
                          {item.time}
                        </div>

                        {/* Group Name */}
                        <div className="font-bold text-sm text-gray-900 leading-tight">
                          {item.group.name}
                        </div>

                        {/* Course Name */}
                        <div className="text-xs text-gray-600 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{item.group.course_name || item.group.course?.name || 'Kurs'}</span>
                        </div>

                        {/* Teacher & Room */}
                        <div className="pt-1.5 border-t border-blue-100/80 flex items-center justify-between text-[11px] text-gray-500">
                          <div className="flex items-center gap-1 truncate">
                            <GraduationCap className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{item.group.teacher_name || item.group.teacher?.name || 'Ustoz'}</span>
                          </div>
                          {(item.group.room_name || item.group.room?.name) && (
                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-medium text-gray-700 shrink-0">
                              {item.group.room_name || item.group.room?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
