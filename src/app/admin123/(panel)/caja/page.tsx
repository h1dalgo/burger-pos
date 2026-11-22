'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wallet, Lock, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice } from '@/lib/utils';

interface Shift {
  id: string;
  person: string;
  openedAt: string;
  closedAt: string | null;
  closedBy: string | null;
  note: string | null;
  openingCash: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  totals: { count: number; byMethod: { CASH: number; MOBILE_PAYMENT: number; CARD: number } };
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const hm = new Intl.DateTimeFormat('es-VE', { hour: '2-digit', minute: '2-digit' });
const dm = new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short' });

function DiffBadge({ diff }: { diff: number | null }) {
  if (diff == null) return <span className="rounded-full border border-mint/50 px-2.5 py-0.5 text-[11px] font-bold text-mint-ink">Abierta</span>;
  if (Math.abs(diff) < 0.005)
    return (
      <span className="flex items-center gap-1 rounded-full bg-mint/12 px-2.5 py-0.5 text-[11px] font-bold text-mint-ink">
        <CheckCircle2 className="h-3.5 w-3.5" /> Cuadra
      </span>
    );
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${diff < 0 ? 'bg-rose/12 text-rose' : 'bg-burger/12 text-burger-dark'}`}>
      <AlertTriangle className="h-3.5 w-3.5" />
      {diff < 0 ? `Faltan ${formatPrice(-diff)}` : `Sobran ${formatPrice(diff)}`}
    </span>
  );
}

/** El admin cierra un turno que el mesero dejó abierto. */
function CloseForm({ shift, onClose, onDone }: { shift: Shift; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const value = amount.trim() === '' ? NaN : Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 0;
  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: shift.id, countedCash: value, note: note.trim() || undefined }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo cerrar');
      toast.success(`Turno de ${shift.person} cerrado`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[3px] sm:items-center sm:p-4" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Cerrar turno de ${shift.person}`}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[1.75rem] border border-carbon/10 bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-[1.75rem]"
      >
        <div className="flex items-center justify-between">
          <h2 className="display text-2xl text-carbon">Cerrar turno de {shift.person}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full border border-carbon/15">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-carbon/65">
          Esperado hasta ahora: <span className="font-semibold tabular-nums text-carbon">{formatPrice(shift.expectedCash)}</span> en efectivo.
        </p>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-carbon">Efectivo contado ($)</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} className="field w-full tabular-nums" autoFocus />
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-semibold text-carbon">Nota (opcional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Ej: el mesero se fue sin cerrar" className="field w-full" />
        </label>
        <button type="button" onClick={() => void submit()} disabled={!valid || busy} className="btn btn-primary mt-5 w-full">
          <Lock className="h-4 w-4" />
          {busy ? 'Cerrando…' : 'Cerrar turno'}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function CajaPage() {
  const [day, setDay] = useState(today);
  const [rows, setRows] = useState<Shift[] | null>(null);
  const [closing, setClosing] = useState<Shift | null>(null);

  const load = useCallback(() => {
    const from = new Date(`${day}T00:00:00`);
    const to = new Date(`${day}T23:59:59.999`);
    fetch(`/api/admin/shifts?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => {
        setRows([]);
        toast.error('No se pudieron cargar los turnos');
      });
  }, [day]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const summary = useMemo(() => {
    const closed = (rows ?? []).filter((r) => r.difference != null);
    return {
      open: (rows ?? []).filter((r) => !r.closedAt).length,
      missing: closed.filter((r) => (r.difference ?? 0) < -0.005).reduce((s, r) => s + -(r.difference ?? 0), 0),
      extra: closed.filter((r) => (r.difference ?? 0) > 0.005).reduce((s, r) => s + (r.difference ?? 0), 0),
      cash: (rows ?? []).reduce((s, r) => s + r.totals.byMethod.CASH, 0),
    };
  }, [rows]);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl leading-none text-carbon">Turnos de caja</h1>
          <p className="mt-2 text-sm text-carbon/65">Cada mesero abre su caja con el efectivo inicial y la cierra contando. Aquí ves si cuadró.</p>
        </div>
        <input type="date" value={day} max={today()} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Día" className="field" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Efectivo cobrado', formatPrice(summary.cash), ''],
          ['Cajas abiertas', String(summary.open), summary.open ? 'text-mint-ink' : ''],
          ['Faltantes', formatPrice(summary.missing), summary.missing > 0 ? 'text-rose' : ''],
          ['Sobrantes', formatPrice(summary.extra), summary.extra > 0 ? 'text-burger-dark' : ''],
        ].map(([label, value, tone]) => (
          <div key={label} className="card p-3.5">
            <p className="eyebrow">{label}</p>
            <p className={`price mt-1 text-xl tabular-nums ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {!rows && [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        {rows && rows.length === 0 && <EmptyState icon={<Wallet className="h-7 w-7" />} title="Sin turnos este día" description="Los meseros abren su caja desde su app, en el botón Caja." />}
        {rows?.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="font-semibold text-carbon">{s.person}</p>
              <p className="text-[12px] tabular-nums text-carbon/55">
                {dm.format(new Date(s.openedAt))} · {hm.format(new Date(s.openedAt))} – {s.closedAt ? hm.format(new Date(s.closedAt)) : 'en curso'}
                {s.closedBy && s.closedBy !== s.person ? ` · cerró ${s.closedBy}` : ''}
              </p>
              <span className="ml-auto">
                <DiffBadge diff={s.difference} />
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-4">
              <div><dt className="text-carbon/55">Inicial</dt><dd className="tabular-nums text-carbon">{formatPrice(s.openingCash)}</dd></div>
              <div><dt className="text-carbon/55">Efectivo cobrado</dt><dd className="tabular-nums text-carbon">{formatPrice(s.totals.byMethod.CASH)}</dd></div>
              <div><dt className="text-carbon/55">Esperado</dt><dd className="font-semibold tabular-nums text-carbon">{formatPrice(s.expectedCash)}</dd></div>
              <div><dt className="text-carbon/55">Contado</dt><dd className="font-semibold tabular-nums text-carbon">{s.countedCash != null ? formatPrice(s.countedCash) : '—'}</dd></div>
            </dl>
            <p className="mt-2 text-[12px] text-carbon/55">
              {s.totals.count} {s.totals.count === 1 ? 'cobro' : 'cobros'} · Pago Móvil {formatPrice(s.totals.byMethod.MOBILE_PAYMENT)} · Tarjeta {formatPrice(s.totals.byMethod.CARD)}
              {s.note ? <span className="italic"> · “{s.note}”</span> : null}
            </p>
            {!s.closedAt && (
              <button type="button" onClick={() => setClosing(s)} className="btn btn-outline btn-sm mt-3">
                <Lock className="h-4 w-4" />
                Cerrar turno
              </button>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {closing && (
          <CloseForm
            shift={closing}
            onClose={() => setClosing(null)}
            onDone={() => {
              setClosing(null);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
