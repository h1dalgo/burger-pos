'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { DefaultIngredient, ExtraIngredient } from '@/types';
import { cn } from '@/lib/utils';

interface Paint {
  color: string;
  width: string;
  height: string;
  rank: number;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function paintFor(name: string): Paint {
  const n = norm(name);
  if (/(queso|mozzarella|cheddar|parmesano)/.test(n)) {
    return { color: 'bg-mustard', width: 'w-36', height: 'h-4', rank: 2 };
  }
  if (/(carne|pollo|lomito|chorizo|tocineta|tocino|jamon|huevo|chuleta|patt)/.test(n)) {
    return { color: 'bg-carbon', width: 'w-32', height: 'h-5', rank: 1 };
  }
  if (/(tomate|jitomate|salsa|ketchup|bbq|aderezo|mayonesa|mayo|mostaza|mil islas)/.test(n)) {
    return { color: 'bg-burger', width: 'w-28', height: 'h-3', rank: 4 };
  }
  if (/(lechuga|cebolla|pepinillo|champinon|repollo|espinaca|aceituna|maiz|jitote|pepper)/.test(n)) {
    return { color: 'bg-mint', width: 'w-32', height: 'h-4', rank: 3 };
  }
  return { color: 'bg-card', width: 'w-32', height: 'h-3', rank: 3 };
}

interface Layer {
  key: string;
  name: string;
  paint: Paint;
}

interface Props {
  defaultIngredients: DefaultIngredient[];
  removedIngredients: string[];
  addedExtras: ExtraIngredient[];
}

export default function BurgerBuilder({ defaultIngredients, removedIngredients, addedExtras }: Props) {
  if (defaultIngredients.length === 0 && addedExtras.length === 0) return null;

  const layers: Layer[] = [
    ...defaultIngredients
      .filter((ing) => !removedIngredients.includes(ing.name))
      .map((ing) => ({ key: `ing-${ing.id}`, name: ing.name, paint: paintFor(ing.name) })),
    ...addedExtras.map((extra) => ({
      key: `extra-${extra.id}`,
      name: `+${extra.name}`,
      paint: paintFor(extra.name),
    })),
  ].sort((a, b) => b.paint.rank - a.paint.rank);

  return (
    <div className="flex flex-col items-center gap-[3px] py-4" aria-hidden="true">
      <div className="relative w-36 h-7 bg-mustard border-2 border-carbon rounded-t-full -rotate-[0.5deg]">
        <span className="absolute left-4 top-2.5 w-2 h-1 bg-cream rounded-full -rotate-12" />
        <span className="absolute left-1/2 -translate-x-1/2 top-1.5 w-2 h-1 bg-cream rounded-full rotate-6" />
        <span className="absolute right-4 top-2.5 w-2 h-1 bg-cream rounded-full rotate-12" />
      </div>

      <AnimatePresence initial={false}>
        {layers.map((layer, i) => (
          <motion.div
            key={layer.key}
            initial={{ scaleY: 0, opacity: 0, rotate: 0 }}
            animate={{ scaleY: 1, opacity: 1, rotate: i % 2 === 0 ? -0.75 : 0.75 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={cn(
              'origin-bottom rounded-sm border-2 border-carbon',
              layer.paint.color,
              layer.paint.width,
              layer.paint.height
            )}
            title={layer.name}
          />
        ))}
      </AnimatePresence>

      <div className="w-36 h-5 bg-mustard border-2 border-carbon rounded-b-full mt-0.5 rotate-[0.5deg]" />
    </div>
  );
}
