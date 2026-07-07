'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { useStockStore } from '@/store/stock-store';
import { getSocket } from '@/lib/socket-client';
import type { Category, Product, StockUpdate } from '@/types';
import CategoryNav from '@/components/client/CategoryNav';
import ProductCard from '@/components/client/ProductCard';
import ProductModal from '@/components/client/ProductModal';
import CartFloatingButton from '@/components/client/CartFloatingButton';
import CartDrawer from '@/components/client/CartDrawer';

export default function MenuPage() {
  const router = useRouter();
  const { customerName, tableNumber } = useSessionStore();
  const { isProductAvailable, applyStockUpdate, initializeFromProducts } = useStockStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!customerName || !tableNumber) {
      router.push('/');
      return;
    }
  }, [customerName, tableNumber, router]);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('/api/products')
      .then((r) => {
        if (!r.ok) throw new Error('Error al cargar el menú');
        return r.json();
      })
      .then((data: Category[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('El menú está vacío');
        }
        setCategories(data);
        setActiveCategory(data[0].id);
        const products = data.flatMap((c: Category) =>
          c.products.map((p) => ({
            id: p.id,
            isAvailable: p.isAvailable,
            variations: p.variations.map((v) => ({ id: v.id, isAvailable: v.isAvailable })),
          }))
        );
        initializeFromProducts(products);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [initializeFromProducts]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:clients');
    socket.on('stock:updated', (update: StockUpdate) => {
      applyStockUpdate(update);
    });
    return () => {
      socket.off('stock:updated');
    };
  }, [applyStockUpdate]);

  const activeProducts = categories
    .find((c) => c.id === activeCategory)
    ?.products.filter((p) => isProductAvailable(p.id)) || [];

  const unavailableInCategory = categories
    .find((c) => c.id === activeCategory)
    ?.products.filter((p) => !isProductAvailable(p.id)) || [];

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-24">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => router.push('/')} className="text-[#2B2D42]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-[#2B2D42]/60">Mesa {tableNumber}</p>
          <p className="font-semibold text-sm text-[#2B2D42]">¡Hola, {customerName}!</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#E85D04]/30 border-t-[#E85D04] rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-[#EF476F] font-semibold mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#E85D04] text-white rounded-xl text-sm font-semibold"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <CategoryNav
          categories={categories}
          activeId={activeCategory}
          onSelect={setActiveCategory}
        />
      )}

      <div className="px-4 py-4 space-y-3">
        {activeProducts.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            isAvailable={isProductAvailable(product.id)}
            onSelect={setSelectedProduct}
            index={i}
          />
        ))}
        {unavailableInCategory.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            isAvailable={false}
            onSelect={setSelectedProduct}
            index={i}
          />
        ))}
      </div>

      <CartFloatingButton onClick={() => setCartOpen(true)} />

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
