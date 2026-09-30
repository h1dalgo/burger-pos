'use client';

import dynamic from 'next/dynamic';
import { ChefHat } from 'lucide-react';

const KanbanBoard = dynamic(() => import('@/components/kitchen/KanbanBoard'), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-night flex items-center justify-center flex-col gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-burger to-mustard flex items-center justify-center shadow-pop">
        <ChefHat className="w-6 h-6 text-white" />
      </div>
      <p className="text-white/40 text-sm font-semibold uppercase tracking-widest">
        Conectando con cocina...
      </p>
    </div>
  ),
});

export default function KitchenPage() {
  return <KanbanBoard />;
}
