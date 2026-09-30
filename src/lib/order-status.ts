import type { OrderStatus } from '@/types';

export interface StatusMeta {
  title: string;
  actionLabel: string;
  next: OrderStatus | null;
  dot: string;
  columnBg: string;
  borderLeft: string;
  badge: string;
  text: string;
}

export const BOARD_STATUSES: OrderStatus[] = [
  'WAITING_PAYMENT',
  'PENDING',
  'IN_PREPARATION',
  'READY',
];

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  WAITING_PAYMENT: {
    title: 'Esperando Confirmación',
    actionLabel: 'Confirmar Pago',
    next: 'PENDING',
    dot: '#A855F7',
    columnBg: 'from-purple-900/25 via-transparent to-transparent',
    borderLeft: 'border-l-purple-500',
    badge: 'bg-purple-500/15 text-purple-300',
    text: 'text-purple-300',
  },
  PENDING: {
    title: 'Pendiente',
    actionLabel: 'Iniciar Preparación',
    next: 'IN_PREPARATION',
    dot: '#EF4444',
    columnBg: 'from-red-900/25 via-transparent to-transparent',
    borderLeft: 'border-l-red-500',
    badge: 'bg-red-500/15 text-red-300',
    text: 'text-red-300',
  },
  IN_PREPARATION: {
    title: 'En Preparación',
    actionLabel: 'Marcar Listo',
    next: 'READY',
    dot: '#EAB308',
    columnBg: 'from-yellow-900/20 via-transparent to-transparent',
    borderLeft: 'border-l-yellow-500',
    badge: 'bg-yellow-500/15 text-yellow-200',
    text: 'text-yellow-200',
  },
  READY: {
    title: 'Listo para Servir',
    actionLabel: 'Entregado',
    next: 'DELIVERED',
    dot: '#06D6A0',
    columnBg: 'from-mint/12 via-transparent to-transparent',
    borderLeft: 'border-l-mint',
    badge: 'bg-mint/15 text-mint',
    text: 'text-mint',
  },
  DELIVERED: {
    title: 'Entregado',
    actionLabel: 'Entregado',
    next: null,
    dot: '#6B7280',
    columnBg: 'from-gray-800/30 via-transparent to-transparent',
    borderLeft: 'border-l-gray-500',
    badge: 'bg-gray-500/15 text-gray-300',
    text: 'text-gray-300',
  },
};

export function getStatusMeta(status: string): StatusMeta {
  return STATUS_META[status as OrderStatus] || STATUS_META.PENDING;
}

export function formatDisplayId(displayId: number | string): string {
  return String(displayId).padStart(4, '0');
}
