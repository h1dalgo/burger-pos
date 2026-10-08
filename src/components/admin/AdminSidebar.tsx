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
} from 'lucide-react';
import { useAdminStore } from '@/store/admin-store';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAdminStore((s) => s.logout);
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/admin123', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin123/products', label: 'Productos', icon: ShoppingBag },
    { href: '/admin123/report', label: 'Corte de Caja', icon: Receipt },
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
      <div className="p-4 border-b-2 border-cream/25">
        <h1 className="display text-xl text-cream sign leading-none">ADMIN</h1>
        <p className="text-xs text-cream/75 mt-1">Burger POS</p>
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
                ? 'bg-mustard text-carbon border-2 border-carbon shadow-card font-bold'
                : 'text-cream/80 hover:text-cream hover:bg-cream/15'
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-cream/80 hover:text-cream hover:bg-cream/15 w-full transition-colors"
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-cream/80 hover:text-cream hover:bg-cream/15 w-full transition-colors"
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-cream/80 hover:text-cream hover:bg-cream/20 w-full transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar Sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 min-h-screen bg-burger text-cream flex-col border-r-2 border-carbon sticky top-0 h-screen print:hidden">
        {navContent}
      </aside>

      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-burger border-b-2 border-carbon print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-mustard border-2 border-carbon flex items-center justify-center">
            <Menu className="w-4 h-4 text-carbon" />
          </div>
          <span className="display text-lg text-cream leading-none">ADMIN</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="w-9 h-9 rounded-lg bg-cream/20 hover:bg-cream/35 flex items-center justify-center transition-colors"
        >
          <Menu className="w-5 h-5 text-cream" />
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 md:hidden"
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
              className="absolute left-0 top-0 bottom-0 w-64 bg-burger text-cream flex flex-col shadow-pop"
            >
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar menú"
                className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-cream/20 hover:bg-cream/35 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-cream" />
              </button>
              {navContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
