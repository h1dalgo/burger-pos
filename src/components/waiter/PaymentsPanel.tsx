'use client';

import { motion } from 'framer-motion';
import { X, Banknote, Smartphone, CreditCard, Check, Ban, Wallet } from 'lucide-react';
import type { Order } from '@/types';
import { formatDisplayId } from '@/lib/order-status';
import { formatBs, formatPrice } from '@/lib/utils';
import { useEscapeClose } from '@/hooks/use-escape-close';
import { useRef } from 'react';

const ICON = { CASH: Banknote, MOBILE_PAYMENT: Smartphone, CARD: CreditCard };
const LABEL = { CASH: 'Efectivo', MOBILE_PAYMENT: 'Pago Móvil', CARD: 'Tarjeta' };

interface Props {
  orders: Order[];
  pendingId: string | null;
  onConfirm: (order: Order) => void;
  onCancel: (order: Order) => void;
  onClose: () => void;
}

/**
 * Cobros: pedidos que el mesero tiene que cobrar en la mesa. Al confirmar el
 * pago el pedido pasa a cocina (la cocina solo ve lo que ya está pagado).
 */
export default function PaymentsPanel({ orders, pendingId, onConfirm, onCancel, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeClose(ref, onClose);
  const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" onClick={onClose}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Pedidos por cobrar"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 flex w-full max-w-md flex-col safe-top safe-bottom border-l border-carbon/10 bg-card"
      >
        <div className="flex items-center gap-3 border-b border-carbon/10 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-burger/40 bg-burger/10">
            <Wallet className="h-4.5 w-4.5 text-burger" />
          </div>
          <div className="min-w-0">
            <h2 className="display text-xl leading-none text-carbon">Cobros</h2>
            <p className="eyebrow mt-1">{orders.length} por cobrar</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar cobros" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-carbon/15 hover:bg-carbon/[0.06]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {sorted.length === 0 && <p className="py-12 text-center text-sm text-carbon/55">No hay pedidos por cobrar</p>}
          {sorted.map((o) => {
            const Icon = ICON[o.paymentMethod];
            // el cliente paga el total + la propina que eligió
            const tip = Number(o.tip ?? 0);
            const total = Number(o.totalAmount) + tip;
            const rate = Number(o.exchangeRate ?? 0);
            const busy = pendingId === o.id;
            return (
              <div key={o.id} className="rounded-2xl border border-carbon/10 bg-carbon/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="display text-2xl leading-none text-carbon">#{formatDisplayId(o.displayId)}</p>
                    <p className="mt-1 text-[13px] text-carbon/65">
                      {o.customerName} · Mesa {o.tableNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="price text-xl">{formatPrice(total)}</p>
                    {rate > 0 && <p className="text-[11px] tabular-nums text-carbon/55">{formatBs(total * rate)}</p>}
                    {tip > 0 && <p className="text-[11px] font-semibold tabular-nums text-mint-ink">Incluye propina {formatPrice(tip)}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="flex items-center gap-1.5 rounded-full border border-carbon/15 px-2.5 py-1 font-semibold text-carbon/80">
                    <Icon className="h-3.5 w-3.5" />
                    {LABEL[o.paymentMethod]}
                  </span>
                  {o.paymentReference && (
                    <span className="rounded-full border border-burger/40 bg-burger/10 px-2.5 py-1 font-semibold tabular-nums text-burger-dark">Ref. {o.paymentReference}</span>
                  )}
                  {Number(o.discount ?? 0) > 0 && (
                    <span className="rounded-full bg-mint/12 px-2.5 py-1 font-semibold text-mint-ink">
                      {o.promoLabel || 'Descuento'} −{formatPrice(Number(o.discount))}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-[12px] text-carbon/55">{o.items.map((i) => `${i.quantity}× ${i.productName}`).join(' · ')}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => onCancel(o)} disabled={busy} className="btn btn-outline btn-sm text-rose">
                    <Ban className="h-4 w-4" />
                    Cancelar
                  </button>
                  <button type="button" onClick={() => onConfirm(o)} disabled={busy} className="btn btn-primary btn-sm flex-1">
                    <Check className="h-4 w-4" />
                    {busy ? 'Confirmando…' : 'Cobrado · enviar a cocina'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
