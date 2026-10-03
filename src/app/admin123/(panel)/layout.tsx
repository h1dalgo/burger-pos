'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen page-dark flex flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
