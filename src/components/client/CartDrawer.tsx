'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { X, Trash2, Minus, Plus, ShoppingBag, StickyNote, Pencil, Table2, Check, ImageIcon, Tag as TagIcon, RotateCcw, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { CartItem, Product } from '@/types';
import { useCartStore } from '@/store/cart-store';
import { useSessionStore } from '@/store/session-store';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AnimatedPrice } from '@/components/ui/AnimatedPrice';
import { EmptyState } from '@/components/ui/EmptyState';
import PaymentSelector from './PaymentSelector';
import { canQuickAdd } from './ProductCard';
import { savePreview, type PreviewVariant } from '@/lib/order-preview';
import { cldUrl } from '@/lib/cloudinary';
import { useBusinessStore } from '@/store/business-store';
import { PriceBs } from '@/components/ui/PriceBs';
import PagoMovilPanel from './PagoMovilPanel';
import SplitBill from './SplitBill';
import { reorder } from '@/lib/reorder';
import type { Order } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Abre el selector de mesa (encima del carrito). */
  onRequireTable?: () => void;
  /** Editar un producto ya agregado (abre su modal con sus opciones). */
  onEditItem?: (item: CartItem) => void;
  /** Abrir un producto sugerido que necesita elegir opciones. */
  onOpenProduct?: (product: Product) => void;
  /** Sugerencias ("¿Le agregas algo?"): normalmente bebidas y postres. */
  suggestions?: Product[];
  /** Tipo de producto (hamburguesa, bebida…) para la vista 3D del seguimiento. */
  variantOf?: (product: Product) => PreviewVariant;
}

export default function CartDrawer({ isOpen, onClose, onRequireTable, onEditItem, onOpenProduct, suggestions = [], variantOf }: Props) {
  const router = useRouter();
  const { items, removeItem, restoreItem, updateQuantity, addSimple, paymentMethod, setPaymentMethod, getTotalAmount, clearCart } =
    useCartStore();
  const getItemPrice = useCartStore((s) => s.getItemPrice);
  const tableNumber = useSessionStore((s) => s.tableNumber);
  const savedName = useSessionStore((s) => s.customerName);
  const setCustomerName = useSessionStore((s) => s.setCustomerName);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [tipPct, setTipPct] = useState(0);
  const [name, setName] = useState<string | null>(null); // null = usar el guardado
  const [nameError, setNameError] = useState('');
  const nameValue = name ?? savedName;
  const [reference, setReference] = useState('');
  const [refError, setRefError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState<{ discount: number; label: string | null; couponError?: string }>({ discount: 0, label: null });
  const [reordering, setReordering] = useState(false);
  const savedEmail = useSessionStore((s) => s.customerEmail);
  const savedDoc = useSessionStore((s) => s.customerDoc);
  const [email, setEmail] = useState<string | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const emailValue = email ?? savedEmail;
  const docValue = doc ?? savedDoc;
  const business = useBusinessStore((s) => s.settings);
  const loadBusiness = useBusinessStore((s) => s.load);
  const lastOrderId = useSessionStore((s) => s.lastOrderId);
  const closed = business ? !business.open : false;

  const subtotal = getTotalAmount();
  const discount = Math.min(quote.discount, subtotal);
  const tipAmount = Math.round(subtotal * tipPct) / 100;
  const grandTotal = Math.max(0, subtotal - discount) + tipAmount;
  const totalCount = items.reduce((n, i) => n + i.quantity, 0);
  const inCart = new Set(items.map((i) => i.product.id));
  const offers = suggestions.filter((p) => !inCart.has(p.id)).slice(0, 6);

  useEffect(() => {
    if (isOpen) void loadBusiness(true);
  }, [isOpen, loadBusiness]);

  // Descuento vigente (happy hour) o cupón: lo calcula el servidor
  const quoteKey = items.map((i) => `${i.product.id}:${getItemPrice(i) * i.quantity}`).join('|') + '#' + coupon;
  useEffect(() => {
    if (!isOpen || !items.length) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch('/api/promotions/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map((i) => ({ productId: i.product.id, subtotal: getItemPrice(i) * i.quantity })), code: coupon || null }),
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((q) => setQuote({ discount: Number(q.discount) || 0, label: q.label ?? null, couponError: q.couponError }))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quoteKey]);

  const repeatLast = async () => {
    if (!lastOrderId) return;
    setReordering(true);
    try {
      const res = await fetch(`/api/orders?displayId=${lastOrderId}`, { cache: 'no-store' });
      const order: Order | null = res.ok ? await res.json() : null;
      if (!order) throw new Error();
      const r = await reorder(order);
      if (r.added) toast.success(r.skipped.length ? `Agregado. Ya no hay: ${r.skipped.join(', ')}` : 'Tu último pedido está en el carrito');
      else toast.error('Esos productos ya no están disponibles');
    } catch {
      toast.error('No se pudo cargar tu último pedido');
    } finally {
      setReordering(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // si hay otra ventana encima (producto, mesa…), Escape cierra solo esa
      if (document.querySelectorAll('[aria-modal="true"]').length > 1) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /** Quita un producto y ofrece "Deshacer" durante unos segundos. */
  const removeWithUndo = (item: CartItem) => {
    const index = useCartStore.getState().items.findIndex((i) => i.id === item.id);
    removeItem(item.id);
    if (typeof navigator !== 'undefined') navigator.vibrate?.(10);
    toast(
      (t) => (
        <span className="flex items-center gap-3 text-sm">
          <span>
            <b>{item.product.name}</b> eliminado
          </span>
          <button
            onClick={() => {
              restoreItem(item, index);
              toast.dismiss(t.id);
            }}
            className="rounded-full bg-[#d8ad66] px-2.5 py-0.5 text-xs font-bold text-[#17110a]"
          >
            Deshacer
          </button>
        </span>
      ),
      { id: `undo-${item.id}`, duration: 4500 }
    );
  };

  const handleSubmit = async () => {
    const cleanName = nameValue.trim();
    if (!cleanName) {
      setNameError('Escribe tu nombre para que te llamemos');
      return;
    }
    if (/\d/.test(cleanName)) {
      setNameError('El nombre no puede contener números');
      return;
    }
    setCustomerName(cleanName);
    if (!paymentMethod) {
      setError('Selecciona un método de pago');
      return;
    }
    // la mesa guardada pudo caducar mientras la app estaba abierta
    const table = useSessionStore.getState().freshTable();
    if (!table) {
      setError('Elige tu mesa para enviar el pedido');
      onRequireTable?.(); // el selector se abre encima del carrito
      return;
    }
    if (closed) {
      setError(business?.message || 'Estamos cerrados por ahora');
      return;
    }
    if (paymentMethod === 'MOBILE_PAYMENT' && reference.length < 4) {
      setRefError('Escribe al menos los últimos 4 dígitos de la referencia');
      return;
    }
    if (coupon && quote.couponError) {
      setError(quote.couponError);
      return;
    }
    const cleanEmail = emailValue.trim().toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setEmailError('Revisa el correo (ej. nombre@gmail.com)');
      return;
    }
    useSessionStore.getState().setReceiptData(cleanEmail, docValue.trim().toUpperCase());
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        customerName: cleanName,
        tableNumber: table,
        paymentMethod,
        paymentReference: paymentMethod === 'MOBILE_PAYMENT' ? reference : undefined,
        couponCode: coupon || undefined,
        customerEmail: cleanEmail || undefined,
        customerDoc: docValue.trim() || undefined,
        tip: tipAmount,
        items: items.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          basePrice: item.product.basePrice,
          quantity: item.quantity,
          variation: item.variation,
          removedIngredients: item.removedIngredients,
          addedExtras: item.addedExtras,
          selections: item.selections,
          selectionLabels: item.selectionLabels,
          note: item.note ?? null,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Error al enviar el pedido');
      }

      const order = await res.json();

      useSessionStore.getState().setLastOrderId(String(order.displayId));
      savePreview(String(order.displayId), items, (i) => variantOf?.(i.product) ?? 'burger');
      const { joinRoom } = await import('@/lib/socket-client');
      joinRoom('clients');

      // confirmación visible un instante antes de pasar al seguimiento
      setSent(true);
      if (typeof navigator !== 'undefined') navigator.vibrate?.([12, 40, 12]);
      await new Promise((r) => setTimeout(r, 550));
      clearCart();
      setReference('');
      setCoupon('');
      setCouponInput('');
      router.push(`/success?orderId=${order.displayId}`);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Error al enviar el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[3px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tu pedido"
            className="absolute bottom-0 left-0 right-0 sm:max-w-lg sm:mx-auto max-h-[88vh] bg-card border-t border-carbon/10 rounded-t-[1.75rem] overflow-y-auto overscroll-contain flex flex-col"
          >
            {/* Encabezado: título, mesa y cerrar */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl px-6 pt-5 pb-3 border-b-2 border-carbon flex items-center gap-3">
              <div className="min-w-0">
                <h2 className="display text-2xl leading-tight text-carbon">Tu pedido</h2>
                <p className="text-xs text-carbon/60 tabular-nums">
                  {totalCount} {totalCount === 1 ? 'producto' : 'productos'}
                </p>
              </div>
              <button
                onClick={() => onRequireTable?.()}
                aria-label={tableNumber ? `Mesa ${tableNumber}. Cambiar mesa` : 'Elegir mesa'}
                className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full border-2 border-carbon px-2.5 py-1 text-xs font-bold transition-colors ${
                  tableNumber ? 'text-carbon hover:bg-carbon/[0.06]' : 'border-burger/60 bg-burger/10 text-burger-dark animate-pulse'
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                {tableNumber ? (
                  <>
                    Mesa {tableNumber}
                    <span className="font-semibold text-carbon/65">· Cambiar</span>
                  </>
                ) : (
                  'Elige tu mesa'
                )}
              </button>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="w-9 h-9 shrink-0 rounded-full border border-carbon/15 flex items-center justify-center transition-colors hover:bg-carbon/[0.06]"
              >
                <X className="w-4.5 h-4.5 text-carbon" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              {items.length === 0 ? (
                <EmptyState
                  icon={<ShoppingBag className="w-7 h-7" />}
                  title="Tu pedido está vacío"
                  description="Agrega productos desde el menú"
                  compact
                  action={
                    <div className="flex flex-col items-center gap-2">
                      {lastOrderId && (
                        <Button variant="outline" onClick={repeatLast} loading={reordering}>
                          <RotateCcw className="h-4 w-4" />
                          Repetir mi último pedido
                        </Button>
                      )}
                      <Button variant="solid" onClick={onClose}>
                        Ver menú
                      </Button>
                    </div>
                  }
                />
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <CartRow
                        key={item.id}
                        item={item}
                        lineTotal={getItemPrice(item) * item.quantity}
                        onRemove={() => removeWithUndo(item)}
                        onEdit={onEditItem ? () => onEditItem(item) : undefined}
                        onQty={(q) => updateQuantity(item.id, q)}
                        maxQty={
                          item.product.stockLeft != null
                            ? item.product.stockLeft - items.filter((i) => i.product.id === item.product.id && i.id !== item.id).reduce((n, i) => n + i.quantity, 0)
                            : Infinity
                        }
                      />
                    ))}
                  </AnimatePresence>
                  <p className="text-center text-[11px] text-carbon/70">Desliza un producto a la izquierda para quitarlo</p>
                </>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-6 space-y-4">
                {/* Sugerencias */}
                {offers.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-carbon mb-2">¿Le agregas algo?</p>
                    <div className="-mx-6 flex gap-2.5 overflow-x-auto scrollbar-none px-6 pb-1">
                      {offers.map((p) => (
                        <SuggestionCard key={p.id} product={p} onAdd={() => (canQuickAdd(p) ? addSimple(p) : onOpenProduct?.(p))} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <TextField
                    label="Tu nombre"
                    type="text"
                    // sin autocompletar del navegador: Chrome/Safari sincronizan lo escrito entre los
                    // teléfonos de una misma cuenta y en un teléfono prestado saldría el nombre de otro.
                    // El nombre lo recuerda la app solo en este teléfono.
                    autoComplete="off"
                    name="pedido-nombre"
                    autoCorrect="off"
                    autoCapitalize="words"
                    spellCheck={false}
                    value={nameValue}
                    onChange={(e) => {
                      setName(e.target.value.replace(/\d/g, ''));
                      setNameError('');
                    }}
                    placeholder="Ej: Juan"
                    maxLength={40}
                    error={nameError || undefined}
                  />
                </div>

                <details className="group rounded-2xl border border-carbon/10 px-4 py-3" open={!!(emailValue || docValue) || undefined}>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-carbon">
                    Recibo digital por correo
                    <span className="text-[12px] font-normal text-carbon/50 group-open:hidden">Opcional</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <TextField
                      label="Correo"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={emailValue}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder="nombre@gmail.com"
                      maxLength={120}
                      error={emailError || undefined}
                    />
                    <TextField
                      label="Cédula o RIF (opcional)"
                      value={docValue}
                      onChange={(e) => setDoc(e.target.value.toUpperCase().slice(0, 20))}
                      placeholder="V-12345678"
                      autoComplete="off"
                    />
                    <p className="text-[11px] text-carbon/50">Cuando se confirme el pago te llega el recibo con el detalle de tu pedido.</p>
                  </div>
                </details>

                <div>
                  <p className="text-sm font-semibold text-carbon mb-2">¿Tienes un cupón?</p>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setCoupon(couponInput.trim().toUpperCase());
                      setError('');
                    }}
                  >
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 20))}
                      placeholder="Código"
                      aria-label="Código de cupón"
                      className="field flex-1 uppercase tracking-wider"
                    />
                    {coupon ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCoupon('');
                          setCouponInput('');
                        }}
                      >
                        Quitar
                      </Button>
                    ) : (
                      <Button type="submit" variant="outline" disabled={!couponInput.trim()}>
                        Aplicar
                      </Button>
                    )}
                  </form>
                  {coupon && quote.couponError && (
                    <p className="mt-1.5 text-[12px] font-medium text-rose" role="alert">
                      {quote.couponError}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-carbon mb-2">Método de pago</p>
                  <PaymentSelector
                    value={paymentMethod}
                    onChange={(m) => {
                      setPaymentMethod(m);
                      setError('');
                    }}
                  />
                  {paymentMethod === 'MOBILE_PAYMENT' && (
                    <div className="mt-3">
                      <PagoMovilPanel
                        amount={grandTotal}
                        reference={reference}
                        onReference={(v) => {
                          setReference(v);
                          setRefError('');
                        }}
                        error={refError || undefined}
                      />
                    </div>
                  )}
                </div>

                <div className="pb-4">
                  <p className="text-sm font-semibold text-carbon mb-2">Propina (opcional)</p>
                  <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Propina">
                    {[0, 10, 15, 20].map((pct) => {
                      const selected = tipPct === pct;
                      return (
                        <button
                          key={pct}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setTipPct(pct)}
                          className={`py-2.5 rounded-2xl border transition-[border-color,background-color,color,box-shadow] ${
                            selected
                              ? 'border-burger/70 bg-burger/[0.12] text-burger-dark'
                              : 'border-carbon/15 bg-carbon/[0.03] text-carbon hover:border-carbon/40'
                          }`}
                        >
                          <span className="block text-sm font-bold leading-tight">{pct}%</span>
                          {pct > 0 && (
                            <span className="block text-[10px] font-semibold opacity-80 tabular-nums">
                              {formatPrice(Math.round(subtotal * pct) / 100)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="pb-4">
                  <SplitBill total={grandTotal} />
                </div>
              </div>
            )}

            {/* Barra fija: total + enviar */}
            {items.length > 0 && (
              <div
                className="sticky bottom-0 z-10 mt-auto border-t-2 border-carbon bg-card/95 backdrop-blur-xl px-6 pt-3"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
              >
                {error && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-rose text-sm font-medium mb-2" role="alert">
                    {error}
                  </motion.p>
                )}
                {closed && (
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-rose" role="status">
                    <Clock className="h-3.5 w-3.5" />
                    {business?.message || 'Estamos cerrados por ahora'}
                  </p>
                )}
                {discount > 0 && (
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-mint-ink tabular-nums">
                    <TagIcon className="h-3 w-3" />
                    {quote.label || 'Descuento'}: −{formatPrice(discount)}
                  </p>
                )}
                {tipAmount > 0 && (
                  <p className="mb-1.5 text-[11px] font-semibold text-mint-ink tabular-nums">Incluye propina de {formatPrice(tipAmount)}</p>
                )}
                <Button
                  onClick={handleSubmit}
                  loading={submitting && !sent}
                  disabled={closed}
                  fullWidth
                  size="lg"
                  style={sent ? { background: 'var(--color-mint)' } : undefined}
                >
                  <span className="flex w-full items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      {sent && <Check className="h-5 w-5" />}
                      {sent ? '¡Pedido enviado!' : submitting ? 'Enviando…' : 'Enviar pedido'}
                    </span>
                    <span className="flex shrink-0 flex-col items-end leading-tight">
                      <AnimatedPrice value={grandTotal} />
                      <PriceBs usd={grandTotal} className="text-[10px] font-semibold opacity-65" />
                    </span>
                  </span>
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */

function Tag({ tone, children }: { tone: 'brand' | 'rose' | 'mint' | 'neutral'; children: React.ReactNode }) {
  const tones = {
    brand: 'border-burger/40 bg-burger/10 text-burger',
    rose: 'border-rose/40 bg-rose/10 text-rose line-through decoration-1',
    mint: 'border-mint/40 bg-mint/10 text-mint-ink',
    neutral: 'border-carbon/20 bg-carbon/5 text-carbon/75',
  };
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Línea del carrito: se desliza a la izquierda para quitarla. */
function CartRow({
  item,
  lineTotal,
  onRemove,
  onEdit,
  onQty,
  maxQty = Infinity,
}: {
  item: CartItem;
  lineTotal: number;
  onRemove: () => void;
  onEdit?: () => void;
  onQty: (q: number) => void;
  /** Máximo según inventario (lo que queda menos las otras líneas del mismo producto). */
  maxQty?: number;
}) {
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-120, -24, 0], [1, 0.35, 0]);
  const removing = useRef(false);
  const selected = Object.values(item.selections).flat();

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!removing.current && (info.offset.x < -100 || info.velocity.x < -650)) {
      removing.current = true;
      onRemove();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -320, transition: { duration: 0.22 } }}
      className="relative"
    >
      {/* fondo rojo que aparece al deslizar */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: reveal }}
        className="absolute inset-0 flex items-center justify-end gap-1.5 rounded-2xl bg-rose pr-5 text-sm font-bold text-cream"
      >
        <Trash2 className="h-4 w-4" />
        Quitar
      </motion.div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.9, right: 0.05 }}
        onDragEnd={onDragEnd}
        style={{ x, touchAction: 'pan-y' }}
        className="relative rounded-2xl border border-carbon/10 bg-carbon/[0.03] p-3.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="display text-base leading-snug text-carbon">{item.product.name}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {item.variation && <Tag tone="brand">{item.variation.name}</Tag>}
              {selected.map((opt, i) => (
                <Tag key={`${opt}-${i}`} tone="neutral">
                  {opt}
                </Tag>
              ))}
              {item.removedIngredients.map((r) => (
                <Tag key={`sin-${r}`} tone="rose">
                  {r}
                </Tag>
              ))}
              {item.addedExtras.map((e, i) => (
                <Tag key={`${e.id}-${i}`} tone="mint">
                  +{e.name}
                </Tag>
              ))}
            </div>
            {item.note && (
              <p className="mt-1 flex items-start gap-1.5 text-xs italic text-status-preparing">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {item.note}
              </p>
            )}
          </div>
          <div className="-mr-1 flex shrink-0 items-center">
            {onEdit && (
              <button
                onClick={onEdit}
                aria-label={`Editar ${item.product.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-carbon/70 transition-colors hover:bg-mustard/40"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onRemove}
              aria-label={`Eliminar ${item.product.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-rose transition-colors hover:bg-rose/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-full border border-carbon/15 p-0.5">
            <motion.button
              whileTap={{ scale: 0.86 }}
              onClick={() => onQty(item.quantity - 1)}
              disabled={item.quantity <= 1}
              aria-label="Quitar uno"
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-mustard disabled:opacity-35"
            >
              <Minus className="h-4 w-4 text-carbon" />
            </motion.button>
            <span className="w-5 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
            <motion.button
              whileTap={{ scale: 0.86 }}
              onClick={() => onQty(item.quantity + 1)}
              disabled={item.quantity >= maxQty}
              aria-label="Agregar uno"
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-mustard disabled:opacity-35"
            >
              <Plus className="h-4 w-4 text-carbon" />
            </motion.button>
          </div>
          <AnimatedPrice value={lineTotal} className="price text-base" />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Tarjeta compacta de sugerencia dentro del carrito. */
function SuggestionCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const [done, setDone] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const img = product.imageUrl && !imgFailed ? cldUrl(product.imageUrl, { w: 144, h: 64 }) : null;
  const quick = canQuickAdd(product);
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        onAdd();
        if (quick) {
          setDone(true);
          setTimeout(() => setDone(false), 1100);
        }
      }}
      aria-label={quick ? `Agregar ${product.name}` : `Elegir opciones de ${product.name}`}
      className="card relative flex w-36 shrink-0 flex-col gap-1.5 rounded-xl p-2.5 text-left"
    >
      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-carbon/10 bg-carbon/5">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-carbon/25" />
        )}
      </div>
      <span className="line-clamp-2 text-xs font-bold leading-tight text-carbon">{product.name}</span>
      <span className="flex items-center justify-between">
        <span className="price text-sm">{formatPrice(Number(product.basePrice))}</span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-carbon transition-colors ${
            done ? 'bg-mint' : 'bg-burger'
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5 text-cream" /> : <Plus className="h-3.5 w-3.5 text-cream" />}
        </span>
      </span>
    </motion.button>
  );
}
