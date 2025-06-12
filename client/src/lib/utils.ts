import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

export function formatCurrency(amount: string | number, currency: string = 'IDR'): string {
  const formatted = formatMoney(amount);
  return `${currency} ${formatted}`;
}

export function formatDate(date: Date | string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date | string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function generateAvatarUrl(name: string): string {
  if (!name) return '';
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Generate a simple avatar URL using UI Avatars service
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=6366f1&color=white&size=40`;
}

export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'confirmed':
    case 'completed':
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'pending':
    case 'processing':
      return 'text-yellow-600 bg-yellow-100';
    case 'cancelled':
    case 'rejected':
    case 'failed':
      return 'text-red-600 bg-red-100';
    case 'rescheduled':
      return 'text-blue-600 bg-blue-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}