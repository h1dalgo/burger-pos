'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEscapeClose } from '@/hooks/use-escape-close';

interface LiveOrder {
  id: string;
  displayId: number;
  tableNumber: string;
  status: string;
}

interface Props {
  from: string;
  tableCount: number;
  orders: LiveOrder[];
  onClose: () => void;
  onDone: () => void;
}

/**
 * Pasar los pedidos de una mesa a otra. Si la mesa de destino ya tiene
 * pedidos, las dos mesas quedan unidas en ella.
 */
export default function MoveTableSheet({ from, tableCount, orders, onClose, onDone }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeClose(ref, onClose);
  const mine = orders.filter((o) => o.tableNumber === from);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(mine.map((o) => o.id)));
  const [to, setTo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const occupied = new Set(orders.map((o) => o.tableNumber));
  const merge = to !== null && occupied.has(to);

  const submit = async () => {
    if (!to || !selected.size) return;
    setSaving(true);
    try {
      const results = await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableNumber: to, actor: localStorage.getItem('waiter_name') || 'Mesero' }) })
        )
      );
      if (results.some((r) => !r.ok)) throw new Error();
      toast.success(merge ? `Mesas ${from} y ${to} unidas en la ${to}` : `Pedidos pasados a la mesa ${to}`);
      onDone();
    } catch {
      toast.error('No se pudieron mover todos los pedidos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[45] flex items-end justify-center bg-black/70 backdrop-blur-[3px] sm:items-center" onClick={onClose}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Mover o unir la mesa ${from}`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[1.75rem] border border-carbon/10 bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-[1.75rem]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-burger/40 bg-burger/10">
            <ArrowRightLeft className="h-4 w-4 text-burger" />
          </span>
          <h2 className="display text-2xl text-carbon">Mover mesa {from}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-carbon/15">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm font-semibold text-carbon">Pedidos a mover</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {mine.map((o) => (
            <button
              key={o.id}
              type="button"
              data-tone="brand"
              aria-pressed={selected.has(o.id)}
              onClick={() =>
                setSelected((s) => {
                  const n = new Set(s);
                  if (n.has(o.id)) n.delete(o.id);
                  else n.add(o.id);
                  return n;
                })
              }
              className="chip text-[13px]"
            >
              #{String(o.displayId).padStart(4, '0')}
            </button>
          ))}
        </div>

        <p className="mt-5 text-sm font-semibold text-carbon">¿A qué mesa?</p>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {Array.from({ length: tableCount }, (_, i) => String(i + 1))
            .filter((n) => n !== from)
            .map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={to === n}
                onClick={() => setTo(n)}
                className={`relative aspect-square rounded-2xl border text-sm font-semibold tabular-nums transition-colors ${to === n ? 'border-burger/70 bg-burger/[0.12] text-burger-dark' : 'border-carbon/15 text-carbon/80 hover:border-carbon/40'}`}
              >
                {n}
                {occupied.has(n) && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-status-preparing" aria-label="ocupada" />}
              </button>
            ))}
        </div>
        {merge && <p className="mt-3 text-[12px] text-status-preparing">La mesa {to} ya tiene pedidos: las dos mesas quedarán unidas en la {to}.</p>}

        <button type="button" onClick={submit} disabled={!to || !selected.size || saving} className="btn btn-primary btn-lg mt-5 w-full">
          {saving ? 'Moviendo…' : to ? (merge ? `Unir con la mesa ${to}` : `Pasar a la mesa ${to}`) : 'Elige una mesa'}
        </button>
      </motion.div>
    </motion.div>
  );
}
