'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/products/${id}`)
      .then(r => r.json())
      .then(data => { setProduct(data); setLoading(false); })
      .catch(() => { router.push('/admin/products'); });
  }, [id, router]);

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (!product) return <p className="text-[#EF476F]">Producto no encontrado</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>EDITAR PRODUCTO</h1>
      <ProductForm product={product} />
    </div>
  );
}
