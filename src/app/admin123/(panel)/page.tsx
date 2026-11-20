'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CountUp from '@/components/reactbits/CountUp';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  UtensilsCrossed,
  Package,
  TrendingUp,
  Receipt,
  ChefHat,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Order, Category } from '@/types';
import { getStatusMeta, formatDisplayId } from '@/lib/order-status';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Category[] | null>(null);
  const [today, setToday] = useState<{ revenue: number; count: number; avgTicket: number; avgRating: number | null; ratingCount: number } | null>(null);
  const [lowStock, setLowStock] = useState<{ name: string; quantity: number; unit: string }[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);
    Promise.all([
      fetch('/api/orders'),
      fetch('/api/products'),
      fetch(`/api/admin/report?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`),
      fetch('/api/admin/inventory'),
    ])
      .then(([ordersRes, productsRes, reportRes, invRes]) =>
        Promise.all([
          ordersRes.ok ? ordersRes.json() : null,
          productsRes.ok ? productsRes.json() : null,
          reportRes.ok ? reportRes.json() : null,
          invRes.ok ? invRes.json() : [],
        ])
      )
      .then(([ordersData, productsData, reportData, invData]) => {
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setToday(reportData);
        setLowStock(Array.isArray(invData) ? invData.filter((i: { quantity: number; lowAt: number }) => i.quantity <= i.lowAt) : []);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setError(false);
    load();
  };

  const loading = orders === null || products === null;
  const allProducts = products?.flatMap((c) => c.products) ?? [];
  // ventas de hoy: pedidos pagados (incluye los ya entregados)
  const revenue = today?.revenue ?? 0;
  const avgTicket = today?.avgTicket ?? 0;
  const inKitchen = orders?.filter((o) => o.status === 'PENDING' || o.status === 'IN_PREPARATION').length ?? 0;
  const unavailable = allProducts.filter((p) => !p.isAvailable).length;
  const recentOrders = (orders ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const quickLinks = [
    { href: '/admin123/products', icon: ShoppingBag, label: 'Productos', desc: 'Gestionar el menú' },
    { href: '/kitchen', icon: UtensilsCrossed, label: 'Cocina', desc: 'Ver pedidos en vivo' },
    { href: '/menu', icon: Package, label: 'Vista Cliente', desc: 'Ver el menú como cliente' },
  ];

  const kpis = [
    {
      label: 'Ingresos de hoy',
      value: formatPrice(revenue),
      count: { to: revenue, prefix: '$', decimals: 2 },
      icon: TrendingUp,
      chip: 'bg-mint/15 border-mint/60 text-mint-ink',
    },
    {
      label: 'Pedidos de hoy',
      value: String(today?.count ?? 0),
      count: { to: today?.count ?? 0, prefix: '', decimals: 0 },
      sub: `${formatPrice(avgTicket)} promedio`,
      icon: Receipt,
      chip: 'bg-burger/10 border-burger/40 text-burger',
    },
    {
      label: 'En cocina',
      value: String(inKitchen),
      count: { to: inKitchen, prefix: '', decimals: 0 },
      icon: ChefHat,
      chip: 'bg-status-preparing/15 border-status-preparing/60 text-status-preparing',
    },
    {
      label: 'Productos agotados',
      value: String(unavailable),
      count: { to: unavailable, prefix: '', decimals: 0 },
      icon: AlertTriangle,
      chip: unavailable > 0 ? 'bg-rose/10 border-rose/50 text-rose' : 'bg-carbon/8 border-carbon/25 text-carbon/60',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-4xl text-carbon sign-yellow leading-none">Panel general</h1>
        <p className="text-sm text-carbon/65 mt-2">Resumen del negocio en tiempo real</p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 bg-rose/10 border-2 border-rose/40 text-rose px-4 py-3 rounded-xl text-sm font-semibold">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            No pudimos cargar las métricas
          </span>
          <Button variant="outline" size="sm" className="text-rose" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}

      {lowStock.length > 0 && (
        <Link href="/admin123/inventory" className="flex items-start gap-3 rounded-2xl border border-rose/35 bg-rose/10 px-4 py-3 text-sm text-rose transition-colors hover:bg-rose/15">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <b>Inventario bajo:</b> {lowStock.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
          </span>
        </Link>
      )}
      {today?.avgRating ? (
        <p className="text-sm text-carbon/65">
          Calificación de hoy: <b className="text-burger-dark">{today.avgRating.toFixed(1)} / 5</b> ({today.ratingCount} opinión(es))
        </p>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : kpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ delay: 0.05 + i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="card hover:shadow-lift transition-shadow p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 ${kpi.chip}`}>
                    <kpi.icon className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold uppercase text-carbon/70 text-right">{kpi.label}</span>
                </div>
                <div>
                  <p className="display text-4xl leading-none tabular-nums text-carbon" aria-label={kpi.value}>
                    {/* el número sube al cargar (React Bits) */}
                    <CountUp to={kpi.count.to} prefix={kpi.count.prefix} decimals={kpi.count.decimals} separator="," duration={0.9} trigger="load" />
                  </p>
                  {'sub' in kpi && kpi.sub && <p className="text-xs text-carbon/60 mt-1.5">{kpi.sub}</p>}
                </div>
              </motion.div>
            ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickLinks.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card lift lift-brand p-5 flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-xl bg-mustard border-2 border-carbon flex items-center justify-center shrink-0">
              <c.icon className="w-5 h-5 text-carbon" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-carbon group-hover:text-burger transition-colors">{c.label}</h2>
              <p className="text-carbon/65 text-sm mt-0.5">{c.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-carbon/45 ml-auto mt-1 shrink-0 group-hover:text-burger group-hover:translate-x-1 transition-[color,transform] duration-200" />
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-carbon/15 flex items-center justify-between gap-3">
          <h2 className="font-bold text-carbon leading-tight">Pedidos recientes</h2>
          <Link href="/kitchen" className="text-xs font-bold text-azul hover:underline">
            Ver en cocina
          </Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <EmptyState compact icon={<Receipt className="w-7 h-7" />} title="Aún no hay pedidos" />
        ) : (
          <div className="divide-y divide-carbon/10">
            {recentOrders.map((o) => {
              const meta = getStatusMeta(o.status);
              return (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-carbon/[0.04]">
                  <span className="display text-lg text-carbon/80 w-14 shrink-0">#{formatDisplayId(o.displayId)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-carbon truncate">{o.customerName}</p>
                    <p className="text-xs text-carbon/60">Mesa {o.tableNumber}</p>
                  </div>
                  <span className={`badge ${meta.badge} hidden sm:inline-flex`}>{meta.title}</span>
                  <span className="text-sm font-bold text-carbon tabular-nums w-20 text-right shrink-0">
                    {formatPrice(Number(o.totalAmount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
