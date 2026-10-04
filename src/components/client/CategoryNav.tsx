'use client';

import { motion } from 'framer-motion';
import { Beef, CupSoda, CakeSlice, Popcorn, UtensilsCrossed } from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
  'ENTRADAS Y COMBOS ESPECIALES': <Popcorn className="w-4 h-4" />,
  'HAMBURGUESAS': <Beef className="w-4 h-4" />,
  'BEBIDAS': <CupSoda className="w-4 h-4" />,
  'POSTRES': <CakeSlice className="w-4 h-4" />,
};

interface Props {
  categories: { id: string; name: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function CategoryNav({ categories, activeId, onSelect }: Props) {
  return (
    <nav
      aria-label="Categorías"
      className="flex overflow-x-auto scrollbar-none gap-2 px-4 pb-3"
    >
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          aria-pressed={activeId === cat.id}
          className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-[color,background-color,border-color,box-shadow] border-2 ${
            activeId === cat.id
              ? 'text-carbon'
              : 'border-transparent text-cream/85 hover:text-cream hover:bg-cream/15'
          }`}
        >
          {activeId === cat.id && (
            <motion.div
              layoutId="activeCategory"
              className="absolute inset-0 bg-mustard rounded-lg border-2 border-carbon shadow-[2px_2px_0_var(--color-carbon)]"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span aria-hidden="true">{categoryIcons[cat.name] || <UtensilsCrossed className="w-4 h-4" />}</span>
            <span>{cat.name}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}
