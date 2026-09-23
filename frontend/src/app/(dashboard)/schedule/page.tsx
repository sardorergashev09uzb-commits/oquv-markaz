'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCurrentUser } from '@/lib/useCurrentUser';
import {
  Calendar as CalendarIcon, Clock, Users, DoorOpen, GraduationCap,
  Filter, ChevronLeft, ChevronRight, Loader2, BookOpen
} from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

const DAYS_OF_WEEK = [
  { key: 'Dush', label: 'Dushanba' },
  { key: 'Sesh', label: 'Seshanba' },
  { key: 'Chor', label: 'Chorshanba' },
  { key: 'Pay',  label: 'Payshanba' },
  { key: 'Jum',  label: 'Juma' },
  { key: 'Shan', label: 'Shanba' },
];

export default function SchedulePage() {
  const { isStudent } = useCurrentUser();
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {isStudent ? 'Mening Dars Jadvalim' : 'Haftalik Dars Jadvali'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isStudent 
              ? 'Siz a\'zo bo\'lgan guruhlarning haftalik dars vaqtlari va xonalari' 
              : 'Barcha xonalar, o\'qituvchilar va guruhlarning dars vaqtlari'}
          </p>
        </div>
      </div>

      {/* Filters bar (Only for admins/teachers) */}
      {!isStudent && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
            <Filter className="w-4 h-4 text-gray-400" />
            Filterlar:
          </div>

          {/* Room Filter */}
          <div className="min-w-[190px]">
            <CustomSelect
              value={selectedRoom}
              onChange={(val) => setSelectedRoom(val)}
              options={[
                { value: 'all', label: 'Barcha xonalar' },
                ...rooms.map((r: any) => ({
                  value: String(r.id),
                  label: `${r.name} (${r.capacity} o'rin)`,
                })),
              ]}
              placeholder="Xonani tanlang"
            />
          </div>

          {/* Teacher Filter */}
          <div className="min-w-[190px]">
            <CustomSelect
              value={selectedTeacher}
              onChange={(val) => setSelectedTeacher(val)}
              options={[
                { value: 'all', label: "Barcha o'qituvchilar" },
                ...teachers.map((t: any) => ({
                  value: String(t.id),
                  label: t.name,
                })),
              ]}
              placeholder="O'qituvchini tanlang"
            />
          </div>

          {(selectedRoom !== 'all' || selectedTeacher !== 'all') && (
            <button
              onClick={() => {
                setSelectedRoom('all');
                setSelectedTeacher('all');
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium transition ml-auto"
            >
              Filtrlarni tozalash
            </button>
          )}
        </div>
      )}

      {/* Weekly Timetable Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          Jadval yuklanmoqda...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {DAYS_OF_WEEK.map((day) => {
            const slots = getDaySchedule(day.key);
            return (
              <div key={day.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-[420px]">
                {/* Day Header */}
                <div className="p-3.5 bg-gray-50/80 dark:bg-gray-750/80 border-b border-gray-200 dark:border-gray-700 text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 block">
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
                        className="p-3 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition space-y-1.5"
                      >
                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                          <Clock className="w-3.5 h-3.5" />
                          {item.time}
                        </div>

                        {/* Group Name */}
                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                          {item.group.name}
                        </div>

                        {/* Course Name */}
                        <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{item.group.course_name || item.group.course?.name || 'Kurs'}</span>
                        </div>

                        {/* Teacher & Room */}
                        <div className="pt-1.5 border-t border-blue-100/80 dark:border-blue-900/40 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1 truncate">
                            <GraduationCap className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{item.group.teacher_name || item.group.teacher?.name || 'Ustoz'}</span>
                          </div>
                          {(item.group.room_name || item.group.room?.name) && (
                            <span className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300 shrink-0">
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
