'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import PaymentSelector from './PaymentSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: Props) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, paymentMethod, setPaymentMethod, getTotalAmount, clearCart } = useCartStore();
  const getItemPrice = useCartStore((s) => s.getItemPrice);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tipPct, setTipPct] = useState(0);

  const subtotal = getTotalAmount();
  const tipAmount = Math.round(subtotal * tipPct) / 100;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    if (!paymentMethod) {
      setError('Selecciona un método de pago');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const { customerName, tableNumber } = (await import('@/store/session-store')).useSessionStore.getState();

      const payload = {
        customerName,
        tableNumber,
        paymentMethod,
        tip: tipAmount,
        items: items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          basePrice: item.product.basePrice,
          quantity: item.quantity,
          variation: item.variation,
          removedIngredients: item.removedIngredients,
          addedExtras: item.addedExtras,
          selections: item.selections,
          selectionLabels: item.selectionLabels,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error al crear pedido');

      const order = await res.json();

      const { joinRoom } = await import('@/lib/socket-client');
      joinRoom('clients');

      clearCart();
      router.push(`/success?orderId=${order.displayId}`);
    } catch {
      setError('Error al enviar el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tu pedido"
            className="absolute bottom-0 left-0 right-0 sm:max-w-lg sm:mx-auto max-h-[85vh] bg-cream rounded-t-3xl overflow-y-auto overscroll-contain flex flex-col"
          >
            <div className="sticky top-0 z-10 bg-cream px-6 pt-5 pb-3 border-b-2 border-carbon flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-carbon">Tu Pedido</h2>
                <p className="text-xs text-carbon/50">
                  {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="w-9 h-9 rounded-full bg-card border-2 border-carbon flex items-center justify-center hover:bg-mustard transition-colors"
              >
                <X className="w-4.5 h-4.5 text-carbon" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              {items.length === 0 ? (
                <EmptyState
                  icon={<ShoppingBag className="w-7 h-7" />}
                  title="Tu pedido está vacío"
                  description="Agrega productos desde el menú"
                  compact
                />
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      className="bg-card rounded-xl p-3.5 border-2 border-carbon/20"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-carbon text-sm">{item.product.name}</p>
                          {item.variation && (
                            <p className="text-xs text-burger font-medium">{item.variation.name}</p>
                          )}
                          {item.removedIngredients.length > 0 && (
                            <p className="text-xs text-rose">Sin: {item.removedIngredients.join(', ')}</p>
                          )}
                          {item.addedExtras.length > 0 && (
                            <p className="text-xs text-mint-ink">
                              +{item.addedExtras.map((e) => e.name).join(', +')}
                            </p>
                          )}
                          {Object.entries(item.selections).flatMap(([key, options]) =>
                            options.map((opt, idx) => (
                              <p key={`${key}-${opt}-${idx}`} className="text-xs text-carbon/55">
                                {opt}
                              </p>
                            ))
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label={`Eliminar ${item.product.name}`}
                          className="w-9 h-9 -mr-1 shrink-0 rounded-full flex items-center justify-center text-rose hover:bg-rose/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Quitar uno"
                            className="w-10 h-10 rounded-full bg-card border-2 border-carbon/30 flex items-center justify-center disabled:opacity-35 hover:border-carbon transition-colors"
                          >
                            <Minus className="w-4 h-4 text-carbon" />
                          </button>
                          <span className="text-sm font-bold w-5 text-center tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Agregar uno"
                            className="w-10 h-10 rounded-full bg-card border-2 border-carbon/30 flex items-center justify-center hover:border-carbon transition-colors"
                          >
                            <Plus className="w-4 h-4 text-carbon" />
                          </button>
                        </div>
                        <p className="font-bold text-burger tabular-nums">
                          {formatPrice(getItemPrice(item) * item.quantity)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {items.length > 0 && (
              <div
                className="px-6 pt-2 space-y-4 border-t border-carbon/8"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              >
                <div className="pt-4">
                  <p className="text-sm font-semibold text-carbon mb-2">Método de Pago</p>
                  <PaymentSelector
                    value={paymentMethod}
                    onChange={(m) => {
                      setPaymentMethod(m);
                      setError('');
                    }}
                  />
                </div>

                <div className="pt-1">
                  <p className="text-sm font-semibold text-carbon mb-2">Propina (opcional)</p>
                  <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Propina">
                    {[0, 10, 15, 20].map((pct) => {
                      const selected = tipPct === pct;
                      return (
                        <button
                          key={pct}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setTipPct(pct)}
                          className={`py-2.5 rounded-xl border-2 transition-[border-color,background-color,color,box-shadow] ${
                            selected
                              ? 'border-carbon bg-mint text-cream shadow-card'
                              : 'border-carbon/25 bg-card text-carbon hover:border-carbon'
                          }`}
                        >
                          <span className="block text-sm font-bold leading-tight">{pct}%</span>
                          {pct > 0 && (
                            <span className="block text-[10px] font-semibold opacity-80 tabular-nums">
                              {formatPrice(Math.round(subtotal * pct) / 100)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t-2 border-carbon/15 pt-3">
                  <div>
                    <span className="font-bold text-carbon">Total</span>
                    {tipAmount > 0 && (
                      <span className="block text-[11px] font-semibold text-mint-ink">
                        Incluye propina de {formatPrice(tipAmount)}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-2xl text-carbon bg-mustard border-2 border-carbon rounded-md px-2.5 py-0.5 tabular-nums">
                    {formatPrice(subtotal + tipAmount)}
                  </span>
                </div>

                {error && (
                  <p className="text-rose text-sm font-medium" role="alert">
                    {error}
                  </p>
                )}

                <Button onClick={handleSubmit} loading={submitting} fullWidth size="lg">
                  {submitting ? 'Enviando...' : 'Realizar pedido'}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
