'use client';

import { motion } from 'framer-motion';
import { Clock, User, Table2, Banknote, Smartphone, CreditCard } from 'lucide-react';
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

const statusColors: Record<string, string> = {
  PENDING: 'border-l-red-500',
  IN_PREPARATION: 'border-l-yellow-500',
  READY: 'border-l-green-500',
};

interface Props {
  order: Order;
  onAction: (orderId: string, action: string) => void;
}

export default function OrderCard({ order, onAction }: Props) {
  const PaymentIcon = paymentIcons[order.paymentMethod];
  const borderColor = statusColors[order.status] || 'border-l-gray-500';

  const renderItem = (item: Order['items'][0]) => (
    <div key={item.id} className="text-sm leading-relaxed">
      <span className="font-semibold text-white">
        {item.quantity}x {item.productName}
      </span>
      {item.variation && (
        <span className="text-yellow-400 ml-1">({item.variation.variationName})</span>
      )}
      <div className="ml-2 space-y-0.5">
        {item.removedIngredients.map((r, i) => (
          <span key={i} className="block text-red-400 line-through text-xs">
            🅇 {r.ingredientName}
          </span>
        ))}
        {item.addedExtras.map((e, i) => (
          <span key={i} className="block text-green-400 text-xs">
            + {e.extraName}
          </span>
        ))}
        {item.selections.map((s, i) => (
          <span key={i} className="block text-blue-300 text-xs">
            {s.selectionLabel}: {s.selectedOptionName}
          </span>
        ))}
      </div>
    </div>
  );

  const actionLabels: Record<string, string> = {
    PENDING: '▶ Preparar',
    IN_PREPARATION: '✓ Listo',
    READY: '🚚 Entregado',
  };

  const actionValues: Record<string, string> = {
    PENDING: 'IN_PREPARATION',
    IN_PREPARATION: 'READY',
    READY: 'DELIVERED',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-[#1a1a2e] rounded-xl border-l-4 ${borderColor} shadow-lg p-4 space-y-3`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            #{String(order.displayId).padStart(4, '0')}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {order.customerName}
            </span>
            <span className="flex items-center gap-1">
              <Table2 className="w-3 h-3" /> Mesa {order.tableNumber}
            </span>
          </div>
        </div>
        <div className="text-right">
          <OrderTimer createdAt={order.createdAt} />
          <div className="flex items-center gap-1 text-gray-400 text-xs mt-1 justify-end">
            <PaymentIcon className="w-3 h-3" />
            {paymentLabels[order.paymentMethod]}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-2 space-y-1.5">
        {order.items.map(renderItem)}
      </div>

      <button
        onClick={() => onAction(order.id, actionValues[order.status])}
        className={`w-full py-2 rounded-lg font-semibold text-sm transition-all ${
          order.status === 'PENDING'
            ? 'bg-[#E85D04] hover:bg-[#d55404] text-white'
            : order.status === 'IN_PREPARATION'
              ? 'bg-[#06D6A0] hover:bg-[#05c490] text-white'
              : 'bg-[#FFB703] hover:bg-[#f0ac02] text-[#2B2D42]'
        }`}
      >
        {actionLabels[order.status] || 'Entregado'}
      </button>
    </motion.div>
  );
}
