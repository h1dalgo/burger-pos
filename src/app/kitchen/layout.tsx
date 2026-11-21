import { roleMetadata } from '@/lib/role-manifest';

/** Instalada desde aquí, la app abre directo en Cocina. */
export const metadata = roleMetadata('cocina');

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
