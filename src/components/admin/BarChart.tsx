'use client';

import { useState } from 'react';

export interface Bar {
  label: string;
  value: number;
  /** Texto extra del tooltip (ej. "5 pedidos") */
  detail?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  data: Bar[];
  format: (v: number) => string;
  /** Mostrar solo algunas etiquetas del eje (ej. cada 3 horas) */
  labelEvery?: number;
  height?: number;
}

/** Ticks del eje en números redondos (0, ½, máximo). */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/**
 * Columnas de una sola serie (dorado), con tooltip al pasar el dedo o el mouse
 * y una tabla oculta para lectores de pantalla.
 */
export default function BarChart({ title, subtitle, data, format, labelEvery = 1, height = 160 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [max, max / 2, 0];
  const empty = data.every((d) => d.value === 0);

  return (
    <figure className="card p-5">
      <figcaption className="mb-4">
        <p className="font-bold text-carbon">{title}</p>
        {subtitle && <p className="text-[12px] text-carbon/55">{subtitle}</p>}
      </figcaption>
      {empty ? (
        <p className="py-10 text-center text-sm text-carbon/50">Sin ventas en este período</p>
      ) : (
        <div className="flex gap-2" aria-hidden="true">
          {/* eje Y */}
          <div className="flex flex-col justify-between pb-5 text-right text-[10px] tabular-nums text-carbon/45" style={{ height: height + 20 }}>
            {ticks.map((t) => (
              <span key={t} className="-translate-y-1/2 leading-none">
                {format(t)}
              </span>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            {/* líneas guía */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between" style={{ height }}>
              {ticks.map((t) => (
                <span key={t} className="block h-px bg-carbon/10" />
              ))}
            </div>
            <div className="relative flex items-end gap-[2px]" style={{ height }} onMouseLeave={() => setHover(null)}>
              {data.map((d, i) => {
                const h = (d.value / max) * height;
                return (
                  <div
                    key={d.label}
                    className="relative flex h-full flex-1 items-end justify-center"
                    onMouseEnter={() => setHover(i)}
                    onTouchStart={() => setHover(i)}
                  >
                    <span
                      className="block w-full max-w-6 rounded-t-[4px] transition-[height,opacity] duration-500"
                      style={{ height: Math.max(d.value > 0 ? 2 : 0, h), background: 'var(--color-burger)', opacity: hover === null || hover === i ? 1 : 0.45 }}
                    />
                    {hover === i && (
                      <span className="pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-lg border border-carbon/15 bg-[#0f0d0a] px-2.5 py-1.5 text-center text-[11px] leading-tight text-carbon shadow-lift" style={{ bottom: h + 6 }}>
                        <b className="block font-semibold">{d.label}</b>
                        <span className="tabular-nums">{format(d.value)}</span>
                        {d.detail && <span className="block text-carbon/55">{d.detail}</span>}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* eje X */}
            <div className="mt-1.5 flex gap-[2px]">
              {data.map((d, i) => (
                <span key={d.label} className="flex-1 text-center text-[10px] text-carbon/45">
                  {i % labelEvery === 0 ? d.label : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* misma información en tabla, para lectores de pantalla */}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
              <td>{d.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
