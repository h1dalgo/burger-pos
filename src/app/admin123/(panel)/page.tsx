'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    Promise.all([fetch('/api/orders'), fetch('/api/products')])
      .then(([ordersRes, productsRes]) =>
        Promise.all([
          ordersRes.ok ? ordersRes.json() : null,
          productsRes.ok ? productsRes.json() : null,
        ])
      )
      .then(([ordersData, productsData]) => {
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
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
  const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();
  const todayOrders = orders?.filter((o) => isToday(o.createdAt)) ?? [];
  const revenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const avgTicket = todayOrders.length > 0 ? revenue / todayOrders.length : 0;
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
      icon: TrendingUp,
      tone: 'text-mint',
      chip: 'bg-mint/12 border-mint/25 text-mint',
    },
    {
      label: 'Pedidos de hoy',
      value: String(todayOrders.length),
      sub: `${formatPrice(avgTicket)} promedio`,
      icon: Receipt,
      tone: 'text-mustard',
      chip: 'bg-mustard/15 border-mustard/30 text-mustard',
    },
    {
      label: 'En cocina',
      value: String(inKitchen),
      icon: ChefHat,
      tone: 'text-status-preparing',
      chip: 'bg-status-preparing/15 border-status-preparing/30 text-status-preparing',
    },
    {
      label: 'Productos agotados',
      value: String(unavailable),
      icon: AlertTriangle,
      tone: unavailable > 0 ? 'text-rose' : 'text-white/50',
      chip: unavailable > 0 ? 'bg-rose/12 border-rose/25 text-rose' : 'bg-white/5 border-white/10 text-white/50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow text-burger">Panel de control</span>
        <h1 className="display text-4xl text-white leading-none mt-1.5">DASHBOARD</h1>
        <p className="text-sm text-white/40 mt-1">Resumen del negocio en tiempo real</p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 bg-rose/10 border border-rose/30 text-rose px-4 py-3 rounded-xl text-sm font-semibold">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            No pudimos cargar las métricas
          </span>
          <Button variant="outline" size="sm" className="text-rose" onClick={retry}>
            Reintentar
          </Button>
        </div>
      )}

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
                className="card card-dark hover:shadow-lift transition-shadow p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${kpi.chip}`}>
                    <kpi.icon className="w-4 h-4" />
                  </span>
                  <span className="eyebrow text-white/35 text-right">{kpi.label}</span>
                </div>
                <div>
                  <p className={`display text-4xl leading-none tabular-nums ${kpi.tone}`}>{kpi.value}</p>
                  {'sub' in kpi && kpi.sub && <p className="text-xs text-white/40 mt-1.5">{kpi.sub}</p>}
                </div>
              </motion.div>
            ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickLinks.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card card-dark lift lift-brand p-5 flex items-start gap-4 group"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-burger/25 to-mustard/15 border border-burger/25 flex items-center justify-center shrink-0">
              <c.icon className="w-5 h-5 text-mustard" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-semibold group-hover:text-mustard transition-colors">{c.label}</h2>
              <p className="text-white/40 text-sm mt-0.5">{c.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/25 ml-auto mt-1 shrink-0 group-hover:text-mustard group-hover:translate-x-1 transition-[color,transform] duration-200" />
          </Link>
        ))}
      </div>

      <div className="card card-dark overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <div>
            <span className="eyebrow text-white/35">Actividad</span>
            <h2 className="font-bold text-white leading-tight">Pedidos recientes</h2>
          </div>
          <Link href="/kitchen" className="text-xs font-semibold text-mustard hover:underline">
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
          <EmptyState dark compact icon={<Receipt className="w-7 h-7" />} title="Aún no hay pedidos" />
        ) : (
          <div className="divide-y divide-white/6">
            {recentOrders.map((o) => {
              const meta = getStatusMeta(o.status);
              return (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.035]">
                  <span className="display text-lg text-white/80 w-14 shrink-0">#{formatDisplayId(o.displayId)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{o.customerName}</p>
                    <p className="text-xs text-white/40">Mesa {o.tableNumber}</p>
                  </div>
                  <span className={`badge ${meta.badge} hidden sm:inline-flex`}>{meta.title}</span>
                  <span className="text-sm font-bold text-mustard tabular-nums w-20 text-right shrink-0">
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
