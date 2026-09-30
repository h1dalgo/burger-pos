'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
    { label: 'Ingresos de hoy', value: formatPrice(revenue), icon: TrendingUp, tone: 'text-mint' },
    {
      label: 'Pedidos de hoy',
      value: String(todayOrders.length),
      sub: `${formatPrice(avgTicket)} promedio`,
      icon: Receipt,
      tone: 'text-mustard',
    },
    { label: 'En cocina', value: String(inKitchen), icon: ChefHat, tone: 'text-status-preparing' },
    { label: 'Productos agotados', value: String(unavailable), icon: AlertTriangle, tone: unavailable > 0 ? 'text-rose' : 'text-white/50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl text-white leading-none">DASHBOARD</h1>
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
          : kpis.map((kpi) => (
              <div key={kpi.label} className="card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/40">{kpi.label}</span>
                  <kpi.icon className={`w-4 h-4 ${kpi.tone}`} />
                </div>
                <p className={`text-2xl font-bold tabular-nums ${kpi.tone}`}>{kpi.value}</p>
                {'sub' in kpi && kpi.sub && (
                  <p className="text-xs text-white/40">{kpi.sub}</p>
                )}
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickLinks.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card p-5 flex items-start gap-4 hover:border-burger transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-burger/15 flex items-center justify-center shrink-0">
              <c.icon className="w-5 h-5 text-burger" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-semibold group-hover:text-mustard transition-colors">{c.label}</h2>
              <p className="text-white/40 text-sm mt-0.5">{c.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/25 ml-auto mt-1 shrink-0 group-hover:text-mustard transition-colors" />
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="font-bold text-white">Pedidos recientes</h2>
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
                <div key={o.id} className="flex items-center gap-3 px-5 py-3">
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
