'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChefHat, Wifi, WifiOff, Package, AlertTriangle, Volume2, VolumeX, Wallet, Type } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Order, StockUpdate } from '@/types';
import { getSocket, joinRoom } from '@/lib/socket-client';
import { useStockStore } from '@/store/stock-store';
import { getStatusMeta, formatDisplayId } from '@/lib/order-status';
import KanbanColumn from './KanbanColumn';
import StockTogglePanel from './StockTogglePanel';
import PaymentsPanel from './PaymentsPanel';
import CancelOrderDialog from './CancelOrderDialog';
import type { OrderStatus } from '@/types';

/** La cocina ve solo lo que ya puede preparar; los pagos van en Caja. */
const KITCHEN_STATUSES: OrderStatus[] = ['PENDING', 'IN_PREPARATION', 'READY'];

function readBigText() {
  try {
    return localStorage.getItem('kitchen_big') === '1';
  } catch {
    return false;
  }
}
import { Button } from '@/components/ui/Button';

let audioCtx: AudioContext | null = null;

function isMuted() {
  try {
    return localStorage.getItem('kitchen_muted') === '1';
  } catch {
    return false;
  }
}

function playNotification(type: 'new' | 'ready' | 'advance') {
  if (isMuted()) return;
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
    } else if (type === 'ready') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(680, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
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
  const [muted, setMuted] = useState(() => isMuted());
  const [showPayments, setShowPayments] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [bigText, setBigText] = useState(() => readBigText());
  const applyStockUpdate = useStockStore((s) => s.applyStockUpdate);
  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

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
    joinRoom('kitchen');

    const onConnect = () => setConnected(true);
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

  const sendStatus = useCallback(
    async (orderId: string, status: string, cancelReason?: string): Promise<boolean> => {
      if (pendingId) return false;
      setPendingId(orderId);
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, cancelReason }),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        if (status === 'DELIVERED' || status === 'CANCELLED') {
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
        } else {
          setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        }
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
        return true;
      } catch {
        toast.error('No se pudo actualizar el pedido');
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [pendingId]
  );

  const showUndoToast = useCallback(
    (order: Order, from: string, to: string) => {
      toast.custom(
        (t) => (
          <div
            className="flex items-center gap-4 bg-carbon text-cream border-2 border-carbon rounded-xl px-4 py-3 shadow-pop text-sm font-semibold max-w-md mx-auto"
            role="status"
          >
            <span className="min-w-0 truncate">
              <span className="display sign-yellow text-base mr-1.5">
                #{formatDisplayId(order.displayId)}
              </span>
              <span className="text-cream/80">→ {getStatusMeta(to).title}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                const current = ordersRef.current.find((o) => o.id === order.id);
                if (current && current.status !== to) {
                  toast.error('La orden ya cambió');
                  return;
                }
                void sendStatus(order.id, from);
              }}
              className="btn btn-solid btn-sm shrink-0"
            >
              Deshacer
            </button>
          </div>
        ),
        { duration: 5000 }
      );
    },
    [sendStatus]
  );

  const handleAction = useCallback(
    async (orderId: string, status: string) => {
      const previous = ordersRef.current.find((o) => o.id === orderId)?.status;
      const ok = await sendStatus(orderId, status);
      if (!ok) return;
      if (status !== 'READY') playNotification('advance');
      const order = ordersRef.current.find((o) => o.id === orderId);
      if (order && previous && previous !== status && status !== 'DELIVERED') {
        showUndoToast(order, previous, status);
      }
    },
    [sendStatus, showUndoToast]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      const shortcut =
        key === 'e'
          ? ({ from: 'PENDING', to: 'IN_PREPARATION' } as const)
          : key === 'l'
            ? ({ from: 'IN_PREPARATION', to: 'READY' } as const)
            : null;
      if (!shortcut) return;
      e.preventDefault();
      if (pendingId) return;
      const candidates = ordersRef.current.filter((o) => o.status === shortcut.from);
      if (candidates.length === 0) return;
      const oldest = candidates.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
      void handleAction(oldest.id, shortcut.to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAction, pendingId]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem('kitchen_muted', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const toggleBig = () => {
    setBigText((b) => {
      const next = !b;
      try {
        localStorage.setItem('kitchen_big', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const confirmCancel = async (reason: string) => {
    const target = cancelTarget;
    setCancelTarget(null);
    if (!target) return;
    const ok = await sendStatus(target.id, 'CANCELLED', reason);
    if (ok) toast.success(`Pedido #${formatDisplayId(target.displayId)} cancelado`);
  };

  const getOrdersByStatus = (status: string) => orders.filter((o) => o.status === status);
  const waiting = getOrdersByStatus('WAITING_PAYMENT');
  const waitingCount = waiting.length;

  // Resumen de producción: lo que hay que preparar sumando todas las comandas
  const production = (() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      if (o.status !== 'PENDING' && o.status !== 'IN_PREPARATION') continue;
      for (const it of o.items) {
        const key = it.variation ? `${it.productName} (${it.variation.variationName})` : it.productName;
        map.set(key, (map.get(key) ?? 0) + it.quantity);
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  })();

  return (
    <div className="h-dvh flex flex-col safe-bottom">
      <header className="relative bg-cream/80 backdrop-blur-xl px-4 sm:px-6 pb-3 safe-header flex items-center justify-between gap-3 border-b border-carbon/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-xl border border-burger/40 bg-burger/10 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-burger" strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <h1 className="display text-2xl text-carbon leading-none">Cocina</h1>
            <p className="eyebrow mt-1">
              Panel de Producción
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-[11px] text-carbon/60 font-semibold ml-1">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-carbon/20 bg-carbon/[0.06] px-1.5 py-0.5 font-bold text-carbon">
                E
              </kbd>
              iniciar la más vieja
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded-md border border-carbon/20 bg-carbon/[0.06] px-1.5 py-0.5 font-bold text-carbon">
                L
              </kbd>
              marcar listo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPayments(true)}
            aria-label={`Caja: ${waitingCount} pagos por confirmar`}
            className={waitingCount ? 'border-status-waiting/60 text-status-waiting' : ''}
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Caja</span>
            {waitingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-status-waiting px-1 text-[11px] font-bold text-[#0f0d0a] tabular-nums">{waitingCount}</span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={toggleBig} aria-pressed={bigText} title="Letra grande" className={bigText ? 'border-burger/60 bg-burger/10 text-burger-dark' : ''}>
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline">Letra grande</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            aria-pressed={muted}
            title={muted ? 'Activar sonido' : 'Silenciar sonido'}
            className={muted ? 'text-rose' : ''}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{muted ? 'Sin sonido' : 'Sonido'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStock(!showStock)}
            className={showStock ? 'border-burger/60 bg-burger/10 text-burger-dark' : ''}
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Stock</span>
          </Button>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-carbon ${
              connected ? 'bg-cream text-mint-ink' : 'bg-cream text-rose'
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
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-2xl shadow-pop border-2 border-carbon text-sm font-bold ${
              alert.type === 'new' ? 'bg-card text-carbon' : 'bg-mint text-cream'
            }`}
            role="status"
          >
            <Bell className="w-4 h-4" />
            {alert.message}
          </motion.div>
        )}
      </AnimatePresence>

      {loadError && !loading && (
        <div className="mx-4 mt-4 flex items-center justify-between gap-3 bg-rose/10 border-2 border-rose/40 text-rose px-4 py-3 rounded-xl text-sm font-semibold">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            No pudimos cargar los pedidos
          </span>
          <Button variant="outline" size="sm" className="text-rose" onClick={loadOrders}>
            Reintentar
          </Button>
        </div>
      )}

      {production.length > 0 && (
        <div className="border-b border-carbon/10 px-4 py-2.5 sm:px-6" style={bigText ? { zoom: 1.25 } : undefined}>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none" aria-label="Por preparar">
            <span className="eyebrow shrink-0">Por preparar</span>
            {production.map(([name, qty]) => (
              <span key={name} className="flex shrink-0 items-center gap-1.5 rounded-full border border-carbon/15 bg-carbon/[0.04] px-3 py-1 text-sm font-semibold text-carbon">
                <span className="price text-base">{qty}×</span>
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-4 p-4 overflow-x-auto" style={bigText ? { zoom: 1.25 } : undefined}>
        {KITCHEN_STATUSES.map((status) => {
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
              onCancel={setCancelTarget}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {showStock && <StockTogglePanel onClose={() => setShowStock(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showPayments && (
          <PaymentsPanel
            orders={waiting}
            pendingId={pendingId}
            onConfirm={(o) => void handleAction(o.id, 'PENDING')}
            onCancel={setCancelTarget}
            onClose={() => setShowPayments(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelTarget && <CancelOrderDialog order={cancelTarget} onConfirm={(r) => void confirmCancel(r)} onClose={() => setCancelTarget(null)} />}
      </AnimatePresence>
    </div>
  );
}
