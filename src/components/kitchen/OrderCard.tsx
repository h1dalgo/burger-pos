'use client';

import { motion } from 'framer-motion';
import { Clock, User, Table2, Banknote, Smartphone, CreditCard, Hash } from 'lucide-react';
import type { Order } from '@/types';
import OrderTimer from './OrderTimer';

const paymentIcons = {
  CASH: Banknote,
  MOBILE_PAYMENT: Smartphone,
  CARD: CreditCard,
};

const paymentLabels = {
  CASH: 'Efectivo',
  MOBILE_PAYMENT: 'Pago Móvil',
  CARD: 'Tarjeta',
};

const statusAccents: Record<string, { border: string; glow: string; badge: string }> = {
  WAITING_PAYMENT: { border: 'border-l-purple-500', glow: 'shadow-purple-500/10', badge: 'bg-purple-500/20 text-purple-300' },
  PENDING: { border: 'border-l-red-500', glow: 'shadow-red-500/10', badge: 'bg-red-500/20 text-red-300' },
  IN_PREPARATION: { border: 'border-l-yellow-500', glow: 'shadow-yellow-500/10', badge: 'bg-yellow-500/20 text-yellow-300' },
  READY: { border: 'border-l-green-500', glow: 'shadow-green-500/10', badge: 'bg-green-500/20 text-green-300' },
};

interface Props {
  order: Order;
  onAction: (orderId: string, action: string) => void;
}

export default function OrderCard({ order, onAction }: Props) {
  const PaymentIcon = paymentIcons[order.paymentMethod];
  const accent = statusAccents[order.status] || statusAccents.PENDING;
  const totalAmount = Number(order.totalAmount).toFixed(2);

  const actionLabels: Record<string, string> = {
    WAITING_PAYMENT: 'Confirmar Pago',
    PENDING: 'Iniciar Preparación',
    IN_PREPARATION: 'Marcar Listo',
    READY: 'Entregado',
  };

  const actionValues: Record<string, string> = {
    WAITING_PAYMENT: 'PENDING',
    PENDING: 'IN_PREPARATION',
    IN_PREPARATION: 'READY',
    READY: 'DELIVERED',
  };

  const btnStyles: Record<string, string> = {
    WAITING_PAYMENT: 'bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/20',
    PENDING: 'bg-gradient-to-r from-[#E85D04] to-[#FFB703] text-white shadow-orange-500/20',
    IN_PREPARATION: 'bg-gradient-to-r from-[#06D6A0] to-[#05c490] text-white shadow-emerald-500/20',
    READY: 'bg-gradient-to-r from-[#FFB703] to-[#f0ac02] text-[#2B2D42] shadow-yellow-500/20',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`bg-[#1a1a2e]/90 backdrop-blur-sm rounded-xl border-l-[3px] ${accent.border} shadow-lg ${accent.glow} p-4 space-y-3`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800/80">
              <Hash className="w-4 h-4 text-[#FFB703]" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {String(order.displayId).padStart(4, '0')}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 mt-2">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-500" /> {order.customerName}
            </span>
            <span className="flex items-center gap-1.5">
              <Table2 className="w-3.5 h-3.5 text-gray-500" /> M {order.tableNumber}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <OrderTimer createdAt={order.createdAt} />
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md ${accent.badge}`}>
            <PaymentIcon className="w-3 h-3" />
            {paymentLabels[order.paymentMethod]}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700/50 pt-2.5 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="text-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[#FFB703] font-bold tabular-nums">{item.quantity}x</span>
              <span className="font-semibold text-white truncate">{item.productName}</span>
              {item.variation && (
                <span className="text-yellow-400/80 text-xs font-medium shrink-0">({item.variation.variationName})</span>
              )}
            </div>
            {(item.removedIngredients.length > 0 || item.addedExtras.length > 0 || item.selections.length > 0 || item.note) && (
              <div className="ml-5 mt-1 space-y-0.5 border-l-2 border-gray-700/40 pl-3">
                {item.removedIngredients.map((r, i) => (
                  <span key={i} className="block text-red-400/80 line-through text-xs">Sin {r.ingredientName}</span>
                ))}
                {item.addedExtras.map((e, i) => (
                  <span key={i} className="block text-green-400/80 text-xs">+ {e.extraName}</span>
                ))}
                {item.selections.map((s, i) => (
                  <span key={i} className="block text-blue-300/80 text-xs">{s.selectionLabel}: {s.selectedOptionName}</span>
                ))}
                {item.note && (
                  <span className="block text-orange-300 italic text-xs">📝 {item.note}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${accent.badge.split(' ').slice(1).join(' ')}`}>
          {actionLabels[order.status]}
        </span>
        <span className="text-base font-bold text-[#FFB703] tabular-nums">${totalAmount}</span>
      </div>

      <button
        onClick={() => onAction(order.id, actionValues[order.status])}
        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${btnStyles[order.status] || 'bg-gray-600 text-white'}`}
      >
        {actionLabels[order.status] || 'Entregado'}
      </button>
    </motion.div>
  );
}
