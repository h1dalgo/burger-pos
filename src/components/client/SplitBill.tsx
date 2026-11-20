'use client';

import { useState } from 'react';
import { Minus, Plus, Users, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatPrice } from '@/lib/utils';
import { PriceBs } from '@/components/ui/PriceBs';

/** "Dividir la cuenta": cuánto paga cada persona si se reparte en partes iguales. */
export default function SplitBill({ total, rate }: { total: number; rate?: number | null }) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState(2);
  const each = Math.ceil((total / people) * 100) / 100;

  return (
    <div className="rounded-2xl border border-carbon/10">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-carbon">
        <Users className="h-4 w-4 text-burger" />
        Dividir la cuenta
        <ChevronDown className={`ml-auto h-4 w-4 text-carbon/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 pb-4">
              <div className="flex items-center gap-1.5 rounded-full border border-carbon/15 p-0.5">
                <button type="button" onClick={() => setPeople((p) => Math.max(2, p - 1))} disabled={people <= 2} aria-label="Una persona menos" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-carbon/[0.06] disabled:opacity-35">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-24 whitespace-nowrap text-center text-sm font-semibold tabular-nums" aria-live="polite">
                  {people} personas
                </span>
                <button type="button" onClick={() => setPeople((p) => Math.min(20, p + 1))} aria-label="Una persona más" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-carbon/[0.06]">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="text-right leading-tight">
                <p className="text-[11px] text-carbon/55">Cada uno paga</p>
                <p className="price text-lg">{formatPrice(each)}</p>
                <PriceBs usd={each} rate={rate} className="text-[11px] text-carbon/50" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
