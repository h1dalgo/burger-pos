'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Order } from '@/types';
import OrderCard from './OrderCard';

interface Props {
  title: string;
  status: string;
  orders: Order[];
  color: string;
  onAction: (orderId: string, action: string) => void;
}

export default function KanbanColumn({ title, status, orders, color, onAction }: Props) {
  return (
    <div className="flex-1 min-w-[300px] bg-[#0F0F23] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <h2 className="font-bold text-white text-lg">{title}</h2>
        <span className={`ml-auto text-sm font-bold ${color}`}>
          {orders.length}
        </span>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-600 py-8 text-sm"
            >
              Sin pedidos
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
