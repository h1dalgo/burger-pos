'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Receipt, TrendingUp, HandCoins, ShoppingBag, Printer, ChartBar, Download, BadgePercent, Star } from 'lucide-react';
import { formatBs, formatPrice } from '@/lib/utils';
import BarChart from '@/components/admin/BarChart';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

type Period = 'day' | 'week' | 'month';
const PERIODS: { value: Period; label: string; days: number }[] = [
  { value: 'day', label: 'Día', days: 1 },
  { value: 'week', label: '7 días', days: 7 },
  { value: 'month', label: '30 días', days: 30 },
];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface ReportData {
  count: number;
  cancelled: number;
  revenueBs: number;
  exchangeRate: number;
  discounts: number;
  avgRating: number | null;
  ratingCount: number;
  byHour: { hour: number; count: number; total: number }[];
  byWeekday: { day: number; count: number; total: number }[];
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

// el período termina en la fecha elegida (incluida)
const range = (dateStr: string, p: Period) => {
  const days = PERIODS.find((x) => x.value === p)!.days;
  const end = new Date(new Date(`${dateStr}T00:00:00`).getTime() + 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return `start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
};

export default function ReportPage() {
  const [date, setDate] = useState(todayStr());
  const [period, setPeriod] = useState<Period>('day');
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback((dateStr: string, p: Period) => {
    fetch(`/api/admin/report?${range(dateStr, p)}`)
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
    load(date, period);
  }, [date, period, load]);

  const kpis = [
    { label: 'Ventas', value: formatPrice(data?.revenue ?? 0), sub: data?.revenueBs ? formatBs(data.revenueBs) : null, icon: TrendingUp, chip: 'bg-mint/15 border-mint/60 text-mint-ink' },
    { label: 'Propinas', value: formatPrice(data?.tips ?? 0), sub: null, icon: HandCoins, chip: 'bg-burger/10 border-burger/40 text-burger' },
    { label: 'Pedidos', value: String(data?.count ?? 0), sub: data?.cancelled ? `${data.cancelled} cancelado(s)` : null, icon: Receipt, chip: 'bg-status-pending/10 border-status-pending/40 text-status-pending' },
    { label: 'Ticket promedio', value: formatPrice(data?.avgTicket ?? 0), sub: null, icon: ShoppingBag, chip: 'bg-azul/10 border-azul/40 text-azul' },
    { label: 'Descuentos', value: formatPrice(data?.discounts ?? 0), sub: 'promociones y cupones', icon: BadgePercent, chip: 'bg-burger/10 border-burger/40 text-burger' },
    {
      label: 'Calificación',
      value: data?.avgRating ? `${data.avgRating.toFixed(1)} / 5` : '—',
      sub: data?.ratingCount ? `${data.ratingCount} opinión(es)` : 'sin opiniones',
      icon: Star,
      chip: 'bg-burger/10 border-burger/40 text-burger',
    },
  ];
  const periodLabel = period === 'day' ? 'del día' : period === 'week' ? 'de los últimos 7 días' : 'de los últimos 30 días';
  const money = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${Math.round(v)}`);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="display text-3xl text-carbon sign-yellow">Corte de Caja</h1>
          <p className="text-sm text-carbon/60 mt-1">Ventas, propinas y meseros {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Fecha del corte"
            className="field"
          />
          <div className="flex rounded-full border border-carbon/15 p-0.5" role="radiogroup" aria-label="Período">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={period === p.value}
                onClick={() => setPeriod(p.value)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${period === p.value ? 'bg-burger/15 text-burger-dark' : 'text-carbon/60 hover:text-carbon'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <a href={`/api/admin/report?${range(date, period)}&format=csv`} download className="btn btn-outline">
            <Download className="w-4 h-4" />
            Excel
          </a>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {error ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title="No pudimos cargar el corte"
          description="Reintenta en unos segundos."
          action={
            <Button onClick={() => load(date, period)} className="mt-3">
              Reintentar
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
                  <>
                    <p className="display text-2xl text-carbon mt-1 tabular-nums">{kpi.value}</p>
                    {kpi.sub && <p className="text-[11px] text-carbon/50 tabular-nums">{kpi.sub}</p>}
                  </>
                ) : (
                  <span className="inline-block w-24 h-7 skeleton mt-1" />
                )}
              </motion.div>
            ))}
          </div>

          {data && (
            <div className={`grid gap-4 ${period === 'day' ? '' : 'md:grid-cols-2'}`}>
              <BarChart
                title="Ventas por hora"
                subtitle="Para saber cuándo llega más gente"
                format={money}
                labelEvery={3}
                data={data.byHour.map((h) => ({ label: `${h.hour}h`, value: h.total, detail: `${h.count} pedido(s)` }))}
              />
              {period !== 'day' && (
                <BarChart
                  title="Ventas por día de la semana"
                  subtitle="Qué días se vende más"
                  format={money}
                  data={data.byWeekday.map((d) => ({ label: WEEKDAYS[d.day], value: d.total, detail: `${d.count} pedido(s)` }))}
                />
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <section className="card p-5 border-2 border-carbon/15">
              <h2 className="font-bold text-carbon mb-3">Por método de pago</h2>
              {!data ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
              ) : Object.keys(data.byMethod).length === 0 ? (
                <p className="text-sm text-carbon/55">Sin ventas en este período.</p>
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
                <p className="text-sm text-carbon/55">Sin pedidos en este período.</p>
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
              <p className="text-sm text-carbon/55">Sin ventas en este período.</p>
            ) : (
              <div className="space-y-2">
                {data.topProducts.map((p, i) => (
                  <div key={p.productName} className="flex items-center gap-3 bg-carbon/[0.03] border border-carbon/10 rounded-lg px-3 py-2">
                    <span className="w-6 h-6 rounded-md border border-carbon/20 flex items-center justify-center text-[11px] font-bold shrink-0 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-carbon/75 truncate">{p.productName}</span>
                      <span className="mt-1 block h-1.5 rounded-full bg-carbon/[0.06]" aria-hidden="true">
                        <span className="block h-full rounded-full bg-burger" style={{ width: `${(p.quantity / data.topProducts[0].quantity) * 100}%` }} />
                      </span>
                    </span>
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
