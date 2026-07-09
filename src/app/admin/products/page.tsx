'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, ImageOff } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);

  const load = () => {
    fetch('/api/admin/products')
      .then(r => r.json())
      .then(setProducts)
      .catch(() => {});
  };

  useEffect(load, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PRODUCTOS</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#E85D04] text-white rounded-lg text-sm font-semibold hover:bg-[#d55404] transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </Link>
      </div>

      <div className="space-y-2">
        {products.length === 0 && (
          <p className="text-gray-500 text-center py-8">No hay productos. Crea el primero.</p>
        )}
        {products.map((p) => (
          <div key={p.id} className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#0F0F23] flex items-center justify-center overflow-hidden flex-shrink-0">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <ImageOff className="w-5 h-5 text-gray-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{p.name}</p>
              <p className="text-gray-500 text-xs truncate">{p.category?.name} · {formatPrice(Number(p.basePrice))}{!p.isAvailable && <span className="text-[#EF476F] ml-2">Agotado</span>}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/products/${p.id}`} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                <Edit2 className="w-4 h-4" />
              </Link>
              <button onClick={() => handleDelete(p.id, p.name)} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-[#EF476F] hover:bg-gray-700 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
