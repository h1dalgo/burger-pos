'use client';

import dynamic from 'next/dynamic';
import { ChefHat } from 'lucide-react';

const KanbanBoard = dynamic(() => import('@/components/kitchen/KanbanBoard'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center flex-col gap-4">
      <div className="w-12 h-12 rounded-xl border border-burger/40 bg-burger/10 flex items-center justify-center">
        <ChefHat className="w-6 h-6 text-burger" strokeWidth={1.6} />
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
