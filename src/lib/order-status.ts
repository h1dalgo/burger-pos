import type { OrderStatus } from '@/types';

export interface StatusMeta {
  title: string;
  actionLabel: string;
  next: OrderStatus | null;
  dot: string;
  badge: string;
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
    dot: '#6E3AA7',
    badge: 'bg-status-waiting/12 text-status-waiting',
  },
  PENDING: {
    title: 'Pendiente',
    actionLabel: 'Iniciar Preparación',
    next: 'IN_PREPARATION',
    dot: '#C1121F',
    badge: 'bg-status-pending/12 text-status-pending',
  },
  IN_PREPARATION: {
    title: 'En Preparación',
    actionLabel: 'Marcar Listo',
    next: 'READY',
    dot: '#A15C00',
    badge: 'bg-status-preparing/15 text-status-preparing',
  },
  READY: {
    title: 'Listo para Servir',
    actionLabel: 'Entregado',
    next: 'DELIVERED',
    dot: '#1B7A43',
    badge: 'bg-mint/12 text-mint-ink',
  },
  DELIVERED: {
    title: 'Entregado',
    actionLabel: 'Entregado',
    next: null,
    dot: '#6B7280',
    badge: 'bg-carbon/10 text-carbon/70',
  },
};

export function getStatusMeta(status: string): StatusMeta {
  return STATUS_META[status as OrderStatus] || STATUS_META.PENDING;
}

export function formatDisplayId(displayId: number | string): string {
  return String(displayId).padStart(4, '0');
}
