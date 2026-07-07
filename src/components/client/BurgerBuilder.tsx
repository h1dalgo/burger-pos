'use client';

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
    <div className="flex flex-col items-center gap-0.5 py-4">
      <div className="w-24 h-5 bg-amber-300 rounded-t-full" />
      {addedExtras.map((extra) => (
        <div
          key={extra.id}
          className="w-28 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-sm animate-pulse"
          title={`+${extra.name}`}
        />
      ))}
      {presentIngredients.map((ing) => (
        <div
          key={ing.id}
          className={cn(
            'w-28 h-3 rounded-sm',
            layerColors[ing.name] || 'bg-gray-300'
          )}
          title={ing.name}
        />
      ))}
      {removedIngredients.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap justify-center">
          {removedIngredients.map((name) => (
            <span key={name} className="text-[10px] text-[#EF476F] line-through">
              {name}
            </span>
          ))}
        </div>
      )}
      <div className="w-24 h-4 bg-amber-300 rounded-b-full mt-0.5" />
    </div>
  );
}
