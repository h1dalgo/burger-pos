'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wallet, LockOpen, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { useEscapeClose } from '@/hooks/use-escape-close';

export interface OpenShift {
  id: string;
  person: string;
  openedAt: string;
  openingCash: number;
}

interface CloseResult {
  expected: number;
  difference: number;
  totals: { count: number; byMethod: { CASH: number; MOBILE_PAYMENT: number; CARD: number } };
  shift: { countedCash: string | number };
}

interface Props {
  person: string;
  shift: OpenShift | null;
  /** Cobros hechos en este turno (solo la cantidad: el cierre es a ciegas). */
  cobros: number;
  /** Motivo por el que se abrió (ej. quiso cobrar en efectivo sin caja abierta). */
  reason?: string | null;
  onChanged: () => void;
  onClose: () => void;
}

const time = new Intl.DateTimeFormat('es-VE', { hour: '2-digit', minute: '2-digit' });

/**
 * Caja del mesero: abrir el turno con el efectivo inicial y cerrarlo contando
 * lo que tiene. Lo esperado se muestra recién después de contar (cierre a ciegas).
 */
export default function ShiftSheet({ person, shift, cobros, reason, onChanged, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeClose(ref, onClose);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CloseResult | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const value = amount.trim() === '' ? NaN : Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 0 && value <= 100000;

  const open = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', person, openingCash: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo abrir la caja');
      toast.success(`Caja abierta con ${formatPrice(value)}`);
      onChanged();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!shift || !valid || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', person, id: shift.id, countedCash: value, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo cerrar la caja');
      setResult(data);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const diff = result?.difference ?? 0;
  const even = Math.abs(diff) < 0.005;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={shift ? 'Cerrar caja' : 'Abrir caja'}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[1.75rem] border border-carbon/10 bg-card p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-[1.75rem]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-burger/40 bg-burger/10 text-burger">
            <Wallet className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="display text-2xl leading-none text-carbon">{result ? 'Caja cerrada' : shift ? 'Cerrar caja' : 'Abrir caja'}</h2>
            <p className="eyebrow mt-1">{person}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-carbon/15 hover:bg-carbon/[0.06]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {result ? (
          // ── resultado del cierre ──
          <div className="mt-5 space-y-3">
            <div className={`rounded-2xl border p-4 ${even ? 'border-mint/40 bg-mint/10' : diff < 0 ? 'border-rose/40 bg-rose/10' : 'border-burger/40 bg-burger/10'}`}>
              <p className={`flex items-center gap-2 text-sm font-bold ${even ? 'text-mint-ink' : diff < 0 ? 'text-rose' : 'text-burger-dark'}`}>
                {even ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {even ? 'La caja cuadra' : diff < 0 ? `Faltan ${formatPrice(-diff)}` : `Sobran ${formatPrice(diff)}`}
              </p>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-carbon/60">Efectivo esperado</dt><dd className="font-semibold tabular-nums text-carbon">{formatPrice(result.expected)}</dd></div>
              <div className="flex justify-between"><dt className="text-carbon/60">Efectivo contado</dt><dd className="font-semibold tabular-nums text-carbon">{formatPrice(Number(result.shift.countedCash))}</dd></div>
              <div className="flex justify-between border-t border-carbon/10 pt-1.5"><dt className="text-carbon/60">Pago Móvil cobrado</dt><dd className="tabular-nums text-carbon/80">{formatPrice(result.totals.byMethod.MOBILE_PAYMENT)}</dd></div>
              <div className="flex justify-between"><dt className="text-carbon/60">Tarjeta cobrada</dt><dd className="tabular-nums text-carbon/80">{formatPrice(result.totals.byMethod.CARD)}</dd></div>
              <div className="flex justify-between"><dt className="text-carbon/60">Cobros del turno</dt><dd className="tabular-nums text-carbon/80">{result.totals.count}</dd></div>
            </dl>
            <p className="text-[12px] text-carbon/55">El cierre quedó registrado y el admin lo ve en Turnos de caja.</p>
            <button type="button" onClick={onClose} className="btn btn-primary w-full">Listo</button>
          </div>
        ) : shift ? (
          // ── cerrar: contar sin ver lo esperado ──
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-carbon/10 bg-carbon/[0.03] p-3.5 text-sm text-carbon/75">
              Abierta a las {time.format(new Date(shift.openedAt))} con {formatPrice(shift.openingCash)} · {cobros} {cobros === 1 ? 'cobro' : 'cobros'}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-carbon">¿Cuánto efectivo tienes? ($)</span>
              <input inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Cuenta todo el efectivo, incluido el inicial" className="field w-full text-lg tabular-nums" autoFocus />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-carbon">Nota (opcional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Ej: di vuelto de más en la mesa 4" className="field w-full" />
            </label>
            {confirmClose ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmClose(false)} className="btn btn-outline flex-1">Volver</button>
                <button type="button" onClick={() => void close()} disabled={busy} className="btn btn-primary flex-1">
                  <Lock className="h-4 w-4" />
                  {busy ? 'Cerrando…' : `Cerrar con ${formatPrice(value)}`}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmClose(true)} disabled={!valid} className="btn btn-primary w-full">
                <Lock className="h-4 w-4" />
                Cerrar caja
              </button>
            )}
            <p className="text-[12px] text-carbon/55">Cuenta primero: lo que debería haber se muestra después de cerrar.</p>
          </div>
        ) : (
          // ── abrir ──
          <div className="mt-5 space-y-4">
            {reason && <p className="rounded-2xl border border-burger/40 bg-burger/10 p-3 text-sm font-semibold text-burger-dark">{reason}</p>}
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-carbon">¿Con cuánto efectivo empiezas? ($)</span>
              <input inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Ej: 20 (para dar vuelto). 0 si no tienes" className="field w-full text-lg tabular-nums" autoFocus />
            </label>
            <button type="button" onClick={() => void open()} disabled={!valid || busy} className="btn btn-primary w-full">
              <LockOpen className="h-4 w-4" />
              {busy ? 'Abriendo…' : 'Abrir caja'}
            </button>
            <p className="text-[12px] text-carbon/55">Todo el efectivo que cobres queda a tu nombre hasta que cierres la caja.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
