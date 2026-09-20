import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Format helpers ─────────────────────────────────────────────────────────

export function formatMoney(amount: number, currency = 'so\'m'): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' ' + currency;
}

export function formatDate(date: string | number | Date): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | number | Date): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatPercent(value: number, decimals = 0): string {
  return value.toFixed(decimals) + '%';
}

// ─── Status helpers ──────────────────────────────────────────────────────────

export const ATTENDANCE_LABELS: Record<string, string> = {
  present: '✅ Keldi',
  absent:  '❌ Kelmadi',
  late:    '🕐 Kechikdi',
  excused: '📝 Sababli',
};

export const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  paid:      { label: '✅ To\'langan',  color: 'text-green-600 bg-green-50' },
  partial:   { label: '🟡 Qisman',      color: 'text-yellow-600 bg-yellow-50' },
  overdue:   { label: '🔴 Muddati o\'tgan', color: 'text-red-600 bg-red-50' },
  pending:   { label: '⏳ Kutilmoqda', color: 'text-gray-600 bg-gray-50' },
  cancelled: { label: '❌ Bekor',       color: 'text-gray-400 bg-gray-50' },
};

export const STUDENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Faol',        color: 'text-green-700 bg-green-100' },
  frozen:    { label: 'To\'xtatilgan', color: 'text-blue-700 bg-blue-100' },
  completed: { label: 'Tugatgan',    color: 'text-gray-700 bg-gray-100' },
  left:      { label: 'Tark etgan',  color: 'text-red-700 bg-red-100' },
};
