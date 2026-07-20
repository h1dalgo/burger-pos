'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChefHat, Wifi, WifiOff, Package } from 'lucide-react';
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

const columns = [
  { key: 'WAITING_PAYMENT', title: 'Esperando Confirmación', color: 'bg-purple-500', dot: '#A855F7' },
  { key: 'PENDING', title: 'Pendiente', color: 'bg-red-500', dot: '#EF4444' },
  { key: 'IN_PREPARATION', title: 'En Preparación', color: 'bg-yellow-500', dot: '#EAB308' },
  { key: 'READY', title: 'Listo para Servir', color: 'bg-green-500', dot: '#22C55E' },
];

export default function KanbanBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: 'new' | 'ready' } | null>(null);
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
      setAlert({ message: `Nuevo pedido #${String(order.displayId).padStart(4, '0')}`, type: 'new' });
      setTimeout(() => setAlert(null), 3500);
    });
    socket.on('order:updated', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      if (order.status === 'READY') {
        playNotification('ready');
        setAlert({ message: `Pedido #${String(order.displayId).padStart(4, '0')} listo`, type: 'ready' });
        setTimeout(() => setAlert(null), 3500);
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

  const getOrdersByStatus = (status: string) => orders.filter((o) => o.status === status);

  return (
    <div className="h-screen bg-[#0F0F23] flex flex-col" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(232,93,4,0.05) 0%, transparent 60%)' }}>
      <header className="relative bg-[#1a1a2e]/80 backdrop-blur-xl px-6 py-3 flex items-center justify-between border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E85D04] to-[#FFB703] flex items-center justify-center shadow-lg shadow-orange-500/20">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
              COCINA
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Panel de Producción</p>
          </div>
          {getOrdersByStatus('WAITING_PAYMENT').length > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="bg-purple-500/20 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {getOrdersByStatus('WAITING_PAYMENT').length} pendientes de pago
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowStock(!showStock)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              showStock
                ? 'bg-gradient-to-r from-[#E85D04] to-[#FFB703] text-white shadow-lg shadow-orange-500/20'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700/50'
            }`}>
            <Package className="w-4 h-4" />
            Stock
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
            connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? 'En vivo' : 'Desconectado'}
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {alert && (
          <motion.div initial={{ y: -60, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.9 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold ${
              alert.type === 'new'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
            }`}>
            <Bell className="w-4 h-4" />
            {alert.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {columns.map((col) => (
          <KanbanColumn
            key={col.key}
            title={col.title}
            status={col.key}
            orders={getOrdersByStatus(col.key)}
            color={col.color}
            dot={col.dot}
            onAction={handleAction}
          />
        ))}
      </div>

      <AnimatePresence>{showStock && <StockTogglePanel onClose={() => setShowStock(false)} />}</AnimatePresence>
    </div>
  );
}
