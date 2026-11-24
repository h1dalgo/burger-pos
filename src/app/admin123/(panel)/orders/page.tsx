'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ChevronDown, Star, Ban, Check, ChevronLeft, ChevronRight, ClipboardList, ReceiptText, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Order, OrderStatus } from '@/types';
import { formatBs, formatPrice } from '@/lib/utils';
import { formatDisplayId, getStatusMeta } from '@/lib/order-status';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import CancelOrderDialog from '@/components/kitchen/CancelOrderDialog';

const FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'WAITING_PAYMENT', label: 'Por pagar' },
  { value: 'PENDING', label: 'En cola' },
  { value: 'IN_PREPARATION', label: 'Preparando' },
  { value: 'READY', label: 'Listos' },
  { value: 'DELIVERED', label: 'Entregados' },
  { value: 'CANCELLED', label: 'Cancelados' },
];
const METHOD: Record<string, string> = { CASH: 'Efectivo', MOBILE_PAYMENT: 'Pago Móvil', CARD: 'Tarjeta' };

interface Page {
  total: number;
  page: number;
  pages: number;
  orders: Order[];
}

const dayStart = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : '');
const dayEnd = (d: string) => (d ? new Date(new Date(`${d}T00:00:00`).getTime() + 86400000).toISOString() : '');
const when = new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export default function OrdersHistoryPage() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // búsqueda con una pequeña pausa mientras se escribe
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    const sp = new URLSearchParams({ page: String(page) });
    if (query) sp.set('q', query);
    if (status) sp.set('status', status);
    if (from) sp.set('start', dayStart(from));
    if (to) sp.set('end', dayEnd(to));
    fetch(`/api/admin/orders?${sp}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d: Page) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, [page, query, status, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (o: Order, body: Record<string, unknown>, ok: string) => {
    setBusy(o.id);
    try {
      const res = await fetch(`/api/orders/${o.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, actor: 'Admin' }) });
      if (!res.ok) throw new Error();
      toast.success(ok);
      load();
    } catch {
      toast.error('No se pudo actualizar el pedido');
    } finally {
      setBusy(null);
    }
  };

  const emailReceipt = async (o: Order) => {
    const current = (o as Order & { customerEmail?: string | null }).customerEmail ?? '';
    const email = window.prompt('Correo del cliente para enviar el recibo', current);
    if (email === null) return;
    setBusy(o.id);
    try {
      const res = await fetch(`/api/admin/orders/${o.id}/receipt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error);
      toast.success('Recibo enviado');
      load();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'No se pudo enviar');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-5xl">
      <h1 className="display text-4xl text-carbon leading-none">Pedidos</h1>
      <p className="text-sm text-carbon/65 mt-2 mb-6">Historial con búsqueda; desde aquí también se confirma o cancela.</p>

      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon/45" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por número, nombre, mesa, mesero o referencia" className="field pl-11" aria-label="Buscar pedidos" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              type="button"
              data-tone="brand"
              aria-pressed={status === f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className="chip text-[13px] py-1.5"
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1.5 text-carbon/60">
              Desde
              <input type="date" value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} className="field w-auto py-1.5 text-sm" />
            </label>
            <label className="flex items-center gap-1.5 text-carbon/60">
              Hasta
              <input type="date" value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} className="field w-auto py-1.5 text-sm" />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {error && <EmptyState title="No pudimos cargar los pedidos" description="Revisa la conexión e intenta de nuevo." />}
        {!error && !data && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        )}
        {data && data.orders.length === 0 && <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="Sin pedidos" description="No hay pedidos con esos filtros." />}
        {data && data.orders.length > 0 && (
          <>
            <p className="mb-2 text-[12px] text-carbon/55">{data.total} pedidos</p>
            <ul className="space-y-2">
              {data.orders.map((o) => {
                const meta = getStatusMeta(o.status);
                const total = Number(o.totalAmount);
                const rate = Number(o.exchangeRate ?? 0);
                const isOpen = open === o.id;
                return (
                  <li key={o.id} className="card overflow-hidden">
                    <button type="button" onClick={() => setOpen(isOpen ? null : o.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <span className="display w-16 shrink-0 text-xl text-carbon">#{formatDisplayId(o.displayId)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-carbon">
                          {o.customerName} · Mesa {o.tableNumber}
                        </span>
                        <span className="block truncate text-[12px] text-carbon/55">
                          {when.format(new Date(o.createdAt))} · {METHOD[o.paymentMethod]}
                          {o.paymentReference ? ` · Ref. ${o.paymentReference}` : ''}
                          {o.waiter ? ` · ${o.waiter}` : ''}
                        </span>
                      </span>
                      {o.rating ? (
                        <span className="hidden items-center gap-0.5 text-[12px] font-semibold text-burger sm:flex" aria-label={`Calificación ${o.rating} de 5`}>
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {o.rating}
                        </span>
                      ) : null}
                      <span className={`badge shrink-0 ${meta.badge}`}>{meta.title}</span>
                      <span className="w-20 shrink-0 text-right">
                        <span className="price block text-base">{formatPrice(total)}</span>
                        {rate > 0 && <span className="block text-[10px] tabular-nums text-carbon/50">{formatBs(total * rate)}</span>}
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-carbon/45 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="border-t border-carbon/10 px-4 py-3 text-sm">
                            <ul className="space-y-1">
                              {o.items.map((it) => (
                                <li key={it.id} className="flex justify-between gap-3">
                                  <span className="text-carbon/80">
                                    {it.quantity}× {it.productName}
                                    {it.variation ? ` (${it.variation.variationName})` : ''}
                                    {it.removedIngredients.length ? <span className="text-rose"> · sin {it.removedIngredients.map((r) => r.ingredientName).join(', ')}</span> : null}
                                    {it.addedExtras.length ? <span className="text-mint-ink"> · + {it.addedExtras.map((e) => e.extraName).join(', ')}</span> : null}
                                    {it.selections.length ? <span className="text-carbon/55"> · {it.selections.map((s) => s.selectedOptionName).join(', ')}</span> : null}
                                  </span>
                                  <span className="tabular-nums text-carbon/70">{formatPrice(Number(it.subtotal))}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-carbon/60">
                              {Number(o.discount ?? 0) > 0 && (
                                <span>
                                  {o.promoLabel || 'Descuento'}: −{formatPrice(Number(o.discount))}
                                </span>
                              )}
                              {Number(o.tip ?? 0) > 0 && <span>Propina: {formatPrice(Number(o.tip))}</span>}
                              {rate > 0 && <span>Tasa: Bs {rate.toLocaleString('es-VE')}</span>}
                              {o.paidBy && <span>Cobró: {o.paidBy}</span>}
                              {o.cancelReason && (
                                <span className="text-rose">
                                  Motivo: {o.cancelReason}
                                  {o.cancelledBy ? ` · canceló ${o.cancelledBy}` : ''}
                                </span>
                              )}
                              {o.ratingComment && <span className="italic">“{o.ratingComment}”</span>}
                            </div>
                            {o.receiptNumber ? (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="text-[12px] text-carbon/60">Recibo N.º {String(o.receiptNumber).padStart(6, '0')}</span>
                                <a href={`/recibo/${o.id}`} target="_blank" rel="noopener" className="btn btn-outline btn-sm">
                                  <ReceiptText className="h-4 w-4" />
                                  {o.status === 'CANCELLED' ? 'Ver recibo anulado' : 'Ver recibo'}
                                </a>
{o.status !== 'CANCELLED' && (
                                <button type="button" disabled={busy === o.id} onClick={() => emailReceipt(o)} className="btn btn-outline btn-sm">
                                  <Mail className="h-4 w-4" />
                                  {o.receiptSentAt ? 'Reenviar por correo' : 'Enviar por correo'}
                                </button>
                                )}
                              </div>
                            ) : null}
                            {o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && (
                              <div className="mt-3 flex gap-2">
                                {o.status === 'WAITING_PAYMENT' && (
                                  <button type="button" disabled={busy === o.id} onClick={() => patch(o, { status: 'PENDING', paidBy: 'Admin' }, `Pago del #${formatDisplayId(o.displayId)} confirmado`)} className="btn btn-primary btn-sm">
                                    <Check className="h-4 w-4" />
                                    Confirmar pago
                                  </button>
                                )}
                                <button type="button" disabled={busy === o.id} onClick={() => setCancelTarget(o)} className="btn btn-outline btn-sm text-rose">
                                  <Ban className="h-4 w-4" />
                                  Cancelar pedido
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
            {data.pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn btn-outline btn-sm" aria-label="Página anterior">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm tabular-nums text-carbon/65">
                  Página {data.page} de {data.pages}
                </span>
                <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="btn btn-outline btn-sm" aria-label="Página siguiente">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {cancelTarget && (
          <CancelOrderDialog
            order={cancelTarget}
            onClose={() => setCancelTarget(null)}
            onConfirm={(reason) => {
              const o = cancelTarget;
              setCancelTarget(null);
              void patch(o, { status: 'CANCELLED', cancelReason: reason }, `Pedido #${formatDisplayId(o.displayId)} cancelado`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
