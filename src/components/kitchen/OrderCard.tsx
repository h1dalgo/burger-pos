'use client';

import { motion } from 'framer-motion';
import { User, Table2, Banknote, Smartphone, CreditCard, Sparkles, StickyNote, Loader2 } from 'lucide-react';
import type { Order } from '@/types';
import OrderTimer from './OrderTimer';
import { getStatusMeta, formatDisplayId } from '@/lib/order-status';

const paymentIcons = {
  CASH: Banknote,
  MOBILE_PAYMENT: Smartphone,
  CARD: CreditCard,
};

const paymentLabels = {
  CASH: 'Efectivo',
  MOBILE_PAYMENT: 'Pago Móvil',
  CARD: 'Tarjeta',
};

interface Props {
  order: Order;
  isNew: boolean;
  pending: boolean;
  onAction: (orderId: string, action: string) => void;
}

export default function OrderCard({ order, isNew, pending, onAction }: Props) {
  const PaymentIcon = paymentIcons[order.paymentMethod];
  const meta = getStatusMeta(order.status);
  const totalAmount = Number(order.totalAmount).toFixed(2);
  const tapAdvance =
    (order.status === 'PENDING' || order.status === 'IN_PREPARATION') && meta.next !== null;

  const advance = () => {
    if (!pending && meta.next) onAction(order.id, meta.next);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      onClick={tapAdvance ? advance : undefined}
      onKeyDown={
        tapAdvance
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                advance();
              }
            }
          : undefined
      }
      role={tapAdvance ? 'button' : undefined}
      tabIndex={tapAdvance ? 0 : undefined}
      aria-label={
        tapAdvance
          ? `Orden ${formatDisplayId(order.displayId)} — ${meta.actionLabel}`
          : undefined
      }
      className={`bg-card rounded-xl border-2 border-carbon/20 shadow-card hover:shadow-lift transition-shadow p-4 space-y-3 ${
        tapAdvance ? 'cursor-pointer select-none' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="display text-3xl text-carbon sign-yellow leading-none">
              {formatDisplayId(order.displayId)}
            </h3>
            {isNew && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-mustard text-carbon border-2 border-carbon">
                <Sparkles className="w-3 h-3" />
                Nuevo
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-carbon/70 mt-2">
            <span className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-carbon/45" /> {order.customerName}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <Table2 className="w-3.5 h-3.5 text-carbon/45" /> Mesa {order.tableNumber}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <OrderTimer createdAt={order.createdAt} />
          <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-carbon/8 text-carbon/75 border border-carbon/15">
            <PaymentIcon className="w-3 h-3" />
            {paymentLabels[order.paymentMethod]}
          </div>
        </div>
      </div>

      <div className="border-t border-carbon/15 pt-2.5 space-y-2.5">
        {order.items.map((item) => (
          <div key={item.id} className="text-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="bg-mustard text-carbon font-bold tabular-nums rounded border-2 border-carbon px-1 leading-tight">{item.quantity}x</span>
              <span className="font-semibold text-carbon">{item.productName}</span>
              {item.variation && (
                <span className="text-azul text-sm font-medium shrink-0">
                  ({item.variation.variationName})
                </span>
              )}
            </div>
            {(item.removedIngredients.length > 0 || item.addedExtras.length > 0 || item.selections.length > 0 || item.note) && (
              <div className="ml-6 mt-1.5 space-y-1 border-l-2 border-carbon/20 pl-3">
                {item.removedIngredients.map((r, i) => (
                  <span key={i} className="block text-rose text-sm font-medium">
                    Sin {r.ingredientName}
                  </span>
                ))}
                {item.addedExtras.map((e, i) => (
                  <span key={i} className="block text-mint text-sm font-medium">
                    + {e.extraName}
                  </span>
                ))}
                {item.selections.map((s, i) => (
                  <span key={i} className="block text-azul text-sm font-medium">
                    {s.selectionLabel}: {s.selectedOptionName}
                  </span>
                ))}
                {item.note && (
                  <span className="flex items-start gap-1.5 text-status-preparing text-sm italic">
                    <StickyNote className="w-3.5 h-3.5 mt-1 shrink-0" />
                    {item.note}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-carbon/60">Total</span>
        <span className="bg-mustard border-2 border-carbon rounded-lg px-2 py-0.5 text-lg font-bold text-carbon tabular-nums">${totalAmount}</span>
      </div>

      {tapAdvance ? (
        <span
          className={`btn btn-primary w-full h-11 ${pending ? 'opacity-60 pointer-events-none' : ''}`}
          aria-hidden="true"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Actualizando...
            </>
          ) : (
            meta.actionLabel
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => !pending && onAction(order.id, meta.next || 'DELIVERED')}
          disabled={pending}
          aria-busy={pending}
          className="btn btn-primary w-full h-11 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Actualizando...
            </>
          ) : (
            meta.actionLabel
          )}
        </button>
      )}
    </motion.div>
  );
}
