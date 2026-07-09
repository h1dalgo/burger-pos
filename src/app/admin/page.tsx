'use client';

import Link from 'next/link';
import { ShoppingBag, UtensilsCrossed, Package } from 'lucide-react';

export default function AdminDashboard() {
  const cards = [
    { href: '/admin/products', icon: ShoppingBag, label: 'Productos', desc: 'Gestionar el menú' },
    { href: '/kitchen', icon: UtensilsCrossed, label: 'Cocina', desc: 'Ver pedidos en vivo' },
    { href: '/menu', icon: Package, label: 'Vista Cliente', desc: 'Ver el menú como cliente' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>DASHBOARD</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800 hover:border-[#E85D04] transition-all group"
          >
            <c.icon className="w-8 h-8 text-[#E85D04] mb-3" />
            <h2 className="text-white font-semibold group-hover:text-[#E85D04] transition-colors">{c.label}</h2>
            <p className="text-gray-500 text-sm mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
