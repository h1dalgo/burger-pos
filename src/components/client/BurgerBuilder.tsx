'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { DefaultIngredient, ExtraIngredient } from '@/types';
import { cn } from '@/lib/utils';

const layerColors: Record<string, string> = {
  'Pan': 'bg-amber-300',
  'Carne': 'bg-amber-800',
  'Pollo': 'bg-yellow-600',
  'Queso': 'bg-yellow-300',
  'Tocino': 'bg-red-700',
  'Tocineta': 'bg-red-700',
  'Lechuga': 'bg-green-400',
  'Tomate': 'bg-red-400',
  'Cebolla': 'bg-purple-300',
  'Pepinillos': 'bg-green-600',
  'Champiñones': 'bg-stone-400',
  'Chorizo': 'bg-red-600',
  'Huevo': 'bg-yellow-200',
  'Maíz': 'bg-amber-400',
};

interface Props {
  defaultIngredients: DefaultIngredient[];
  removedIngredients: string[];
  addedExtras: ExtraIngredient[];
}

export default function BurgerBuilder({ defaultIngredients, removedIngredients, addedExtras }: Props) {
  const presentIngredients = defaultIngredients.filter(
    (ing) => !removedIngredients.includes(ing.name)
  );

  return (
    <div className="flex flex-col items-center gap-0.5 py-4" aria-hidden="true">
      <div className="w-32 h-6 bg-gradient-to-b from-amber-200 to-amber-300 rounded-t-full shadow-sm" />
      <AnimatePresence initial={false}>
        {addedExtras.map((extra) => (
          <motion.div
            key={`extra-${extra.id}`}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-28 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-sm"
            title={`+${extra.name}`}
          />
        ))}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {presentIngredients.map((ing) => (
          <motion.div
            key={ing.id}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn('w-28 h-3 rounded-sm', layerColors[ing.name] || 'bg-carbon/20')}
            title={ing.name}
          />
        ))}
      </AnimatePresence>
      {removedIngredients.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap justify-center">
          {removedIngredients.map((name) => (
            <span key={name} className="text-xs text-rose line-through">
              {name}
            </span>
          ))}
        </div>
      )}
      <div className="w-32 h-5 bg-gradient-to-t from-amber-200 to-amber-300 rounded-b-full mt-0.5 shadow-sm" />
    </div>
  );
}
