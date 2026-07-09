'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminStore } from '@/store/admin-store';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuth = useAdminStore((s) => s.isAuth);

  useEffect(() => {
    if (!isAuth && pathname !== '/admin123/login') {
      router.push('/admin123/login');
    }
  }, [isAuth, pathname, router]);

  if (!isAuth) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#0F0F23]">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
