'use client';

import dynamic from 'next/dynamic';

const KanbanBoard = dynamic(() => import('@/components/kitchen/KanbanBoard'), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-[#0F0F23] flex items-center justify-center">
      <p className="text-gray-500">Conectando...</p>
    </div>
  ),
});

export default function KitchenPage() {
  return <KanbanBoard />;
}
