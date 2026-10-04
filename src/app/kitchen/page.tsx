'use client';

import dynamic from 'next/dynamic';
import { ChefHat } from 'lucide-react';

const KanbanBoard = dynamic(() => import('@/components/kitchen/KanbanBoard'), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-cream flex items-center justify-center flex-col gap-4">
      <div className="w-12 h-12 rounded-xl bg-mustard border-2 border-carbon flex items-center justify-center">
        <ChefHat className="w-6 h-6 text-carbon" />
      </div>
      <p className="text-carbon/60 text-sm font-semibold uppercase tracking-widest">
        Conectando con cocina...
      </p>
    </div>
  ),
});

export default function KitchenPage() {
  return <KanbanBoard />;
}
