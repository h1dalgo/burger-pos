'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, UtensilsCrossed, Receipt } from 'lucide-react';
import { useSessionStore, useSessionHydrated } from '@/store/session-store';
import { useStockStore } from '@/store/stock-store';
import { useCartStore } from '@/store/cart-store';
import { getSocket, joinRoom } from '@/lib/socket-client';
import type { Category, Product, StockUpdate } from '@/types';
import CategoryNav from '@/components/client/CategoryNav';
import ProductCard from '@/components/client/ProductCard';
import ProductModal from '@/components/client/ProductModal';
import CartFloatingButton from '@/components/client/CartFloatingButton';
import CartDrawer from '@/components/client/CartDrawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function MenuPage() {
  const router = useRouter();
  const { customerName, tableNumber, lastOrderId } = useSessionStore();
  const sessionHydrated = useSessionHydrated();
  const { isProductAvailable, applyStockUpdate, initializeFromProducts } = useStockStore();
  const cartItems = useCartStore((s) => s.items);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    if (!sessionHydrated) return;
    if (!customerName || !tableNumber) {
      router.push('/');
      return;
    }
  }, [sessionHydrated, customerName, tableNumber, router]);

  const fetchMenu = useCallback(() => {
    fetch('/api/products')
      .then((r) => {
        if (!r.ok) throw new Error('No pudimos cargar el menú');
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
    fetchMenu();
  }, [fetchMenu]);

  const retryLoad = () => {
    setLoading(true);
    setError('');
    fetchMenu();
  };

  useEffect(() => {
    const socket = getSocket();
    joinRoom('clients');
    const onStock = (update: StockUpdate) => applyStockUpdate(update);
    socket.on('stock:updated', onStock);
    return () => {
      socket.off('stock:updated', onStock);
    };
  }, [applyStockUpdate]);

  const activeCategoryData = categories.find((c) => c.id === activeCategory);
  const activeProducts = activeCategoryData?.products.filter((p) => isProductAvailable(p.id)) || [];
  const unavailableInCategory = activeCategoryData?.products.filter((p) => !isProductAvailable(p.id)) || [];
  const isEmptyCategory = !loading && !error && !!activeCategoryData && activeProducts.length === 0 && unavailableInCategory.length === 0;

  return (
    <div className="min-h-screen bg-cream pb-28">
      <div className="sticky top-0 z-30 bg-burger border-b-2 border-carbon">
        <div className="max-w-5xl mx-auto">
          <header className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              aria-label="Volver al inicio"
              className="w-9 h-9 -ml-1.5 rounded-full bg-cream border-2 border-carbon flex items-center justify-center text-carbon hover:bg-mustard transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex items-center gap-2.5">
              <span className="shrink-0 text-[11px] font-bold uppercase bg-mustard text-carbon border-2 border-carbon rounded-full px-2.5 py-1 tabular-nums">
                Mesa {tableNumber}
              </span>
              <p className="display text-xl text-cream sign truncate">¡Hola, {customerName}!</p>
            </div>
            {lastOrderId && (
              <button
                onClick={() => router.push(`/success?orderId=${lastOrderId}`)}
                className="ml-auto shrink-0 flex items-center gap-1.5 bg-cream text-carbon border-2 border-carbon rounded-full px-3 py-1.5 text-xs font-bold hover:bg-mustard transition-colors shadow-card tabular-nums"
              >
                <Receipt className="w-3.5 h-3.5" />
                Mi pedido #{String(lastOrderId).padStart(4, '0')}
              </button>
            )}
          </header>

          {!loading && !error && categories.length > 0 && (
            <CategoryNav
              categories={categories}
              activeId={activeCategory}
              onSelect={(id) => {
                setActiveCategory(id);
                setFirstLoad(false);
              }}
            />
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        )}

        {error && (
          <EmptyState
            icon={<AlertTriangle className="w-7 h-7" />}
            title="No pudimos cargar el menú"
            description={error}
            action={
              <Button variant="solid" onClick={retryLoad}>
                Reintentar
              </Button>
            }
          />
        )}

        {!loading && !error && isEmptyCategory && (
          <EmptyState
            icon={<UtensilsCrossed className="w-7 h-7" />}
            title="Sin productos aquí"
            description="Prueba con otra categoría"
          />
        )}

        {!loading && !error && (activeProducts.length > 0 || unavailableInCategory.length > 0) && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {activeProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isAvailable={isProductAvailable(product.id)}
                  onSelect={setSelectedProduct}
                  index={i}
                  entrance={firstLoad}
                />
              ))}
            </div>

            {unavailableInCategory.length > 0 && (
              <div className="pt-2">
                <span className="badge badge-neutral mb-3">
                  No disponibles
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {unavailableInCategory.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isAvailable={false}
                      onSelect={setSelectedProduct}
                      index={i}
                      entrance={firstLoad}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {cartItems.length > 0 && (
          <CartFloatingButton key="fab" onClick={() => setCartOpen(true)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            key={selectedProduct.id}
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
