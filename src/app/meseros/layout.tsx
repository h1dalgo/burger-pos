import { roleMetadata } from '@/lib/role-manifest';

/** Instalada desde aquí, la app abre directo en Meseros. */
export const metadata = roleMetadata('meseros');

export default function MeserosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
