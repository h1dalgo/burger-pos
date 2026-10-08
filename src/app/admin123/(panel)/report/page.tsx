'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Receipt, TrendingUp, HandCoins, ShoppingBag, Printer, ChartBar } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

interface ReportData {
  count: number;
  revenue: number;
  tips: number;
  avgTicket: number;
  byMethod: Record<string, { count: number; total: number }>;
  byWaiter: Record<string, { count: number; total: number }>;
  topProducts: Array<{ productName: string; quantity: number; revenue: number }>;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  MOBILE_PAYMENT: 'Pago Móvil',
  CARD: 'Tarjeta',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportPage() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback((dateStr: string) => {
    const start = new Date(`${dateStr}T00:00:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    fetch(`/api/admin/report?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((report: ReportData) => {
        setData(report);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const kpis = [
    { label: 'Ventas del día', value: formatPrice(data?.revenue ?? 0), icon: TrendingUp, chip: 'bg-mint/15 border-mint/60 text-mint-ink' },
    { label: 'Propinas', value: formatPrice(data?.tips ?? 0), icon: HandCoins, chip: 'bg-mustard/25 border-mustard/60 text-carbon' },
    { label: 'Pedidos', value: String(data?.count ?? 0), icon: Receipt, chip: 'bg-status-pending/10 border-status-pending/40 text-status-pending' },
    { label: 'Ticket promedio', value: formatPrice(data?.avgTicket ?? 0), icon: ShoppingBag, chip: 'bg-azul/10 border-azul/40 text-azul' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="display text-3xl text-carbon sign-yellow">Corte de Caja</h1>
          <p className="text-sm text-carbon/60 mt-1">Resumen de ventas, propinas y meseros del día</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Fecha del corte"
            className="field"
          />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {error ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title="No pudimos cargar el corte"
          description="Reintenta en unos segundos."
          action={
            <Button onClick={() => load(date)} className="mt-3">
              Reintentar
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-4 border-2 border-carbon/15"
              >
                <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center mb-3 ${kpi.chip}`}>
                  <kpi.icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-xs font-semibold text-carbon/60 uppercase tracking-wider">{kpi.label}</p>
                {data ? (
                  <p className="display text-2xl text-carbon mt-1 tabular-nums">{kpi.value}</p>
                ) : (
                  <span className="inline-block w-24 h-7 skeleton mt-1" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <section className="card p-5 border-2 border-carbon/15">
              <h2 className="font-bold text-carbon mb-3">Por método de pago</h2>
              {!data ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
              ) : Object.keys(data.byMethod).length === 0 ? (
                <p className="text-sm text-carbon/55">Sin ventas registradas este día.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.byMethod).map(([method, m]) => (
                    <div key={method} className="flex items-center justify-between bg-carbon/[0.03] border border-carbon/10 rounded-lg px-3 py-2">
                      <span className="text-sm font-semibold text-carbon/75">
                        {METHOD_LABELS[method] || method}
                        <span className="text-carbon/45"> · {m.count} pedido(s)</span>
                      </span>
                      <span className="text-sm font-bold text-carbon tabular-nums">{formatPrice(m.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card p-5 border-2 border-carbon/15">
              <h2 className="font-bold text-carbon mb-3">Por mesero</h2>
              {!data ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
              ) : Object.keys(data.byWaiter).length === 0 ? (
                <p className="text-sm text-carbon/55">Sin pedidos registrados este día.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.byWaiter)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([waiter, w]) => (
                      <div key={waiter} className="flex items-center justify-between bg-carbon/[0.03] border border-carbon/10 rounded-lg px-3 py-2">
                        <span className="text-sm font-semibold text-carbon/75">
                          {waiter}
                          <span className="text-carbon/45"> · {w.count} pedido(s)</span>
                        </span>
                        <span className="text-sm font-bold text-carbon tabular-nums">{formatPrice(w.total)}</span>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>

          <section className="card p-5 border-2 border-carbon/15">
            <h2 className="font-bold text-carbon mb-3 flex items-center gap-2">
              <ChartBar className="w-4.5 h-4.5 text-burger" />
              Productos más vendidos
            </h2>
            {!data ? (
              <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
            ) : data.topProducts.length === 0 ? (
              <p className="text-sm text-carbon/55">Sin ventas registradas este día.</p>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((p, i) => (
                  <div key={p.productName} className="flex items-center gap-3 bg-carbon/[0.03] border border-carbon/10 rounded-lg px-3 py-2">
                    <span className="w-6 h-6 rounded-md bg-mustard border-2 border-carbon flex items-center justify-center text-[11px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-carbon/75 truncate flex-1">{p.productName}</span>
                    <span className="text-xs font-bold text-carbon/55 tabular-nums">{p.quantity} u.</span>
                    <span className="text-sm font-bold text-carbon tabular-nums w-20 text-right">{formatPrice(p.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
