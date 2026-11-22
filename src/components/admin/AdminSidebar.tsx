'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingBag,
  Settings as SettingsIcon,
  LogOut,
  ArrowLeft,
  UserRound,
  Menu,
  X,
  QrCode,
  Receipt,
  ClipboardList,
  Boxes,
  BadgePercent,
  Wallet,
  History,
} from 'lucide-react';
import { useAdminStore } from '@/store/admin-store';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAdminStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/admin123', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin123/orders', label: 'Pedidos', icon: ClipboardList },
    { href: '/admin123/products', label: 'Productos', icon: ShoppingBag },
    { href: '/admin123/inventory', label: 'Inventario', icon: Boxes },
    { href: '/admin123/promotions', label: 'Promociones', icon: BadgePercent },
    { href: '/admin123/report', label: 'Corte de Caja', icon: Receipt },
    { href: '/admin123/caja', label: 'Turnos de caja', icon: Wallet },
    { href: '/admin123/registro', label: 'Registro', icon: History },
    { href: '/admin123/qr', label: 'Códigos QR', icon: QrCode },
    { href: '/admin123/settings', label: 'Configuración', icon: SettingsIcon },
  ];

  const isActive = (href: string) =>
    href === '/admin123'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/');

  const close = () => setOpen(false);

  const navContent = (
    <>
      <div className="px-5 py-5 border-b border-carbon/10">
        <p className="eyebrow">Burger POS</p>
        <h1 className="display mt-1 text-2xl text-carbon leading-none">Administración</h1>
      </div>

      <nav className="flex-1 p-3 space-y-1" aria-label="Navegación admin">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={close}
            aria-current={isActive(l.href) ? 'page' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(l.href)
                ? 'border border-burger/40 bg-burger/10 text-burger-dark font-semibold'
                : 'border border-transparent text-carbon/65 hover:text-carbon hover:bg-carbon/[0.05]'
            }`}
          >
            <l.icon className="w-4 h-4 shrink-0" />
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t-2 border-cream/25 space-y-1">
        <button
          type="button"
          onClick={() => {
            close();
            router.push('/kitchen');
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-carbon/65 hover:text-carbon hover:bg-carbon/[0.05] w-full transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          Ir a Cocina
        </button>
        <button
          type="button"
          onClick={() => {
            close();
            router.push('/meseros');
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-carbon/65 hover:text-carbon hover:bg-carbon/[0.05] w-full transition-colors"
        >
          <UserRound className="w-4 h-4 shrink-0" />
          Ir a Meseros
        </button>
        <button
          type="button"
          onClick={() => {
            close();
            logout();
            router.push('/admin123/login');
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-carbon/65 hover:text-carbon hover:bg-carbon/[0.05] w-full transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar Sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 min-h-screen safe-top safe-bottom bg-card text-carbon flex-col border-r border-carbon/10 sticky top-0 h-screen print:hidden">
        {navContent}
      </aside>

      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 pb-3 safe-header bg-cream/80 backdrop-blur-xl border-b border-carbon/10 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-burger/40 bg-burger/10 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-burger" />
          </div>
          <span className="display text-lg text-carbon leading-none">Administración</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="w-9 h-9 rounded-lg border border-carbon/15 hover:bg-carbon/[0.06] flex items-center justify-center transition-colors"
        >
          <Menu className="w-5 h-5 text-carbon" />
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[3px] md:hidden"
            onClick={close}
          >
            <motion.aside
              role="dialog"
              aria-label="Menú admin"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 top-0 bottom-0 w-64 safe-top safe-bottom bg-card text-carbon border-r border-carbon/10 flex flex-col shadow-pop"
            >
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar menú"
                className="absolute top-3 right-3 w-8 h-8 rounded-lg border border-carbon/15 hover:bg-carbon/[0.06] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-carbon" />
              </button>
              {navContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
