import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function elapsedSeconds(from: string | Date): number {
  const start = typeof from === 'string' ? new Date(from) : from;
  return Math.floor((Date.now() - start.getTime()) / 1000);
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
