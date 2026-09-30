'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Inbox } from 'lucide-react';
import type { Order } from '@/types';
import { getStatusMeta } from '@/lib/order-status';
import OrderCard from './OrderCard';

interface Props {
  status: string;
  title: string;
  orders: Order[];
  newIds: Set<string>;
  loading: boolean;
  pendingId: string | null;
  onAction: (orderId: string, action: string) => void;
}

export default function KanbanColumn({ status, title, orders, newIds, loading, pendingId, onAction }: Props) {
  const meta = getStatusMeta(status);
  const hasNew = orders.some((o) => newIds.has(o.id));

  return (
    <div
      className={`flex-1 min-w-[300px] bg-gradient-to-b ${meta.columnBg} rounded-2xl p-4 border border-white/6 flex flex-col`}
    >
      <div className="flex items-center gap-2.5 mb-4 px-1">
        <div className="relative">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.dot }} />
          {hasNew && (
            <div className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ backgroundColor: meta.dot }} />
          )}
        </div>
        <h2 className="font-bold text-white text-sm tracking-wide">{title}</h2>
        <span className="ml-auto bg-black/30 text-white/70 text-xs font-bold px-2.5 py-1 rounded-full border border-white/8 min-w-[24px] text-center tabular-nums">
          {orders.length}
        </span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-none">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="bg-card/70 rounded-xl border-l-[3px] border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-8 w-20 rounded-lg" />
                  <div className="skeleton h-5 w-12 rounded-md" />
                </div>
                <div className="space-y-2">
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                </div>
                <div className="skeleton h-9 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {orders.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-white/30 py-14 gap-2"
              >
                <Inbox className="w-8 h-8" />
                <p className="text-sm font-medium">Sin pedidos</p>
              </motion.div>
            ) : (
              orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={newIds.has(order.id)}
                  pending={pendingId === order.id}
                  onAction={onAction}
                />
              ))
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
