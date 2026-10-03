'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  ChefHat,
  ShoppingBag,
  DollarSign,
  X,
  Trash2,
  Send,
  CheckCircle2,
  ImageOff,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { getSocket } from '@/lib/socket-client';
import type { Category, Product, CartItem, TableData, TableCall } from '@/components/waiter/shared';
import { calcItemPrice } from '@/components/waiter/shared';
import WaiterProductModal from '@/components/waiter/WaiterProductModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const ALERT_PATTERNS: Record<string, { notes: Array<{ f: number; t: number; d: number }>; duration: number; volume: number }> = {
  CALL_WAITER: {
    notes: [
      { f: 700, t: 0, d: 0.25 }, { f: 900, t: 0.3, d: 0.25 }, { f: 1200, t: 0.6, d: 0.3 },
      { f: 700, t: 1.1, d: 0.25 }, { f: 900, t: 1.4, d: 0.25 }, { f: 1200, t: 1.7, d: 0.3 },
    ],
    duration: 2.2,
    volume: 0.65,
  },
  REQUEST_BILL: {
    notes: [
      { f: 800, t: 0, d: 0.25 }, { f: 600, t: 0.3, d: 0.25 }, { f: 450, t: 0.6, d: 0.35 },
      { f: 800, t: 1.1, d: 0.25 }, { f: 600, t: 1.4, d: 0.25 }, { f: 450, t: 1.7, d: 0.35 },
    ],
    duration: 2.3,
    volume: 0.65,
  },
  READY: {
    notes: (() => {
      const notes: Array<{ f: number; t: number; d: number }> = [];
      for (let i = 0; i < 6; i++) {
        const t = i * 0.55;
        notes.push({ f: 880, t, d: 0.18 });
        notes.push({ f: 1100, t: t + 0.2, d: 0.18 });
      }
      return notes;
    })(),
    duration: 3.6,
    volume: 0.7,
  },
};

let audioCtx: AudioContext | null = null;
let alertLoopTimer: ReturnType<typeof setInterval> | null = null;

function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playLoudAlert(pattern: typeof ALERT_PATTERNS[string]) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const { notes, duration, volume } = pattern;
    const master = ctx.createGain();
    master.connect(ctx.destination);
    master.gain.setValueAtTime(volume, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = n.f;
      osc.connect(noteGain);
      noteGain.connect(master);
      const start = ctx.currentTime + n.t;
      noteGain.gain.setValueAtTime(0.0001, start);
      noteGain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
      noteGain.gain.setValueAtTime(volume, start + n.d - 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, start + n.d);
      osc.start(start);
      osc.stop(start + n.d + 0.05);
    }
  } catch {}
}

function startAlertLoop(type: string) {
  stopAlertLoop();
  const pattern = ALERT_PATTERNS[type];
  if (!pattern) return;
  playLoudAlert(pattern);
  alertLoopTimer = setInterval(() => {
    playLoudAlert(pattern);
  }, (pattern.duration + 0.8) * 1000);
}

function stopAlertLoop() {
  if (alertLoopTimer) {
    clearInterval(alertLoopTimer);
    alertLoopTimer = null;
  }
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  empty: { label: 'Libre', color: 'text-white/45', bg: 'bg-white/4', border: 'border-white/10' },
  ordered: { label: 'Esperando Confirmación', color: 'text-purple-300', bg: 'bg-status-waiting/10', border: 'border-status-waiting/30' },
  pending: { label: 'Pendiente', color: 'text-status-pending', bg: 'bg-status-pending/10', border: 'border-status-pending/30' },
  preparing: { label: 'Preparando', color: 'text-status-preparing', bg: 'bg-status-preparing/10', border: 'border-status-preparing/30' },
  ready: { label: 'Listo', color: 'text-mint', bg: 'bg-mint/10', border: 'border-mint/30' },
};

const ALERT_LABELS: Record<string, string> = {
  CALL_WAITER: 'Llama al mesero',
  REQUEST_BILL: 'Pide la cuenta',
  READY: 'Pedido listo para servir',
};

export default function WaiterPage() {
  const [tableCount, setTableCount] = useState(10);
  const [tables, setTables] = useState<TableData[]>([]);
  const [tablesReady, setTablesReady] = useState(false);
  const [activeCalls, setActiveCalls] = useState<TableCall[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState<Array<{ type: 'CALL_WAITER' | 'REQUEST_BILL' | 'READY'; tableNumber: string }>>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [catalogEntrance, setCatalogEntrance] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setTableCount(data.tableCount ?? 10))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Category[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          setActiveCategory(data[0].id);
        }
      })
      .catch(() => toast.error('No pudimos cargar el catálogo'))
      .finally(() => setCatalogLoading(false));
  }, []);

  const loadTables = useCallback(() => {
    Promise.all([fetch('/api/orders'), fetch('/api/table-calls')])
      .then(([ordersRes, callsRes]) =>
        Promise.all([ordersRes.ok ? ordersRes.json() : null, callsRes.ok ? callsRes.json() : null])
      )
      .then(([orders, calls]) => {
        if (Array.isArray(orders)) {
          const tableMap = new Map<string, TableData['status']>();
          for (const o of orders) {
            const tn = o.tableNumber;
            if (o.status === 'WAITING_PAYMENT') tableMap.set(tn, 'ordered');
            else if (o.status === 'PENDING') tableMap.set(tn, 'pending');
            else if (o.status === 'IN_PREPARATION') tableMap.set(tn, 'preparing');
            else if (o.status === 'READY') tableMap.set(tn, 'ready');
          }
          setTables(
            Array.from({ length: tableCount }, (_, i) => ({
              number: String(i + 1),
              status: tableMap.get(String(i + 1)) || 'empty',
            }))
          );
        }
        if (Array.isArray(calls)) setActiveCalls(calls);
        setTablesReady(true);
      })
      .catch(() => {
        setTablesReady(true);
        toast.error('No pudimos cargar las mesas');
      });
  }, [tableCount]);

  useEffect(() => {
    if (tableCount > 0) loadTables();
  }, [tableCount, loadTables]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:waiter');

    const onNewCall = (call: TableCall) => {
      setActiveCalls((prev) => [call, ...prev]);
      setPendingAlerts((prev) => [...prev, { type: call.type, tableNumber: call.tableNumber }]);
      startAlertLoop(call.type);
      loadTables();
    };
    const onResolvedCall = (call: TableCall) => {
      setActiveCalls((prev) => prev.filter((c) => c.id !== call.id));
      loadTables();
    };
    const onOrderNew = () => loadTables();
    const onOrderUpdated = (order: { status: string; tableNumber: string }) => {
      if (order?.status === 'READY') {
        setPendingAlerts((prev) => [...prev, { type: 'READY', tableNumber: order.tableNumber }]);
        startAlertLoop('READY');
      }
      loadTables();
    };

    socket.on('tableCall:new', onNewCall);
    socket.on('tableCall:resolved', onResolvedCall);
    socket.on('order:new', onOrderNew);
    socket.on('order:updated', onOrderUpdated);

    return () => {
      socket.off('tableCall:new', onNewCall);
      socket.off('tableCall:resolved', onResolvedCall);
      socket.off('order:new', onOrderNew);
      socket.off('order:updated', onOrderUpdated);
      stopAlertLoop();
    };
  }, [loadTables]);

  useEffect(() => {
    if (!showOrderPanel && !selectedProduct) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedProduct) return;
        setShowOrderPanel(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showOrderPanel, selectedProduct]);

  const resolveCall = async (callId: string) => {
    await fetch(`/api/table-calls/${callId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve' }),
    });
  };

  const acknowledgeAlerts = (tableNum?: string) => {
    if (tableNum) {
      const remaining = pendingAlerts.filter((a) => a.tableNumber !== tableNum);
      setPendingAlerts(remaining);
      if (remaining.length === 0) stopAlertLoop();
    } else {
      setPendingAlerts([]);
      stopAlertLoop();
    }
  };

  const handleTableClick = (tableNum: string) => {
    const calls = activeCalls.filter((c) => c.tableNumber === tableNum);
    if (calls.length > 0) {
      for (const call of calls) resolveCall(call.id);
    }
    acknowledgeAlerts(tableNum);
    setSelectedTable(tableNum);
    setCart([]);
    setCustomerName('');
    setCatalogEntrance(true);
    setShowOrderPanel(true);
  };

  const addToCart = (item: Omit<CartItem, 'id'>) => {
    setCart((prev) => [...prev, { ...item, id: Date.now().toString() }]);
    setSelectedProduct(null);
    toast.success(`${item.product.name} agregado`);
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const sendOrder = async () => {
    if (!customerName.trim() || !selectedTable) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        customerName: `${customerName} (Mesa ${selectedTable})`,
        tableNumber: selectedTable,
        paymentMethod: 'CASH',
        status: 'PENDING',
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          basePrice: item.product.basePrice,
          quantity: item.quantity,
          variation: item.variation,
          removedIngredients: item.removedIngredients,
          addedExtras: item.addedExtras,
          selections: item.selections,
          note: item.note,
        })),
      };
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error');
      const socket = getSocket();
      socket.emit('join:kitchen');
      setCart([]);
      toast.success('Pedido enviado a cocina');
      loadTables();
    } catch {
      toast.error('Error al enviar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const activeProducts = categories.find((c) => c.id === activeCategory)?.products || [];
  const tableCallsForSelected = activeCalls.filter((c) => c.tableNumber === selectedTable);
  const cartTotal = cart.reduce((sum, item) => sum + calcItemPrice(item) * item.quantity, 0);

  return (
    <div className="min-h-screen bg-night">
      <AnimatePresence>
        {pendingAlerts.length > 0 &&
          (() => {
            const alert = pendingAlerts[pendingAlerts.length - 1];
            const isReady = alert.type === 'READY';
            return (
              <motion.button
                key={alert.tableNumber + alert.type + pendingAlerts.length}
                onClick={() => acknowledgeAlerts(alert.tableNumber)}
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -80, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-pop text-sm font-bold text-white cursor-pointer ${
                  isReady
                    ? 'bg-gradient-to-r from-mint to-mint-dark'
                    : 'bg-gradient-to-r from-burger to-mustard'
                }`}
              >
                {isReady ? (
                  <CheckCircle2 className="w-5 h-5 animate-pulse" />
                ) : alert.type === 'CALL_WAITER' ? (
                  <BellRing className="w-5 h-5 animate-pulse" />
                ) : (
                  <DollarSign className="w-5 h-5 animate-pulse" />
                )}
                Mesa {alert.tableNumber} — {ALERT_LABELS[alert.type]}
                <span className="ml-2 text-white/80 text-xs">Toca para abrir</span>
              </motion.button>
            );
          })()}
      </AnimatePresence>

      <header className="bg-card/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-white/6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-burger to-mustard flex items-center justify-center shadow-lg">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="display text-xl text-white leading-none">MESERO</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Piso de servicio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCalls.length > 0 && (
            <div className="flex items-center gap-1.5 bg-rose/10 text-rose text-xs font-bold px-3 py-1.5 rounded-full border border-rose/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose animate-pulse" />
              {activeCalls.length} notificación(es)
            </div>
          )}
        </div>
      </header>

      <div className="p-4">
        {!tablesReady ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
            {Array.from({ length: Math.min(tableCount, 10) }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : tables.length === 0 ? (
          <EmptyState
            dark
            icon={<Bell className="w-8 h-8" />}
            title="Sin mesas configuradas"
            description="Define el número de mesas en Configuración del panel admin."
          />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
            {tables.map((table) => {
              const cfg = statusConfig[table.status];
              const calls = activeCalls.filter((c) => c.tableNumber === table.number);
              const hasCall = calls.length > 0;
              return (
                <motion.button
                  key={table.number}
                  onClick={() => handleTableClick(table.number)}
                  whileTap={{ scale: 0.95 }}
                  aria-label={`Mesa ${table.number}, ${cfg.label}${hasCall ? ', llamada activa' : ''}`}
                  className={`relative rounded-2xl p-4 border-2 transition-[border-color,box-shadow,background-color] duration-200 ${cfg.bg} ${cfg.border} ${
                    hasCall ? 'ring-2 ring-burger shadow-pop' : 'hover:shadow-card'
                  }`}
                >
                  {hasCall && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-burger to-mustard flex items-center justify-center shadow-lg z-10">
                      {calls[0].type === 'CALL_WAITER' ? (
                        <Bell className="w-3 h-3 text-white animate-pulse" />
                      ) : (
                        <DollarSign className="w-3 h-3 text-white animate-pulse" />
                      )}
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}
                    >
                      {table.number}
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider text-center ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  {hasCall && (
                    <div className="mt-2 space-y-0.5 text-center">
                      {calls.map((c) => (
                        <span
                          key={c.id}
                          className={`block text-[10px] font-bold uppercase ${
                            c.type === 'CALL_WAITER' ? 'text-orange-300' : 'text-mustard'
                          }`}
                        >
                          {c.type === 'CALL_WAITER' ? 'Llamando' : 'Cuenta'}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showOrderPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60"
            onClick={() => setShowOrderPanel(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Pedido de la mesa ${selectedTable}`}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-card rounded-t-3xl overflow-hidden flex flex-col"
            >
              <div className="sticky top-0 bg-card z-10 px-6 pt-4 pb-3 border-b border-white/8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-burger to-mustard flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {selectedTable}
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Mesa {selectedTable}</h2>
                    {tableCallsForSelected.length > 0 && (
                      <p className="text-[11px] text-orange-300 font-semibold">
                        {tableCallsForSelected
                          .map((c) => (c.type === 'CALL_WAITER' ? 'Llamó al mesero' : 'Pide la cuenta'))
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOrderPanel(false)}
                  aria-label="Cerrar pedido"
                  className="w-9 h-9 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="px-6 pt-4">
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="field-dark w-full"
                  />
                </div>

                <nav className="flex overflow-x-auto gap-1 px-4 py-3 scrollbar-none" aria-label="Categorías">
                  {catalogLoading ? (
                    <div className="flex gap-2">
                      {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-9 w-24 rounded-full" />
                      ))}
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        aria-pressed={activeCategory === cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setCatalogEntrance(false);
                        }}
                        className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          activeCategory === cat.id ? 'text-white' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {activeCategory === cat.id && (
                          <motion.div
                            layoutId="waiterCat"
                            className="absolute inset-0 bg-gradient-to-r from-burger to-mustard rounded-full"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10">{cat.name}</span>
                      </button>
                    ))
                  )}
                </nav>

                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {catalogLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rounded-xl p-3 border border-white/8 bg-card/60 space-y-2">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    ))
                  ) : activeProducts.length === 0 ? (
                    <div className="col-span-2 py-8">
                      <EmptyState
                        dark
                        compact
                        icon={<ShoppingBag className="w-8 h-8" />}
                        title="Sin productos"
                        description="Esta categoría no tiene productos disponibles."
                      />
                    </div>
                  ) : (
                    activeProducts.map((p, i) => (
                      <motion.button
                        key={p.id}
                        initial={catalogEntrance ? { opacity: 0, y: 20 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={catalogEntrance ? { delay: i * 0.02 } : { duration: 0 }}
                        onClick={() => p.isAvailable && setSelectedProduct(p)}
                        disabled={!p.isAvailable}
                        className={`relative text-left rounded-xl p-3 border transition-[border-color,background-color,opacity] ${
                          p.isAvailable
                            ? 'bg-card/60 border-white/8 hover:border-burger'
                            : 'bg-card/30 border-white/6 opacity-50'
                        }`}
                      >
                        {p.imageUrl ? (
                          <div className="w-full h-16 rounded-lg overflow-hidden bg-black/30 mb-2">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-16 rounded-lg bg-white/4 mb-2 flex items-center justify-center text-white/20">
                            <ImageOff className="w-5 h-5" />
                          </div>
                        )}
                        <h3 className="font-semibold text-white text-sm truncate">{p.name}</h3>
                        <p className="text-burger font-bold text-sm mt-1">{formatPrice(Number(p.basePrice))}</p>
                        {!p.isAvailable && <span className="text-xs font-semibold text-rose">Agotado</span>}
                      </motion.button>
                    ))
                  )}
                </div>
              </div>

              {cart.length > 0 && (
                <div className="border-t border-white/8 px-6 py-3 shrink-0 bg-card pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-mustard" />
                      <span className="text-sm font-bold text-white">{cart.length} artículo(s)</span>
                    </div>
                    <span className="font-bold text-mustard tabular-nums">{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto mb-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-xs text-white/70">
                        <span className="truncate">
                          {item.quantity}x {item.product.name}
                        </span>
                        <button
                          type="button"
                          aria-label={`Quitar ${item.product.name}`}
                          onClick={() => removeItem(item.id)}
                          className="p-1 rounded hover:bg-white/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={sendOrder}
                    disabled={submitting}
                    className="btn btn-primary w-full h-11"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Enviar a Cocina — Mesa {selectedTable}
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProduct && (
          <WaiterProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAdd={addToCart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
