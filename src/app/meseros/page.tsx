'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, ChefHat, ShoppingBag, User, Table2, Phone, DollarSign, X, Minus, Plus, Trash2, Send, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { getSocket } from '@/lib/socket-client';

interface ProductVariation { id: string; name: string; additionalPrice: string }
interface DefaultIngredient { id: string; name: string }
interface ExtraIngredient { id: string; name: string; basePrice: string }
interface SelectionOption { id: string; name: string; additionalPrice: string }
interface RequiredSelection { id: string; label: string; maxSelections: number; options: SelectionOption[] }
interface Product {
  id: string; name: string; description: string; basePrice: string;
  imageUrl: string | null; hasVariation: boolean; isAvailable: boolean;
  variations: ProductVariation[]; defaultIngredients: DefaultIngredient[];
  extraIngredients: ExtraIngredient[]; requiredSelections: RequiredSelection[];
}
interface Category { id: string; name: string; products: Product[] }

interface CartItem {
  id: string; product: Product; variation: ProductVariation | null;
  quantity: number; removedIngredients: string[];
  addedExtras: ExtraIngredient[]; selections: Record<string, string[]>;
  note: string;
}

interface TableData {
  number: string;
  status: 'empty' | 'pending' | 'preparing' | 'ready' | 'ordered';
}

interface TableCall {
  id: string; tableNumber: string; type: 'CALL_WAITER' | 'REQUEST_BILL'; status: string; createdAt: string;
}

function playCallSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.24);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function playBillSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.setValueAtTime(500, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function playReadySound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  empty: { label: 'Libre', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
  ordered: { label: 'Esperando Confirmación', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  pending: { label: 'Pendiente', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  preparing: { label: 'Preparando', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  ready: { label: 'Listo', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
};

export default function WaiterPage() {
  const [tableCount, setTableCount] = useState(10);
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeCalls, setActiveCalls] = useState<TableCall[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [recentCall, setRecentCall] = useState<TableCall | null>(null);
  const [notifications, setNotifications] = useState<TableCall[]>([]);

  // Order state
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Product modal state
  const [modalVariation, setModalVariation] = useState<ProductVariation | null>(null);
  const [modalRemoved, setModalRemoved] = useState<string[]>([]);
  const [modalExtras, setModalExtras] = useState<ExtraIngredient[]>([]);
  const [modalSelections, setModalSelections] = useState<Record<string, string[]>>({});
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNote, setModalNote] = useState('');
  const [modalError, setModalError] = useState('');

  const notificationTimer = useRef<NodeJS.Timeout | null>(null);

  // Load settings for table count
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setTableCount(data.tableCount ?? 10);
    });
  }, []);

  // Load products
  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then((data: Category[]) => {
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
        setActiveCategory(data[0].id);
      }
    });
  }, []);

  const loadTables = useCallback(async () => {
    try {
      const [ordersRes, callsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/table-calls'),
      ]);
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        const tableMap = new Map<string, TableData['status']>();
        for (const o of orders) {
          const tn = o.tableNumber;
          if (o.status === 'WAITING_PAYMENT') tableMap.set(tn, 'ordered');
          else if (o.status === 'PENDING') tableMap.set(tn, 'pending');
          else if (o.status === 'IN_PREPARATION') tableMap.set(tn, 'preparing');
          else if (o.status === 'READY') tableMap.set(tn, 'ready');
        }
        setTables(Array.from({ length: tableCount }, (_, i) => ({
          number: String(i + 1),
          status: tableMap.get(String(i + 1)) || 'empty',
        })));
      }
      if (callsRes.ok) {
        const calls: TableCall[] = await callsRes.json();
        setActiveCalls(calls);
      }
    } catch {}
  }, [tableCount]);

  useEffect(() => {
    if (tableCount > 0) loadTables();
  }, [tableCount, loadTables]);

  // Socket for active calls
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:waiter');

    socket.on('tableCall:new', (call: TableCall) => {
      setActiveCalls(prev => [call, ...prev]);
      setRecentCall(call);
      if (call.type === 'CALL_WAITER') playCallSound();
      else playBillSound();
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
      notificationTimer.current = setTimeout(() => setRecentCall(null), 4000);
      loadTables();
    });

    socket.on('tableCall:resolved', (call: TableCall) => {
      setActiveCalls(prev => prev.filter(c => c.id !== call.id));
      loadTables();
    });

    socket.on('order:new', () => loadTables());
    socket.on('order:updated', (order: any) => {
      if (order?.status === 'READY') playReadySound();
      loadTables();
    });

    return () => {
      socket.off('tableCall:new');
      socket.off('tableCall:resolved');
      socket.off('order:new');
      socket.off('order:updated');
    };
  }, [loadTables]);

  const resolveCall = async (callId: string) => {
    await fetch(`/api/table-calls/${callId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve' }),
    });
  };

  const handleTableClick = (tableNum: string) => {
    const calls = activeCalls.filter(c => c.tableNumber === tableNum);
    if (calls.length > 0) {
      for (const call of calls) resolveCall(call.id);
    }
    setSelectedTable(tableNum);
    setCart([]);
    setCustomerName('');
    setShowOrderPanel(true);
  };

  // Product modal handlers
  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setModalVariation(null);
    setModalRemoved([]);
    setModalExtras([]);
    setModalSelections({});
    setModalQuantity(1);
    setModalNote('');
    setModalError('');
  };

  const handleSelectionToggle = (rsId: string, optName: string, max: number) => {
    setModalSelections(prev => {
      const current = prev[rsId] || [];
      if (current.includes(optName)) return { ...prev, [rsId]: current.filter(o => o !== optName) };
      if (current.length >= max) return prev;
      return { ...prev, [rsId]: [...current, optName] };
    });
  };

  const addToCart = () => {
    const p = selectedProduct!;
    if (p.hasVariation && !modalVariation) { setModalError('Selecciona una variación'); return; }
    for (const rs of p.requiredSelections) {
      if ((modalSelections[rs.id] || []).length < 1) { setModalError(`Selecciona: ${rs.label}`); return; }
    }
    setModalError('');
    const item: CartItem = {
      id: Date.now().toString(),
      product: p, variation: modalVariation, quantity: modalQuantity,
      removedIngredients: modalRemoved, addedExtras: modalExtras,
      selections: modalSelections, note: modalNote,
    };
    setCart(prev => [...prev, item]);
    setSelectedProduct(null);
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQty = (id: string, delta: number) => setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));

  const calcItemPrice = (item: CartItem) => {
    let total = Number(item.product.basePrice);
    if (item.variation) total += Number(item.variation.additionalPrice);
    for (const e of item.addedExtras) total += Number(e.basePrice);
    for (const sel of Object.values(item.selections)) {
      for (const s of sel) {
        for (const rs of item.product.requiredSelections) {
          const opt = rs.options.find(o => o.name === s);
          if (opt) total += Number(opt.additionalPrice);
        }
      }
    }
    return total;
  };

  const sendOrder = async () => {
    if (!customerName.trim() || !selectedTable) { alert('Ingresa el nombre del cliente'); return; }
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        customerName: `${customerName} (Mesa ${selectedTable})`,
        tableNumber: selectedTable,
        paymentMethod: 'CASH',
        status: 'PENDING',
        items: cart.map(item => ({
          productId: item.product.id, productName: item.product.name,
          basePrice: item.product.basePrice, quantity: item.quantity,
          variation: item.variation, removedIngredients: item.removedIngredients,
          addedExtras: item.addedExtras, selections: item.selections, note: item.note,
        })),
      };
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error');
      const order = await res.json();
      const socket = getSocket();
      socket.emit('join:kitchen');
      setCart([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      loadTables();
    } catch { alert('Error al enviar el pedido'); }
    finally { setSubmitting(false); }
  };

  const activeProducts = categories.find(c => c.id === activeCategory)?.products || [];
  const tableCallsForSelected = activeCalls.filter(c => c.tableNumber === selectedTable);

  return (
    <div className="min-h-screen bg-[#0F0F23]">
      {/* Top notification */}
      <AnimatePresence>
        {recentCall && (
          <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold bg-gradient-to-r from-[#E85D04] to-[#FFB703] text-white">
            {recentCall.type === 'CALL_WAITER' ? <BellRing className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
            Mesa {recentCall.tableNumber} — {recentCall.type === 'CALL_WAITER' ? 'Llama al mesero' : 'Pide la cuenta'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-[#1a1a2e]/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between border-b border-gray-800/50 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E85D04] to-[#FFB703] flex items-center justify-center shadow-lg">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>MESERO</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCalls.length > 0 && (
            <div className="flex items-center gap-1 bg-red-500/10 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {activeCalls.length} notificación(es)
            </div>
          )}
        </div>
      </header>

      {/* Table Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
          {tables.map((table) => {
            const cfg = statusConfig[table.status];
            const calls = activeCalls.filter(c => c.tableNumber === table.number);
            const hasCall = calls.length > 0;
            return (
              <motion.button key={table.number} onClick={() => handleTableClick(table.number)}
                whileTap={{ scale: 0.95 }}
                className={`relative rounded-2xl p-4 border-2 transition-all duration-200 ${cfg.bg} ${cfg.border} ${
                  hasCall ? 'ring-2 ring-[#E85D04] animate-pulse shadow-lg shadow-orange-500/20' : 'hover:shadow-md'
                }`}>
                {hasCall && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-[#E85D04] to-[#FFB703] flex items-center justify-center shadow-lg animate-bounce z-10">
                    {calls[0].type === 'CALL_WAITER' ? <Bell className="w-3 h-3 text-white" /> : <DollarSign className="w-3 h-3 text-white" />}
                  </div>
                )}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
                    {table.number}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                </div>
                {hasCall && (
                  <div className="mt-2 space-y-0.5 text-center">
                    {calls.map(c => (
                      <span key={c.id} className={`block text-[9px] font-bold uppercase ${c.type === 'CALL_WAITER' ? 'text-orange-300' : 'text-yellow-300'}`}>
                        {c.type === 'CALL_WAITER' ? '🔔 Llamando' : '💰 Cuenta'}
                      </span>
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Order Panel (slide up) */}
      <AnimatePresence>
        {showOrderPanel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60" onClick={() => setShowOrderPanel(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-[#1a1a2e] rounded-t-3xl overflow-hidden flex flex-col">
              <div className="sticky top-0 bg-[#1a1a2e] z-10 px-6 pt-4 pb-3 border-b border-gray-700/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E85D04] to-[#FFB703] flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {selectedTable}
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Mesa {selectedTable}</h2>
                    {tableCallsForSelected.length > 0 && (
                      <p className="text-[10px] text-orange-300 font-semibold">
                        {tableCallsForSelected.map(c => c.type === 'CALL_WAITER' ? '🔔 Llamó al mesero' : '💰 Pide la cuenta').join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowOrderPanel(false)} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"><X className="w-4 h-4 text-gray-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Customer name */}
                <div className="px-6 pt-4">
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none" />
                </div>

                {/* Category nav */}
                <nav className="flex overflow-x-auto gap-1 px-4 py-3">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                      className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        activeCategory === cat.id ? 'text-white' : 'text-gray-400 hover:text-white'
                      }`}>
                      {activeCategory === cat.id && (
                        <motion.div layoutId="waiterCat" className="absolute inset-0 bg-[#E85D04] rounded-full" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                      )}
                      <span className="relative z-10">{cat.name}</span>
                    </button>
                  ))}
                </nav>

                {/* Products */}
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {activeProducts.map((p, i) => (
                    <motion.button key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      onClick={() => p.isAvailable && openModal(p)} disabled={!p.isAvailable}
                      className={`relative text-left rounded-xl p-3 border transition-all ${
                        p.isAvailable ? 'bg-[#1a1a2e] border-gray-700 hover:border-[#E85D04]' : 'bg-[#1a1a2e]/50 border-gray-800 opacity-50'
                      }`}>
                      {p.imageUrl && <div className="w-full h-16 rounded-lg overflow-hidden bg-gray-800 mb-2"><img src={p.imageUrl} className="w-full h-full object-cover" /></div>}
                      <h3 className="font-semibold text-white text-xs truncate">{p.name}</h3>
                      <p className="text-[#E85D04] font-bold text-xs mt-1">{formatPrice(Number(p.basePrice))}</p>
                      {!p.isAvailable && <span className="text-xs text-[#EF476F]">Agotado</span>}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Cart summary */}
              {cart.length > 0 && (
                <div className="border-t border-gray-700/50 px-6 py-3 shrink-0 bg-[#1a1a2e]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#FFB703]" />
                      <span className="text-sm font-bold text-white">{cart.length} artículo(s)</span>
                    </div>
                    <span className="font-bold text-[#FFB703]">{formatPrice(cart.reduce((sum, item) => sum + calcItemPrice(item) * item.quantity, 0))}</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto mb-2">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-gray-300">
                        <span className="truncate">{item.quantity}x {item.product.name}</span>
                        <button onClick={() => removeItem(item.id)}><Trash2 className="w-3 h-3 text-[#EF476F]" /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={sendOrder} disabled={submitting}
                    className="w-full py-2.5 bg-gradient-to-r from-[#E85D04] to-[#FFB703] text-white font-bold rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-orange-500/20">
                    <Send className="w-4 h-4" />{submitting ? 'Enviando...' : `Enviar a Cocina — Mesa ${selectedTable}`}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#06D6A0] text-white font-bold px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Pedido enviado a cocina ✓
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" onClick={() => setSelectedProduct(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full sm:max-w-lg max-h-[85vh] bg-[#1a1a2e] rounded-t-3xl sm:rounded-3xl overflow-y-auto">
              <button onClick={() => setSelectedProduct(null)} className="sticky top-3 float-right z-10 mr-3 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"><X className="w-4 h-4 text-white" /></button>
              <div className="px-6 pb-6 pt-8">
                <h2 className="text-xl font-bold text-white">{selectedProduct.name}</h2>
                <p className="text-sm text-gray-400 mt-1">{selectedProduct.description}</p>

                {selectedProduct.hasVariation && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-300 mb-2">Selecciona:</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedProduct.variations.map(v => (
                        <button key={v.id} onClick={() => { setModalVariation(v); setModalError(''); }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                            modalVariation?.id === v.id ? 'border-[#E85D04] bg-[#E85D04]/10 text-[#E85D04]' : 'border-gray-700 bg-[#0F0F23] text-gray-300 hover:border-[#E85D04]'
                          }`}>
                          {v.name}{Number(v.additionalPrice) > 0 ? ` (+${formatPrice(Number(v.additionalPrice))})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProduct.requiredSelections.map(rs => (
                  <div key={rs.id} className="mt-4">
                    <p className="text-sm font-semibold text-gray-300 mb-2">{rs.label}{rs.maxSelections > 1 ? ` (máx ${rs.maxSelections})` : ''}</p>
                    <div className="flex flex-wrap gap-2">
                      {rs.options.map(opt => {
                        const sel = (modalSelections[rs.id] || []).includes(opt.name);
                        return (
                          <button key={opt.id} onClick={() => { handleSelectionToggle(rs.id, opt.name, rs.maxSelections); setModalError(''); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              sel ? 'border-[#06D6A0] bg-[#06D6A0]/10 text-[#06D6A0]' : 'border-gray-700 bg-[#0F0F23] text-gray-300 hover:border-[#06D6A0]'
                            }`}>{opt.name}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {selectedProduct.defaultIngredients.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-300 mb-2">Ingredientes (toca para quitar):</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.defaultIngredients.map(ing => {
                        const removed = modalRemoved.includes(ing.name);
                        return (
                          <button key={ing.id} onClick={() => setModalRemoved(prev => removed ? prev.filter(r => r !== ing.name) : [...prev, ing.name])}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              removed ? 'border-[#EF476F] bg-[#EF476F]/10 text-[#EF476F] line-through' : 'border-gray-700 bg-[#0F0F23] text-gray-300 hover:border-[#EF476F]'
                            }`}>{ing.name} {removed ? '✕' : '✓'}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedProduct.extraIngredients.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-300 mb-2">Extras:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.extraIngredients.map(extra => {
                        const added = modalExtras.find(e => e.id === extra.id);
                        return (
                          <button key={extra.id} onClick={() => setModalExtras(prev => added ? prev.filter(e => e.id !== extra.id) : [...prev, extra])}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              added ? 'border-[#06D6A0] bg-[#06D6A0]/10 text-[#06D6A0]' : 'border-gray-700 bg-[#0F0F23] text-gray-300 hover:border-[#06D6A0]'
                            }`}>+{extra.name} ({formatPrice(Number(extra.basePrice))})</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-300 mb-2">Nota:</p>
                  <textarea value={modalNote} onChange={e => setModalNote(e.target.value)}
                    placeholder="Ej: Sin cebolla extra, bien tostado..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none resize-none" rows={2} />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"><Minus className="w-4 h-4 text-white" /></button>
                    <span className="font-bold text-lg text-white w-6 text-center">{modalQuantity}</span>
                    <button onClick={() => setModalQuantity(modalQuantity + 1)} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"><Plus className="w-4 h-4 text-white" /></button>
                  </div>
                </div>
                {modalError && <p className="text-[#EF476F] text-sm mt-2 font-medium">{modalError}</p>}
                <button onClick={addToCart} className="w-full mt-4 py-3 bg-[#E85D04] text-white font-bold rounded-xl hover:bg-[#d55404] transition-colors">Agregar al Pedido</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
