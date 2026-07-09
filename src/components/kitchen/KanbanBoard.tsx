'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order, StockUpdate } from '@/types';
import { getSocket } from '@/lib/socket-client';
import { useStockStore } from '@/store/stock-store';
import KanbanColumn from './KanbanColumn';
import StockTogglePanel from './StockTogglePanel';

function playNotification(type: 'new' | 'ready') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'new') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

export default function KanbanBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const applyStockUpdate = useStockStore((s) => s.applyStockUpdate);
  const socketRef = useRef<ReturnType<typeof getSocket>>();

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    loadOrders();
    const socket = getSocket();
    socketRef.current = socket;
    socket.emit('join:kitchen');

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('order:new', (order: Order) => {
      setOrders((prev) => [order, ...prev]);
      playNotification('new');
      setAlert(`Nuevo pedido #${String(order.displayId).padStart(4, '0')}`);
      setTimeout(() => setAlert(null), 3000);
    });

    socket.on('order:updated', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      if (order.status === 'READY') {
        playNotification('ready');
        setAlert(`Pedido #${String(order.displayId).padStart(4, '0')} listo`);
        setTimeout(() => setAlert(null), 3000);
      }
    });

    socket.on('order:archived', (orderId: string) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    });

    socket.on('stock:updated', (update: StockUpdate) => {
      applyStockUpdate(update);
    });

    return () => {
      socket.off('order:new');
      socket.off('order:updated');
      socket.off('order:archived');
      socket.off('stock:updated');
    };
  }, [loadOrders, applyStockUpdate]);

  const handleAction = useCallback(async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      if (status === 'DELIVERED') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch {}
  }, []);

  const waitingPayment = orders.filter((o) => o.status === 'WAITING_PAYMENT');
  const pending = orders.filter((o) => o.status === 'PENDING');
  const inPrep = orders.filter((o) => o.status === 'IN_PREPARATION');
  const ready = orders.filter((o) => o.status === 'READY');

  return (
    <div className="h-screen bg-[#0F0F23] flex flex-col">
      <header className="bg-[#1a1a2e] px-6 py-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            🍔 COCINA
          </h1>
          {waitingPayment.length > 0 && (
            <span className="bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              {waitingPayment.length} pendientes de pago
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowStock(!showStock)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              showStock ? 'bg-[#E85D04] text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Stock
          </button>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${connected ? 'bg-[#06D6A0] animate-pulse' : 'bg-[#EF476F]'}`}
            />
            <span className="text-xs text-gray-500">
              {connected ? 'En vivo' : 'Desconectado'}
            </span>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#E85D04] text-white px-6 py-2 rounded-full shadow-lg text-sm font-semibold"
          >
            {alert}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        <KanbanColumn
          title="Esperando Confirmación"
          status="WAITING_PAYMENT"
          orders={waitingPayment}
          color="bg-purple-500"
          onAction={handleAction}
        />
        <KanbanColumn
          title="Pendiente"
          status="PENDING"
          orders={pending}
          color="bg-red-500"
          onAction={handleAction}
        />
        <KanbanColumn
          title="En Preparación"
          status="IN_PREPARATION"
          orders={inPrep}
          color="bg-yellow-500"
          onAction={handleAction}
        />
        <KanbanColumn
          title="Listo para Servir"
          status="READY"
          orders={ready}
          color="bg-green-500"
          onAction={handleAction}
        />
      </div>

      {showStock && <StockTogglePanel onClose={() => setShowStock(false)} />}
    </div>
  );
}


