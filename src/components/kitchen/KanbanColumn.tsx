'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Inbox } from 'lucide-react';
import type { Order } from '@/types';
import OrderCard from './OrderCard';

interface Props {
  title: string;
  status: string;
  orders: Order[];
  color: string;
  dot: string;
  onAction: (orderId: string, action: string) => void;
}

const bgGradients: Record<string, string> = {
  WAITING_PAYMENT: 'from-purple-900/20 via-transparent to-transparent',
  PENDING: 'from-red-900/20 via-transparent to-transparent',
  IN_PREPARATION: 'from-yellow-900/20 via-transparent to-transparent',
  READY: 'from-green-900/20 via-transparent to-transparent',
};

export default function KanbanColumn({ title, status, orders, color, dot, onAction }: Props) {
  return (
    <div className={`flex-1 min-w-[300px] bg-gradient-to-b ${bgGradients[status] || ''} rounded-2xl p-4 border border-gray-800/30 flex flex-col`}>
      <div className="flex items-center gap-2.5 mb-4 px-1">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: dot }} />
          <div className={`absolute inset-0 rounded-full animate-ping opacity-30`} style={{ backgroundColor: dot }} />
        </div>
        <h2 className="font-bold text-white text-base tracking-wide">{title}</h2>
        <span className="ml-auto bg-gray-800/80 text-gray-300 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-700/50 min-w-[24px] text-center">
          {orders.length}
        </span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <AnimatePresence mode="popLayout">
          {orders.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-gray-600 py-12 gap-2"
            >
              <Inbox className="w-8 h-8" />
              <p className="text-sm">Sin pedidos</p>
            </motion.div>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} onAction={onAction} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
