'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { preload } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, UtensilsCrossed, Receipt, Table2, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSessionStore } from '@/store/session-store';
import { useStockStore } from '@/store/stock-store';
import { useCartStore } from '@/store/cart-store';
import { getSocket, joinRoom } from '@/lib/socket-client';
import type { Category, Product, StockUpdate, CartItem } from '@/types';
import { variantFromCategory } from '@/components/client/ProductVisual3D';
import CategoryNav from '@/components/client/CategoryNav';
import ProductCard from '@/components/client/ProductCard';
import ProductModal from '@/components/client/ProductModal';
import CartFloatingButton from '@/components/client/CartFloatingButton';
import CartDrawer from '@/components/client/CartDrawer';
import TablePickerSheet from '@/components/client/TablePickerSheet';
import ServiceSheet from '@/components/client/ServiceSheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function MenuPage() {
  // El navegador pide el menú en paralelo con el JavaScript (el fetch de abajo reutiliza esta respuesta).
  preload('/api/products', { as: 'fetch', crossOrigin: 'anonymous' });
  const router = useRouter();
  const { customerName, tableNumber, lastOrderId, setTableNumber } = useSessionStore();
  const { isProductAvailable, applyStockUpdate, initializeFromProducts } = useStockStore();
  const cartItems = useCartStore((s) => s.items);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [tableCount, setTableCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollLockUntil = useRef(0);

  // Menú continuo: la categoría activa sigue al scroll (como en las apps de delivery).
  useEffect(() => {
    if (!categories.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (Date.now() < scrollLockUntil.current) return;
      // una sección se activa cuando su título entra al cuarto superior de la pantalla
      const offset = (headerRef.current?.offsetHeight ?? 110) + Math.min(160, window.innerHeight * 0.25);
      let current = categories[0].id;
      for (const c of categories) {
        const el = sectionRefs.current[c.id];
        if (el && el.getBoundingClientRect().top - offset <= 0) current = c.id;
      }
      // al llegar al final de la página se marca la última categoría
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        const visible = categories.filter((c) => sectionRefs.current[c.id]);
        if (visible.length) current = visible[visible.length - 1].id;
      }
      setActiveCategory((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [categories]);

  const scrollToCategory = (id: string) => {
    const el = sectionRefs.current[id];
    setActiveCategory(id);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = el.getBoundingClientRect().top + window.scrollY - (headerRef.current?.offsetHeight ?? 110) - 12;
    scrollLockUntil.current = Date.now() + (reduce ? 50 : 900);
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.tableCount === 'number' && d.tableCount > 0) setTableCount(d.tableCount);
      })
      .catch(() => {});
  }, []);

  const handleTableSelect = async (table: string) => {
    const prev = tableNumber;
    setTableNumber(table);
    setTablePickerOpen(false);
    if (prev === table || !lastOrderId) return;
    try {
      const res = await fetch(`/api/orders?displayId=${lastOrderId}`);
      if (!res.ok) return;
      const order = await res.json();
      if (!order || order.status === 'DELIVERED') return;
      const patch = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: table }),
      });
      if (patch.ok) toast.success(`Tu pedido se movió a la mesa ${table}`);
    } catch {
      // el cambio de mesa en la sesión sí se aplicó; el pedido quedó en su mesa anterior
    }
  };

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

  const sections = categories
    .map((c) => ({
      ...c,
      // disponibles primero; los agotados quedan al final de su categoría
      products: [...c.products].sort((a, b) => Number(isProductAvailable(b.id)) - Number(isProductAvailable(a.id))),
    }))
    .filter((c) => c.products.length > 0);
  const isEmptyMenu = !loading && !error && categories.length > 0 && sections.length === 0;
  // "¿Le agregas algo?" en el carrito: bebidas y postres disponibles
  const suggestions = categories
    .filter((c) => ['drink', 'dessert'].includes(variantFromCategory(c.name)))
    .flatMap((c) => c.products)
    .filter((p) => isProductAvailable(p.id));
  const categoryNameOf = (p: Product) => categories.find((c) => c.id === p.categoryId)?.name;

  return (
    <div className="min-h-screen bg-cream pb-28">
      <div ref={headerRef} className="sticky top-0 z-30 bg-burger border-b-2 border-carbon">
        <div className="max-w-5xl mx-auto">
          <header className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setTablePickerOpen(true)}
              aria-label={tableNumber ? `Mesa ${tableNumber}. Toca para cambiar de mesa` : 'Elige mesa'}
              className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold uppercase bg-mustard text-carbon border-2 border-carbon rounded-full px-2.5 py-1 hover:bg-cream transition-colors"
            >
              <Table2 className="w-3.5 h-3.5" />
              {tableNumber ? `Mesa ${tableNumber}` : 'Elige mesa'}
            </button>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={() => setServiceOpen(true)}
                aria-label="Llamar al mesero o pedir cuenta"
                className="w-9 h-9 rounded-full bg-cream border-2 border-carbon flex items-center justify-center text-carbon hover:bg-mustard transition-colors"
              >
                <Bell className="w-4.5 h-4.5" />
              </button>
              {lastOrderId && (
                <button
                  onClick={() => router.push(`/success?orderId=${lastOrderId}`)}
                  className="flex items-center gap-1.5 bg-cream text-carbon border-2 border-carbon rounded-full px-3 py-1.5 text-xs font-bold hover:bg-mustard transition-colors shadow-card tabular-nums"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Mi pedido #{String(lastOrderId).padStart(4, '0')}
                </button>
              )}
            </div>
          </header>

          {!loading && !error && categories.length > 0 && (
            <CategoryNav
              categories={categories}
              activeId={activeCategory}
              onSelect={scrollToCategory}
            />
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <p className="display text-xl text-carbon sign-yellow mb-3">
          {customerName ? `¡Hola, ${customerName}!` : '¿Qué se te antoja hoy?'}
        </p>
        {loading && (
          <div aria-busy="true" aria-label="Cargando menú">
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                // misma forma que una tarjeta de producto: foto, nombre, descripción y precio
                <div key={i} className="flex items-start gap-3.5 rounded-2xl border-2 border-carbon/10 bg-card p-4">
                  <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="mt-1 h-7 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
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

        {isEmptyMenu && (
          <EmptyState
            icon={<UtensilsCrossed className="w-7 h-7" />}
            title="El menú está vacío"
            description="Vuelve a intentarlo en un momento"
          />
        )}

        {!loading &&
          !error &&
          sections.map((cat, ci) => (
            <section
              key={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
              aria-labelledby={`cat-title-${cat.id}`}
              className={ci > 0 ? 'pt-7' : ''}
            >
              <h2 id={`cat-title-${cat.id}`} className="display text-lg text-carbon mb-3">
                {cat.name}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {cat.products.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isAvailable={isProductAvailable(product.id)}
                    onSelect={setSelectedProduct}
                    index={i}
                    entrance={ci === 0}
                  />
                ))}
              </div>
            </section>
          ))}
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
            categoryName={categoryNameOf(selectedProduct)}
            stacked={cartOpen}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onRequireTable={() => setTablePickerOpen(true)}
        onEditItem={setEditingItem}
        onOpenProduct={setSelectedProduct}
        suggestions={suggestions}
        variantOf={(p) => variantFromCategory(categoryNameOf(p))}
      />

      {/* Editar un producto desde el carrito (encima del carrito) */}
      <AnimatePresence>
        {editingItem && (
          <ProductModal
            key={`edit-${editingItem.id}`}
            product={editingItem.product}
            categoryName={categoryNameOf(editingItem.product)}
            editItem={editingItem}
            stacked
            onClose={() => setEditingItem(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tablePickerOpen && (
          <TablePickerSheet
            onClose={() => setTablePickerOpen(false)}
            tableCount={tableCount}
            current={tableNumber}
            onSelect={handleTableSelect}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {serviceOpen && (
          <ServiceSheet
            onClose={() => setServiceOpen(false)}
            onPickTable={() => setTablePickerOpen(true)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
