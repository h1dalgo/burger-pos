'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, ImageOff, AlertTriangle, Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

interface AdminProduct {
  id: string;
  name: string;
  basePrice: string;
  imageUrl: string | null;
  isAvailable: boolean;
  category?: { name: string } | null;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [error, setError] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/products')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setError(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Producto eliminado');
      setConfirmId(null);
      load();
    } catch {
      toast.error('No se pudo eliminar el producto');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <span className="eyebrow text-burger">Menú</span>
          <h1 className="display text-4xl text-white leading-none mt-1.5">PRODUCTOS</h1>
          <p className="text-sm text-white/40 mt-1">Gestiona el menú del restaurante</p>
        </div>
        <Link href="/admin123/products/new">
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 bg-rose/10 border border-rose/30 text-rose px-4 py-3 rounded-xl text-sm font-semibold mb-4">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            No pudimos cargar los productos
          </span>
          <Button variant="outline" size="sm" className="text-rose" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {products === null && !error ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : products && products.length === 0 ? (
          <EmptyState
            dark
            icon={<ShoppingBag className="w-8 h-8" />}
            title="No hay productos"
            description="Crea el primero con el botón Nuevo."
          />
        ) : (
          products?.map((p) => (
            <div key={p.id} className="card card-dark p-4 flex items-center gap-4 transition-colors hover:bg-white/[0.035]">
              <div className="w-12 h-12 rounded-lg bg-night flex items-center justify-center overflow-hidden shrink-0">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageOff className="w-5 h-5 text-white/25" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                <p className="text-white/40 text-xs truncate">
                  {p.category?.name} · {formatPrice(Number(p.basePrice))}
                  {!p.isAvailable && <span className="text-rose ml-2 font-semibold">Agotado</span>}
                </p>
              </div>

              {confirmId === p.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-white/60 hidden sm:inline">¿Eliminar?</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                  >
                    {deletingId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      'Sí, eliminar'
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/admin123/products/${p.id}`}
                    aria-label={`Editar ${p.name}`}
                    className="p-2 rounded-lg bg-white/8 text-white/60 hover:text-white hover:bg-white/15 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    aria-label={`Eliminar ${p.name}`}
                    onClick={() => setConfirmId(p.id)}
                    className="p-2 rounded-lg bg-white/8 text-white/60 hover:text-rose hover:bg-rose/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
