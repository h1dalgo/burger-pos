'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Order } from '@/types';
import { formatDisplayId } from '@/lib/order-status';
import { useEscapeClose } from '@/hooks/use-escape-close';

const REASONS = ['El cliente se fue', 'No se recibió el pago', 'Sin ingredientes', 'Pedido duplicado o con error'];

/** Confirmar la cancelación de un pedido (con motivo). */
export default function CancelOrderDialog({ order, onConfirm, onClose }: { order: Order; onConfirm: (reason: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeClose(ref, onClose);
  const [reason, setReason] = useState(REASONS[0]);
  const [other, setOther] = useState('');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]" onClick={onClose}>
      <motion.div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[1.5rem] border border-carbon/10 bg-card p-6"
      >
        <h2 id="cancel-title" className="display text-2xl text-carbon">
          ¿Cancelar el pedido #{formatDisplayId(order.displayId)}?
        </h2>
        <p className="mt-1 text-sm text-carbon/60">
          {order.customerName} · Mesa {order.tableNumber}. Los insumos vuelven al inventario.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Motivo">
          {[...REASONS, 'Otro'].map((r) => (
            <button key={r} type="button" role="radio" aria-checked={reason === r} data-tone="rose" onClick={() => setReason(r)} className={`chip text-[13px] ${reason === r ? 'chip-active' : ''}`}>
              {r}
            </button>
          ))}
        </div>
        {reason === 'Otro' && <input autoFocus value={other} onChange={(e) => setOther(e.target.value.slice(0, 120))} placeholder="Escribe el motivo" className="field mt-3" />}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-outline flex-1">
            Volver
          </button>
          <button type="button" onClick={() => onConfirm(reason === 'Otro' ? other.trim() || 'Otro' : reason)} className="btn btn-danger flex-1">
            Cancelar pedido
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
