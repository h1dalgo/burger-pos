'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Minus, Plus } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import PaymentSelector from './PaymentSelector';
import type { PaymentMethod } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: Props) {
  const router = useRouter();
  const { items, removeItem, updateQuantity, paymentMethod, setPaymentMethod, getTotalAmount, clearCart } = useCartStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
        items: items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          basePrice: item.product.basePrice,
          quantity: item.quantity,
          variation: item.variation,
          removedIngredients: item.removedIngredients,
          addedExtras: item.addedExtras,
          selections: item.selections,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error al crear pedido');

      const order = await res.json();

      const socket = (await import('@/lib/socket-client')).getSocket();
      socket.emit('join:clients');

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
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[#FFF8F0] rounded-t-3xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-[#FFF8F0] z-10 px-6 pt-4 pb-2 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2B2D42]">Tu Pedido</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              {items.length === 0 ? (
                <p className="text-center text-[#2B2D42]/40 py-8">Tu pedido está vacío</p>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-xl p-3 border border-gray-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#2B2D42] text-sm">{item.product.name}</p>
                        {item.variation && (
                          <p className="text-xs text-[#E85D04]">{item.variation.name}</p>
                        )}
                        {item.removedIngredients.length > 0 && (
                          <p className="text-xs text-[#EF476F]">
                            Sin: {item.removedIngredients.join(', ')}
                          </p>
                        )}
                        {item.addedExtras.length > 0 && (
                          <p className="text-xs text-[#06D6A0]">
                            +{item.addedExtras.map((e) => e.name).join(', +')}
                          </p>
                        )}
                        {Object.entries(item.selections).flatMap(([, options]) =>
                          options.map((opt) => (
                            <p key={opt} className="text-xs text-[#2B2D42]/60">
                              {opt}
                            </p>
                          ))
                        )}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="ml-2">
                        <Trash2 className="w-4 h-4 text-[#EF476F]" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="font-bold text-[#E85D04]">
                        {formatPrice(useCartStore.getState().getItemPrice(item) * item.quantity)}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[#2B2D42] mb-2">Método de Pago</p>
                  <PaymentSelector value={paymentMethod} onChange={(m) => { setPaymentMethod(m); setError(''); }} />
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="font-bold text-[#2B2D42]">Total</span>
                  <span className="font-bold text-xl text-[#E85D04]">{formatPrice(getTotalAmount())}</span>
                </div>

                {error && <p className="text-[#EF476F] text-sm font-medium">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 bg-[#E85D04] text-white font-bold rounded-xl shadow-lg hover:bg-[#d55404] disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Enviando...' : 'Realizar pedido'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
