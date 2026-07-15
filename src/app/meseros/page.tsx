'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Trash2, Send, ChevronLeft } from 'lucide-react';
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

const inputClass = "px-3 py-2 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none";
const inputWide = "w-full px-3 py-2 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none";

export default function WaiterPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
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

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then((data: Category[]) => {
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
        setActiveCategory(data[0].id);
      }
    });
  }, []);

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
      product: p,
      variation: modalVariation,
      quantity: modalQuantity,
      removedIngredients: modalRemoved,
      addedExtras: modalExtras,
      selections: modalSelections,
      note: modalNote,
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
    if (!customerName.trim() || !tableNumber.trim()) { alert('Ingresa el nombre del cliente y la mesa'); return; }
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        customerName: `${customerName} (Mesa ${tableNumber})`,
        tableNumber: tableNumber,
        paymentMethod: 'CASH',
        status: 'PENDING',
        items: cart.map(item => ({
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error');
      const order = await res.json();
      const socket = getSocket();
      socket.emit('join:kitchen');
      setCart([]);
      setTableNumber('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { alert('Error al enviar el pedido'); }
    finally { setSubmitting(false); }
  };

  const activeProducts = categories.find(c => c.id === activeCategory)?.products || [];

  return (
    <div className="min-h-screen bg-[#0F0F23]">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-gray-700 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>MESERO</h1>
          {cart.length > 0 && (
            <span className="bg-[#E85D04] text-white text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Cliente"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-28 px-3 py-1.5 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm"
          />
          <input
            placeholder="Mesa #"
            value={tableNumber}
            onChange={e => setTableNumber(e.target.value)}
            className="w-20 px-3 py-1.5 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm text-center"
          />
          {cart.length > 0 && (
            <button onClick={() => setCartOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[#E85D04] text-white text-sm font-semibold rounded-lg hover:bg-[#d55404]">
              <ShoppingBag className="w-4 h-4" />
              Revisar
            </button>
          )}
        </div>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#06D6A0] text-white font-bold px-6 py-3 rounded-xl shadow-2xl">
            Pedido enviado a cocina ✓
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category nav */}
      <nav className="flex overflow-x-auto gap-1 px-4 py-3 bg-[#1a1a2e] border-b border-gray-700">
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

      {/* Products grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {activeProducts.map((p, i) => (
          <motion.button key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            onClick={() => p.isAvailable && openModal(p)}
            disabled={!p.isAvailable}
            className={`relative text-left rounded-xl p-3 border transition-all ${
              p.isAvailable ? 'bg-[#1a1a2e] border-gray-700 hover:border-[#E85D04]' : 'bg-[#1a1a2e]/50 border-gray-800 opacity-50'
            }`}>
            {p.imageUrl && (
              <div className="w-full h-20 rounded-lg overflow-hidden bg-gray-800 mb-2">
                <img src={p.imageUrl} className="w-full h-full object-cover" />
              </div>
            )}
            <h3 className="font-semibold text-white text-sm truncate">{p.name}</h3>
            <p className="text-[#E85D04] font-bold text-sm mt-1">{formatPrice(Number(p.basePrice))}</p>
            {!p.isAvailable && <span className="text-xs text-[#EF476F]">Agotado</span>}
          </motion.button>
        ))}
      </div>

      {/* Product modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" onClick={() => setSelectedProduct(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full sm:max-w-lg max-h-[85vh] bg-[#1a1a2e] rounded-t-3xl sm:rounded-3xl overflow-y-auto">
              <button onClick={() => setSelectedProduct(null)}
                className="sticky top-3 float-right z-10 mr-3 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="px-6 pb-6 pt-8">
                <h2 className="text-xl font-bold text-white">{selectedProduct.name}</h2>
                <p className="text-sm text-gray-400 mt-1">{selectedProduct.description}</p>

                {/* Variations */}
                {selectedProduct.hasVariation && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-300 mb-2">Selecciona:</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedProduct.variations.map(v => (
                        <button key={v.id} onClick={() => { setModalVariation(v); setModalError(''); }}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                            modalVariation?.id === v.id
                              ? 'border-[#E85D04] bg-[#E85D04]/10 text-[#E85D04]'
                              : 'border-gray-700 bg-[#0F0F23] text-gray-300 hover:border-[#E85D04]'
                          }`}>
                          {v.name}{Number(v.additionalPrice) > 0 ? ` (+${formatPrice(Number(v.additionalPrice))})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required selections */}
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

                {/* Default ingredients */}
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

                {/* Extras */}
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

                {/* Note */}
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-300 mb-2">Nota para el cliente:</p>
                  <textarea value={modalNote} onChange={e => setModalNote(e.target.value)}
                    placeholder="Ej: Sin cebolla extra, bien tostado..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0F0F23] border border-gray-700 text-white text-sm focus:border-[#E85D04] outline-none resize-none" rows={2} />
                </div>

                {/* Quantity + Add */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"><Minus className="w-4 h-4 text-white" /></button>
                    <span className="font-bold text-lg text-white w-6 text-center">{modalQuantity}</span>
                    <button onClick={() => setModalQuantity(modalQuantity + 1)} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"><Plus className="w-4 h-4 text-white" /></button>
                  </div>
                </div>
                {modalError && <p className="text-[#EF476F] text-sm mt-2 font-medium">{modalError}</p>}
                <button onClick={addToCart} className="w-full mt-4 py-3 bg-[#E85D04] text-white font-bold rounded-xl hover:bg-[#d55404] transition-colors">
                  Agregar al Pedido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50" onClick={() => setCartOpen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[#1a1a2e] rounded-t-3xl overflow-y-auto">
              <div className="sticky top-0 bg-[#1a1a2e] z-10 px-6 pt-4 pb-2 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{customerName || 'Cliente'} — Mesa {tableNumber || '?'}</h2>
                <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"><X className="w-4 h-4 text-white" /></button>
              </div>
              <div className="px-6 py-4 space-y-3">
                {cart.length === 0 ? <p className="text-center text-gray-500 py-8">Pedido vacío</p> : cart.map(item => (
                  <div key={item.id} className="bg-[#0F0F23] rounded-xl p-3 border border-gray-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">{item.product.name}</p>
                        {item.variation && <p className="text-xs text-[#E85D04]">{item.variation.name}</p>}
                        {item.removedIngredients.length > 0 && <p className="text-xs text-[#EF476F]">Sin: {item.removedIngredients.join(', ')}</p>}
                        {item.addedExtras.length > 0 && <p className="text-xs text-[#06D6A0]">+{item.addedExtras.map(e => e.name).join(', +')}</p>}
                        {item.note && <p className="text-xs text-gray-400 italic mt-1">📝 {item.note}</p>}
                      </div>
                      <button onClick={() => removeItem(item.id)}><Trash2 className="w-4 h-4 text-[#EF476F]" /></button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center"><Minus className="w-3 h-3 text-white" /></button>
                        <span className="text-sm font-medium text-white">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center"><Plus className="w-3 h-3 text-white" /></button>
                      </div>
                      <p className="font-bold text-[#E85D04]">{formatPrice(calcItemPrice(item) * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between border-t border-gray-700 pt-3 mb-4">
                    <span className="font-bold text-white">Total</span>
                    <span className="font-bold text-xl text-[#E85D04]">{formatPrice(cart.reduce((sum, item) => sum + calcItemPrice(item) * item.quantity, 0))}</span>
                  </div>
                  <button onClick={sendOrder} disabled={submitting}
                    className="w-full py-3 bg-[#06D6A0] text-white font-bold rounded-xl hover:bg-[#05c292] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />{submitting ? 'Enviando...' : 'Enviar a Cocina'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
