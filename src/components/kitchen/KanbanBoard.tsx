'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChefHat, Wifi, WifiOff, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Order, StockUpdate } from '@/types';
import { getSocket } from '@/lib/socket-client';
import { useStockStore } from '@/store/stock-store';
import { BOARD_STATUSES, getStatusMeta, formatDisplayId } from '@/lib/order-status';
import KanbanColumn from './KanbanColumn';
import StockTogglePanel from './StockTogglePanel';
import { Button } from '@/components/ui/Button';

let audioCtx: AudioContext | null = null;

function playNotification(type: 'new' | 'ready') {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const ctx = audioCtx;
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [connected, setConnected] = useState(() => getSocket().connected);
  const [showStock, setShowStock] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: 'new' | 'ready' } | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const applyStockUpdate = useStockStore((s) => s.applyStockUpdate);

  const loadOrders = useCallback(() => {
    fetch('/api/orders')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Order[]) => {
        setOrders(data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const showAlert = useCallback((message: string, type: 'new' | 'ready') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  }, []);

  useEffect(() => {
    loadOrders();
    const socket = getSocket();
    socket.emit('join:kitchen');

    const onConnect = () => {
      setConnected(true);
      socket.emit('join:kitchen');
    };
    const onDisconnect = () => setConnected(false);
    const onNew = (order: Order) => {
      setOrders((prev) => [order, ...prev]);
      setNewOrderIds((prev) => new Set(prev).add(order.id));
      playNotification('new');
      showAlert(`Nuevo pedido #${formatDisplayId(order.displayId)}`, 'new');
    };
    const onUpdated = (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      if (order.status === 'READY') {
        playNotification('ready');
        showAlert(`Pedido #${formatDisplayId(order.displayId)} listo`, 'ready');
      }
    };
    const onArchived = (orderId: string) => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    };
    const onStock = (update: StockUpdate) => applyStockUpdate(update);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order:new', onNew);
    socket.on('order:updated', onUpdated);
    socket.on('order:archived', onArchived);
    socket.on('stock:updated', onStock);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:new', onNew);
      socket.off('order:updated', onUpdated);
      socket.off('order:archived', onArchived);
      socket.off('stock:updated', onStock);
    };
  }, [loadOrders, applyStockUpdate, showAlert]);

  const handleAction = useCallback(
    async (orderId: string, status: string) => {
      if (pendingId) return;
      setPendingId(orderId);
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
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      } catch {
        toast.error('No se pudo actualizar el pedido');
      } finally {
        setPendingId(null);
      }
    },
    [pendingId]
  );

  const getOrdersByStatus = (status: string) => orders.filter((o) => o.status === status);
  const waitingCount = getOrdersByStatus('WAITING_PAYMENT').length;

  return (
    <div
      className="h-screen bg-night flex flex-col"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(232,93,4,0.06) 0%, transparent 60%)',
      }}
    >
      <header className="relative bg-card/80 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b border-white/6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-burger to-mustard flex items-center justify-center shadow-lg">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="display text-xl text-white leading-none">COCINA</h1>
            <p className="text-[11px] text-white/40 uppercase tracking-widest mt-0.5">
              Panel de Producción
            </p>
          </div>
          {waitingCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="hidden sm:flex bg-status-waiting/15 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-status-waiting/30 items-center gap-1.5 shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-status-waiting animate-pulse" />
              {waitingCount} pendientes de pago
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={showStock ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowStock(!showStock)}
            className={showStock ? '' : 'text-white/80'}
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Stock</span>
          </Button>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              connected ? 'bg-mint/10 text-mint' : 'bg-rose/10 text-rose'
            }`}
          >
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span className="hidden sm:inline">{connected ? 'En vivo' : 'Desconectado'}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-mint animate-pulse' : 'bg-rose'}`}
            />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ y: -60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl shadow-pop text-sm font-bold text-white ${
              alert.type === 'new' ? 'bg-card border border-status-waiting/40' : 'bg-gradient-to-r from-mint to-mint-dark'
            }`}
            role="status"
          >
            <Bell className="w-4 h-4" />
            {alert.message}
          </motion.div>
        )}
      </AnimatePresence>

      {loadError && !loading && (
        <div className="mx-4 mt-4 flex items-center justify-between gap-3 bg-rose/10 border border-rose/30 text-rose px-4 py-3 rounded-xl text-sm font-semibold">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            No pudimos cargar los pedidos
          </span>
          <Button variant="outline" size="sm" className="text-rose" onClick={loadOrders}>
            Reintentar
          </Button>
        </div>
      )}

      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {BOARD_STATUSES.map((status) => {
          const meta = getStatusMeta(status);
          const columnOrders = getOrdersByStatus(status);
          return (
            <KanbanColumn
              key={status}
              status={status}
              title={meta.title}
              orders={columnOrders}
              newIds={newOrderIds}
              loading={loading}
              pendingId={pendingId}
              onAction={handleAction}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {showStock && <StockTogglePanel onClose={() => setShowStock(false)} />}
      </AnimatePresence>
    </div>
  );
}
