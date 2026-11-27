'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { preloadPizzaPhotos } from '@/lib/preload-food';
import { preload } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, UtensilsCrossed, Receipt, Table2, Bell, Clock, Sparkles, SearchX } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSessionStore } from '@/store/session-store';
import { useStockStore } from '@/store/stock-store';
import { useCartStore } from '@/store/cart-store';
import { useBusinessStore } from '@/store/business-store';
import { getSocket, joinRoom } from '@/lib/socket-client';
import type { Category, Product, StockUpdate, CartItem } from '@/types';
import { variantFromCategory } from '@/components/client/ProductVisual3D';
import { categorySubtitle, sentenceCase, formatPersonName } from '@/lib/category-copy';
import CategoryNav from '@/components/client/CategoryNav';
import ProductCard from '@/components/client/ProductCard';
import MenuSearch from '@/components/client/MenuSearch';
import MenuShowcase, { type ShowcaseSlide } from '@/components/client/MenuShowcase';
import ProductModal from '@/components/client/ProductModal';
import CartFloatingButton from '@/components/client/CartFloatingButton';
import CartDrawer from '@/components/client/CartDrawer';
import TablePickerSheet from '@/components/client/TablePickerSheet';
import ServiceSheet from '@/components/client/ServiceSheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import ShinyText from '@/components/reactbits/ShinyText';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

/** Minúsculas y sin acentos (buscar "jamon" encuentra "jamón"). */
const normText = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function MenuPage() {
  // El navegador pide el menú en paralelo con el JavaScript (el fetch de abajo reutiliza esta respuesta).
  preload('/api/products', { as: 'fetch', crossOrigin: 'anonymous' });
  const router = useRouter();
  const { customerName, tableNumber, lastOrderId, setTableNumber } = useSessionStore();
  const [query, setQuery] = useState('');
  /** Alérgenos a evitar (filtros "Sin gluten", "Sin lácteos"…). */
  const [avoid, setAvoid] = useState<string[]>([]);
  const { isProductAvailable, applyStockUpdate, initializeFromProducts } = useStockStore();
  const cartItems = useCartStore((s) => s.items);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
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

  const contentRef = useRef<HTMLDivElement>(null);
  const business = useBusinessStore((s) => s.settings);
  const loadBusiness = useBusinessStore((s) => s.load);
  useEffect(() => {
    void loadBusiness();
  }, [loadBusiness]);
  const tableCount = business && business.tableCount > 0 ? business.tableCount : 10;

  // si hay pizzas en el menú, sus fotos 3D se bajan en un rato libre (al abrir una, ya están)
  useEffect(() => {
    if (!categories.some((c) => variantFromCategory(c.name) === 'pizza')) return;
    const t = setTimeout(preloadPizzaPhotos, 1500);
    return () => clearTimeout(t);
  }, [categories]);

  // "Repetir pedido" desde el seguimiento abre el carrito al llegar
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('cart') !== '1') return;
    window.history.replaceState(null, '', '/menu');
    const t = setTimeout(() => setCartOpen(true), 0);
    return () => clearTimeout(t);
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
        body: JSON.stringify({ tableNumber: table, actor: 'Cliente' }),
      });
      if (patch.ok) toast.success(`Tu pedido se movió a la mesa ${table}`);
    } catch {
      // el cambio de mesa en la sesión sí se aplicó; el pedido quedó en su mesa anterior
    }
  };

  const fetchMenu = useCallback((silent = false) => {
    fetch('/api/products', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('No pudimos cargar el menú');
        return r.json();
      })
      .then((data: Category[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('El menú está vacío');
        }
        setCategories(data);
        if (!silent) setActiveCategory(data[0].id);
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
        if (silent) return;
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
    // inventario: se acabó (o se repuso) un insumo
    const onRefresh = () => fetchMenu(true);
    socket.on('stock:updated', onStock);
    socket.on('stock:refresh', onRefresh);
    return () => {
      socket.off('stock:updated', onStock);
      socket.off('stock:refresh', onRefresh);
    };
  }, [applyStockUpdate, fetchMenu]);

  const sections = categories
    .map((c) => ({
      ...c,
      // disponibles primero; los agotados quedan al final de su categoría
      products: [...c.products].sort((a, b) => Number(isProductAvailable(b.id)) - Number(isProductAvailable(a.id))),
    }))
    .filter((c) => c.products.length > 0);
  const isEmptyMenu = !loading && !error && categories.length > 0 && sections.length === 0;

  // ── Buscador y filtros "Sin …" ──
  const q = normText(query.trim());
  const searching = q.length > 0 || avoid.length > 0;
  const matches = (p: Product, catName: string) => {
    const al = (p.allergens ?? []).map(normText);
    if (avoid.some((a) => al.includes(normText(a)))) return false;
    if (!q) return true;
    const hay = normText([p.name, p.description ?? '', catName, ...p.defaultIngredients.map((d) => d.name)].join(' '));
    return q.split(/\s+/).every((w) => hay.includes(w));
  };
  const visibleSections = searching
    ? sections.map((c) => ({ ...c, products: c.products.filter((p) => matches(p, c.name)) })).filter((c) => c.products.length > 0)
    : sections;
  const resultCount = visibleSections.reduce((n, c) => n + c.products.length, 0);
  // alérgenos más comunes del menú → filtros rápidos (máx. 5)
  const allergenOptions = (() => {
    const count = new Map<string, number>();
    for (const c of sections) for (const p of c.products) for (const a of p.allergens ?? []) count.set(a, (count.get(a) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a]) => a);
  })();
  // piezas 3D de todas las hamburguesas: se preparan en ratos libres (cambios y detalle sin tirones)
  const burgerPrewarm = categories
    .filter((c) => variantFromCategory(c.name) === 'burger')
    .flatMap((c) => c.products)
    .map((p) => [...p.variations.map((v) => v.name), ...p.defaultIngredients.map((d) => d.name)]);
  // secciones y tarjetas aparecen al entrar en pantalla (GSAP + ScrollTrigger)
  useScrollReveal(contentRef, [loading, visibleSections.length, resultCount, searching]);
  // "¿Le agregas algo?" en el carrito: bebidas y postres disponibles
  const suggestions = categories
    .filter((c) => ['drink', 'dessert'].includes(variantFromCategory(c.name)))
    .flatMap((c) => c.products)
    .filter((p) => isProductAvailable(p.id));
  const categoryNameOf = (p: Product) => categories.find((c) => c.id === p.categoryId)?.name;

  // Escaparate: los productos marcados como destacados; si no hay ninguno,
  // las primeras hamburguesas + una bebida + un postre.
  const showcase: ShowcaseSlide[] = (() => {
    const all = categories.flatMap((c) =>
      c.products.filter((p) => isProductAvailable(p.id)).map((p) => ({ product: p, categoryName: c.name, variant: variantFromCategory(c.name) }))
    );
    const marked = all.filter((s) => s.product.isFeatured);
    if (marked.length) return marked.slice(0, 6);
    const pick = (v: string) => all.filter((s) => s.variant === v);
    return [...pick('burger').slice(0, 3), ...pick('pizza').slice(0, 1), ...pick('sushi').slice(0, 1), ...pick('drink').slice(0, 1), ...pick('dessert').slice(0, 1)];
  })();

  return (
    <div className="min-h-screen pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <div ref={headerRef} className="safe-top sticky top-0 z-30 border-b border-carbon/10 bg-cream/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="max-w-5xl mx-auto">
          <header className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setTablePickerOpen(true)}
              aria-label={tableNumber ? `Mesa ${tableNumber}. Toca para cambiar de mesa` : 'Elige mesa'}
              className="shrink-0 flex items-center gap-1.5 rounded-full border border-carbon/15 bg-carbon/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-carbon/85 transition-colors hover:border-burger/50 hover:text-carbon"
            >
              <Table2 className="w-3.5 h-3.5 text-burger" />
              {tableNumber ? `Mesa ${tableNumber}` : 'Elige mesa'}
            </button>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                onClick={() => setServiceOpen(true)}
                aria-label="Llamar al mesero o pedir cuenta"
                className="w-9 h-9 rounded-full border border-carbon/15 bg-carbon/[0.04] flex items-center justify-center text-carbon/85 transition-colors hover:border-burger/50 hover:text-carbon"
              >
                <Bell className="w-4.5 h-4.5" />
              </button>
              {lastOrderId && (
                <button
                  onClick={() => router.push(`/success?orderId=${lastOrderId}`)}
                  className="flex items-center gap-1.5 rounded-full border border-burger/40 bg-burger/10 px-3 py-1.5 text-xs font-semibold text-burger-dark transition-colors hover:bg-burger/20 tabular-nums"
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

      <div ref={contentRef} className="max-w-5xl mx-auto px-4 pt-7 pb-4">
        {/* Saludo: línea discreta con nombre y mesa + titular */}
        <div className="mb-7">
          {(customerName || tableNumber) && (
            <p className="eyebrow mb-2">
              {[customerName && `Hola, ${formatPersonName(customerName)}`, tableNumber && `Mesa ${tableNumber}`].filter(Boolean).join(' · ')}
            </p>
          )}
          <h1 className="display text-[2.1rem] leading-[1.05] text-carbon sm:text-5xl">
            ¿Qué se te{' '}
            <em className="italic">
              <ShinyText text="antoja" color="#e2bd7e" shineColor="#fff3dc" speed={1.6} delay={0.5} trigger="view" glow={0.35} />
            </em>{' '}
            hoy?
          </h1>
          {business && !business.open && (
            <p className="mt-4 flex items-center gap-2 rounded-2xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm font-semibold text-rose" role="status">
              <Clock className="h-4 w-4 shrink-0" />
              {business.message || 'Estamos cerrados por ahora'}. Puedes ver el menú, pero no enviar pedidos.
            </p>
          )}
          {business?.open && business.promotions.length > 0 && (
            <div className="mt-4 space-y-2">
              {business.promotions.map((p) => {
                const cat = p.categoryId ? categories.find((c) => c.id === p.categoryId)?.name : null;
                return (
                  <p key={p.id} className="flex items-center gap-2 rounded-2xl border border-burger/35 bg-burger/[0.08] px-4 py-3 text-sm text-carbon">
                    <Sparkles className="h-4 w-4 shrink-0 text-burger" />
                    <span>
                      <b className="font-semibold text-burger-dark">{p.name}:</b>{' '}
                      {p.type === 'PERCENT' ? `${p.value}% de descuento` : `$${p.value.toFixed(2)} de descuento`}
                      {cat ? ` en ${sentenceCase(cat).toLowerCase()}` : ''}
                      {p.minTotal > 0 ? ` desde $${p.minTotal.toFixed(2)}` : ''}
                    </span>
                  </p>
                );
              })}
            </div>
          )}
        </div>
        {loading && (
          <div aria-busy="true" aria-label="Cargando menú">
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                // misma forma que una tarjeta de producto: foto, nombre, descripción y precio
                <div key={i} className="card flex items-start gap-3.5 p-4">
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

        {!loading && !error && sections.length > 0 && (
          <MenuSearch
            query={query}
            onQuery={setQuery}
            allergens={allergenOptions}
            avoid={avoid}
            onToggleAvoid={(a) => setAvoid((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))}
          />
        )}

        {searching && !loading && !error && (
          resultCount > 0 ? (
            <p className="mb-5 text-sm text-carbon/60" role="status">
              {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
            </p>
          ) : (
            <EmptyState
              icon={<SearchX className="w-7 h-7" />}
              title="No encontramos eso"
              description={avoid.length ? 'Prueba con otra palabra o quita algún filtro.' : 'Prueba con otra palabra.'}
              action={
                <Button
                  variant="solid"
                  onClick={() => {
                    setQuery('');
                    setAvoid([]);
                  }}
                >
                  Ver todo el menú
                </Button>
              }
            />
          )
        )}

        {!loading && !error && !searching && showcase.length > 0 && (
          <MenuShowcase
            slides={showcase}
            onOpen={setSelectedProduct}
            paused={!!selectedProduct || !!editingItem || cartOpen}
            prewarm={burgerPrewarm}
          />
        )}

        {!loading &&
          !error &&
          visibleSections.map((cat, ci) => (
            <section
              key={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
              aria-labelledby={`cat-title-${cat.id}`}
              className={ci > 0 ? 'pt-12' : ''}
            >
              {/* Encabezado: etiqueta de categoría + subtítulo + subrayado de marca */}
              <h2 id={`cat-title-${cat.id}`} className="mb-5">
                <span data-reveal className="eyebrow block">
                  {sentenceCase(cat.name)}
                </span>
                <span className="sr-only"> — </span>
                <span data-reveal className="display mt-1 block text-[1.6rem] leading-tight text-carbon">{categorySubtitle(cat.name)}</span>
                <span aria-hidden="true" data-reveal-line className="mt-3 block h-px w-12 bg-gradient-to-r from-burger to-transparent" />
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
