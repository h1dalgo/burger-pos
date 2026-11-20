'use client';

import { useState } from 'react';
import { Copy, Check, Smartphone } from 'lucide-react';
import { useBusinessStore } from '@/store/business-store';
import { formatBs, formatPrice } from '@/lib/utils';

interface Props {
  /** Total a pagar en dólares */
  amount: number;
  reference: string;
  onReference: (v: string) => void;
  error?: string;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      /* sin portapapeles */
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12px] text-carbon/55">{label}</span>
      <button type="button" onClick={copy} className="flex min-w-0 items-center gap-2 text-sm font-semibold text-carbon" aria-label={`Copiar ${label}: ${value}`}>
        <span className="truncate tabular-nums">{value}</span>
        {done ? <Check className="h-3.5 w-3.5 shrink-0 text-mint-ink" /> : <Copy className="h-3.5 w-3.5 shrink-0 text-carbon/45" />}
      </button>
    </div>
  );
}

/** Datos del Pago Móvil del negocio + campo para la referencia del cliente. */
export default function PagoMovilPanel({ amount, reference, onReference, error }: Props) {
  const s = useBusinessStore((st) => st.settings);
  const rate = s?.exchangeRate ?? 0;
  const bs = rate ? Math.round(amount * rate * 100) / 100 : null;
  const hasData = !!(s?.pagoMovilBank || s?.pagoMovilPhone || s?.pagoMovilId);

  return (
    <div className="rounded-2xl border border-burger/30 bg-burger/[0.06] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-carbon">
        <Smartphone className="h-4 w-4 text-burger" />
        Paga por Pago Móvil
      </p>
      {hasData ? (
        <div className="mt-2 divide-y divide-carbon/10">
          {s?.pagoMovilBank && <CopyRow label="Banco" value={s.pagoMovilBank} />}
          {s?.pagoMovilPhone && <CopyRow label="Teléfono" value={s.pagoMovilPhone} />}
          {s?.pagoMovilId && <CopyRow label="Cédula / RIF" value={s.pagoMovilId} />}
          <CopyRow label="Monto" value={bs !== null ? formatBs(bs).replace('Bs ', '') : formatPrice(amount)} />
        </div>
      ) : (
        <p className="mt-1.5 text-[12px] text-carbon/60">Pide los datos del Pago Móvil al mesero.</p>
      )}
      {bs !== null && (
        <p className="mt-1 text-[11px] text-carbon/50">
          {formatPrice(amount)} × tasa {rate.toLocaleString('es-VE', { maximumFractionDigits: 2 })} = <b className="text-carbon/75">{formatBs(bs)}</b>
        </p>
      )}
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[13px] font-semibold text-carbon">Número de referencia</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          value={reference}
          onChange={(e) => onReference(e.target.value.replace(/\D/g, '').slice(0, 20))}
          placeholder="Últimos 4 a 6 dígitos"
          className="field"
          aria-invalid={!!error}
          aria-describedby={error ? 'ref-error' : undefined}
        />
      </label>
      {error && (
        <p id="ref-error" className="mt-1.5 text-[12px] font-medium text-rose" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
