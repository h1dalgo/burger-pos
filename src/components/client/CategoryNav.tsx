'use client';

import { motion } from 'framer-motion';

const categoryIcons: Record<string, string> = {
  'ENTRADAS Y COMBOS ESPECIALES': '🍟',
  'HAMBURGUESAS': '🍔',
  'BEBIDAS': '🥤',
  'POSTRES': '🍰',
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
      className="flex overflow-x-auto scrollbar-none gap-1 px-4 pb-2.5"
    >
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          aria-pressed={activeId === cat.id}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeId === cat.id
              ? 'text-white'
              : 'text-carbon/60 hover:text-carbon hover:bg-carbon/5'
          }`}
        >
          {activeId === cat.id && (
            <motion.div
              layoutId="activeCategory"
              className="absolute inset-0 bg-burger rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span aria-hidden="true">{categoryIcons[cat.name] || '📋'}</span>
            <span>{cat.name}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}
