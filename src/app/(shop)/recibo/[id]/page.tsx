'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Download, Share2, ArrowLeft, CheckCircle2, Clock, Ban, Mail } from 'lucide-react';
import type { Order } from '@/types';
import { formatBs, formatPrice } from '@/lib/utils';

interface Business {
  name: string;
  legalName: string | null;
  rif: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  taxRate: number;
  receiptFooter: string | null;
  timezone: string;
}
interface Data {
  order: Order;
  business: Business;
  emailEnabled: boolean;
}

const METHOD: Record<string, string> = { CASH: 'Efectivo', MOBILE_PAYMENT: 'Pago Móvil', CARD: 'Tarjeta' };
const pad = (n: number, l: number) => String(n).padStart(l, '0');

/** Fila de importes del resumen. */
function Line({ label, value, strong, muted }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${strong ? 'text-[15px] font-bold text-[#17110a]' : muted ? 'text-[12px] text-[#8a7d6b]' : 'text-[13px] text-[#3a332a]'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Recibo digital del pedido. Se ve como una hoja de papel; "Descargar PDF"
 * usa la impresión del navegador (en el teléfono: Compartir → Guardar en Archivos).
 */
export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/receipts/${id}`, { cache: 'no-store' })
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j?.error || 'No encontramos este recibo');
          if (alive) setData(j);
        })
        .catch((e) => alive && setError(e.message));
    void load();
    // si aún no está pagado, se actualiza solo cuando el mesero confirma el cobro
    const t = setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 page-safe text-center">
        <div>
          <p className="display text-2xl text-carbon">{error}</p>
          <Link href="/menu" className="btn btn-outline mt-6">
            Ir al menú
          </Link>
        </div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="flex min-h-screen items-start justify-center px-4 page-safe">
        <div className="skeleton mt-6 h-[640px] w-full max-w-md rounded-[1.25rem]" aria-busy="true" aria-label="Cargando recibo" />
      </main>
    );
  }

  const { order: o, business: b } = data;
  const tz = b.timezone || 'America/Caracas';
  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('es-VE', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(d));
  const itemsTotal = o.items.reduce((s, i) => s + Number(i.subtotal), 0);
  const discount = Number(o.discount ?? 0);
  const net = Number(o.totalAmount);
  const tip = Number(o.tip ?? 0);
  const total = net + tip;
  const rate = Number(o.exchangeRate ?? 0);
  const tax = b.taxRate > 0 ? net - net / (1 + b.taxRate / 100) : 0;
  const paid = o.receiptNumber != null && o.status !== 'WAITING_PAYMENT';
  const cancelled = o.status === 'CANCELLED';
  const title = paid ? `Recibo N.º ${pad(o.receiptNumber!, 6)}${cancelled ? ' (anulado)' : ''}` : 'Recibo';

  const share = async () => {
    const url = window.location.href;
    const text = `${b.legalName || b.name} · ${title} · Total ${formatPrice(total)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      return; // el usuario cerró el menú de compartir
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  };

  return (
    <main className="min-h-screen px-4 page-safe print:p-0">
      <div className="mx-auto max-w-md">
        {/* acciones (no se imprimen) */}
        <div className="mb-4 flex items-center gap-2 print:hidden">
          <Link href={`/success?orderId=${o.displayId}`} className="btn btn-ghost btn-sm -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Mi pedido
          </Link>
          {!cancelled && (
            <button type="button" onClick={share} className="btn btn-outline btn-sm ml-auto">
              <Share2 className="h-4 w-4" />
              Compartir
            </button>
          )}
          <button type="button" onClick={() => window.print()} className={`btn btn-sm ${cancelled ? 'btn-outline ml-auto' : 'btn-primary'}`}>
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>

        {/* la hoja */}
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="receipt-paper relative overflow-hidden rounded-[1.25rem] bg-[#fbf7ef] px-6 pb-7 pt-8 text-[#17110a] shadow-[0_30px_70px_-30px_rgb(0_0_0/0.9)] print:rounded-none print:shadow-none"
          aria-label={title}
        >
          {cancelled && (
            <>
              <div className="-mx-6 -mt-8 mb-6 flex items-start gap-2 bg-[#b3263e] px-6 py-3 text-[12px] font-semibold leading-snug text-white print:bg-white print:text-[#b3263e] print:border-b-2 print:border-[#b3263e]">
                <Ban className="mt-px h-4 w-4 shrink-0" />
                <span>
                  Recibo anulado{o.updatedAt ? ` (${new Date(o.updatedAt).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })})` : ''}. No es válido como comprobante de pago.
                </span>
              </div>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] select-none whitespace-nowrap rounded-xl border-[5px] border-[#b3263e]/35 px-6 py-1 font-[family-name:var(--font-display)] text-[4.2rem] font-semibold uppercase tracking-[0.12em] text-[#b3263e]/30"
              >
                Anulado
              </span>
            </>
          )}
          {/* sello de estado */}
          {!cancelled && !paid && (
            <span className="absolute right-5 top-6 rotate-[8deg] rounded-md border-2 border-[#a87a2a] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a87a2a]">
              Por pagar
            </span>
          )}

          <header className="text-center">
            {b.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt="" className="mx-auto mb-3 h-14 w-14 object-contain" />
            )}
            <h1 className="font-[family-name:var(--font-display)] text-[1.7rem] font-medium leading-tight">{b.legalName || b.name}</h1>
            {b.legalName && b.legalName !== b.name && <p className="text-[12px] text-[#8a7d6b]">{b.name}</p>}
            <p className="mt-1 text-[12px] leading-relaxed text-[#6b604f]">
              {b.rif && <span className="block font-semibold text-[#3a332a]">RIF {b.rif}</span>}
              {b.address && <span className="block">{b.address}</span>}
              {b.phone && <span className="block">Tel. {b.phone}</span>}
            </p>
          </header>

          <div className="my-5 border-t border-dashed border-[#cdbfa6]" />

          <section className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a07a3c]">Recibo digital</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">{paid ? `N.º ${pad(o.receiptNumber!, 6)}` : 'Pendiente de pago'}</p>
          </section>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
            <dt className="text-[#8a7d6b]">Fecha</dt>
            <dd className="text-right tabular-nums">{fmtDate(o.paidAt || o.createdAt)}</dd>
            <dt className="text-[#8a7d6b]">Pedido</dt>
            <dd className="text-right tabular-nums">#{pad(o.displayId, 4)}</dd>
            <dt className="text-[#8a7d6b]">Mesa</dt>
            <dd className="text-right">{o.tableNumber}</dd>
            {o.waiter && (
              <>
                <dt className="text-[#8a7d6b]">Atendido por</dt>
                <dd className="text-right">{o.waiter}</dd>
              </>
            )}
            <dt className="text-[#8a7d6b]">Cliente</dt>
            <dd className="text-right">{o.customerName}</dd>
            {o.customerDoc && (
              <>
                <dt className="text-[#8a7d6b]">Cédula / RIF</dt>
                <dd className="text-right tabular-nums">{o.customerDoc}</dd>
              </>
            )}
          </dl>

          <div className="my-5 border-t border-dashed border-[#cdbfa6]" />

          {/* detalle */}
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.14em] text-[#8a7d6b]">
                <th className="pb-2 text-left font-semibold">Cant.</th>
                <th className="pb-2 text-left font-semibold">Descripción</th>
                <th className="pb-2 text-right font-semibold">Importe</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className="py-1.5 pr-2 tabular-nums">{it.quantity}</td>
                  <td className="py-1.5 pr-2">
                    <span className="font-semibold">{it.productName}</span>
                    {it.variation && <span> ({it.variation.variationName})</span>}
                    <span className="block text-[11px] leading-snug text-[#8a7d6b]">
                      {formatPrice(Number(it.unitPrice))} c/u
                      {it.addedExtras.length > 0 && <> · + {it.addedExtras.map((e) => e.extraName).join(', ')}</>}
                      {it.selections.length > 0 && <> · {it.selections.map((s) => s.selectedOptionName).join(', ')}</>}
                      {it.removedIngredients.length > 0 && <> · sin {it.removedIngredients.map((r) => r.ingredientName.toLowerCase()).join(', ')}</>}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatPrice(Number(it.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-4 border-t border-dashed border-[#cdbfa6]" />

          <div className="space-y-1.5">
            <Line label="Subtotal" value={formatPrice(itemsTotal)} />
            {discount > 0 && <Line label={o.promoLabel || 'Descuento'} value={`−${formatPrice(discount)}`} />}
            {tax > 0 && (
              <>
                <Line muted label="Base imponible" value={formatPrice(net - tax)} />
                <Line muted label={`IVA ${b.taxRate}% (incluido)`} value={formatPrice(tax)} />
              </>
            )}
            {tip > 0 && <Line label="Propina" value={formatPrice(tip)} />}
            <div className="pt-2">
              <Line strong label="Total" value={formatPrice(total)} />
              {rate > 0 && <Line muted label={`Tasa ${rate.toLocaleString('es-VE')} Bs/$`} value={formatBs(total * rate)} />}
            </div>
          </div>

          <div className="my-4 border-t border-dashed border-[#cdbfa6]" />

          <div className="space-y-1.5 text-[12px]">
            <Line label="Forma de pago" value={METHOD[o.paymentMethod] ?? o.paymentMethod} />
            {o.paymentReference && <Line label="Referencia" value={o.paymentReference} />}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[12px] font-semibold">
              {cancelled ? (
                <span className="flex items-center gap-1.5 text-[#b3263e]">
                  <Ban className="h-4 w-4" /> Pedido anulado{o.cancelReason ? `: ${o.cancelReason}` : ''}
                </span>
              ) : paid ? (
                <span className="flex items-center gap-1.5 text-[#1b7a43]">
                  <CheckCircle2 className="h-4 w-4" /> Pagado
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[#a07a3c]">
                  <Clock className="h-4 w-4" /> Se emite al confirmarse el pago
                </span>
              )}
            </div>
          </div>

          <footer className="mt-6 text-center text-[11px] leading-relaxed text-[#a39682]">
            {b.receiptFooter && <p className="mb-1 text-[12px] text-[#6b604f]">{b.receiptFooter}</p>}
            <p>Documento no fiscal · Ref. {o.id.slice(0, 8).toUpperCase()}</p>
          </footer>

          {/* borde dentado de ticket */}
          <span aria-hidden="true" className="receipt-edge absolute inset-x-0 bottom-0 h-2" />
        </motion.article>

        {data.order.maskedEmail && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-carbon/55 print:hidden">
            <Mail className="h-3.5 w-3.5" />
            {data.order.receiptSentAt ? 'Enviado a' : 'Se enviará a'} {data.order.maskedEmail}
          </p>
        )}
        <p className="mt-3 text-center text-[11px] text-carbon/45 print:hidden">En el teléfono: PDF → Compartir → Guardar en Archivos</p>
      </div>
    </main>
  );
}
