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
    <div className="grid grid-cols-3 gap-2">
      {methods.map(({ value: val, label, icon: Icon }) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
            value === val
              ? 'border-[#06D6A0] bg-[#06D6A0]/10 text-[#06D6A0]'
              : 'border-gray-200 bg-white text-[#2B2D42] hover:border-[#06D6A0]'
          }`}
        >
          <Icon className="w-6 h-6" />
          <span className="text-xs font-medium">{label}</span>
          {value === val && (
            <motion.div
              layoutId="paymentCheck"
              className="w-3 h-3 rounded-full bg-[#06D6A0]"
            />
          )}
        </button>
      ))}
    </div>
  );
}
