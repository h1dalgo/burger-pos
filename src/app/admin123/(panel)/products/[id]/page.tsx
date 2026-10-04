'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductForm, { type ProductLike } from '@/components/admin/ProductForm';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductLike | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/products/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setProduct(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8" />}
          title="Producto no encontrado"
          description="Puede haber sido eliminado o el enlace es inválido."
          action={
            <Button variant="primary" size="sm" onClick={() => router.push('/admin123/products')}>
              Volver a Productos
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="display text-4xl text-carbon sign-yellow leading-none">EDITAR PRODUCTO</h1>
      <p className="text-sm text-carbon/65 mt-2 mb-6">Actualiza los datos del producto</p>
      <ProductForm product={product} />
    </div>
  );
}
