'use client';

import { motion } from 'framer-motion';
import { Banknote, Smartphone, CreditCard } from 'lucide-react';
import type { PaymentMethod } from '@/types';

interface Props {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
}

const methods: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'CASH', label: 'Efectivo', icon: Banknote },
  { value: 'MOBILE_PAYMENT', label: 'Pago Móvil', icon: Smartphone },
  { value: 'CARD', label: 'Tarjeta', icon: CreditCard },
];

export default function PaymentSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Método de pago">
      {methods.map(({ value: val, label, icon: Icon }) => {
        const selected = value === val;
        return (
          <button
            key={val}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(val)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-[border-color,background-color,color,box-shadow,transform] ${
              selected
                ? 'border-burger/70 bg-burger/[0.12] text-burger-dark'
                : 'border-carbon/15 bg-carbon/[0.03] text-carbon hover:border-carbon/40'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-bold">{label}</span>
            <motion.span
              layoutId={selected ? 'paymentCheck' : undefined}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className={`w-3 h-3 rounded-full ${selected ? 'bg-burger ring-4 ring-burger/20' : 'bg-transparent border border-carbon/25'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
