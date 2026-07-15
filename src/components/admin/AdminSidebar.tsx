'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Settings as SettingsIcon, LogOut, ArrowLeft, UserRound } from 'lucide-react';
import { useAdminStore } from '@/store/admin-store';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAdminStore((s) => s.logout);

  const links = [
    { href: '/admin123', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin123/products', label: 'Productos', icon: ShoppingBag },
    { href: '/admin123/waiter', label: 'Mesero', icon: UserRound },
    { href: '/admin123/settings', label: 'Configuración', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>ADMIN</h1>
        <p className="text-xs text-gray-500">Burger POS</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + '/');
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? 'bg-[#E85D04] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-700 space-y-1">
        <button
          onClick={() => router.push('/kitchen')}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          Ir a Cocina
        </button>
        <button
          onClick={() => { logout(); router.push('/admin123/login'); }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-[#EF476F] hover:bg-gray-800 w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
