import { roleMetadata } from '@/lib/role-manifest';

/** Instalada desde aquí, la app abre directo en Administración. */
export const metadata = roleMetadata('admin');

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
