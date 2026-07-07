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
    <nav className="flex overflow-x-auto gap-1 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-20">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeId === cat.id
              ? 'text-white'
              : 'text-[#2B2D42]/60 hover:text-[#2B2D42] hover:bg-gray-100'
          }`}
        >
          {activeId === cat.id && (
            <motion.div
              layoutId="activeCategory"
              className="absolute inset-0 bg-[#E85D04] rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span>{categoryIcons[cat.name] || '📋'}</span>
            <span>{cat.name.split(' ')[0]}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}
