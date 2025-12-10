'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'superadmin') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (session?.user?.role !== 'superadmin') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <nav className="space-y-2 px-4">
          <a href="/super-admin" className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Dashboard</a>
          <a href="/super-admin/users" className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Users</a>
          <a href="/super-admin/companies" className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Companies</a>
          <a href="/super-admin/features" className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Features</a>
          <a href="/super-admin/email-tracking" className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Email Tracking</a>
          <a href="/super-admin/analytics" className="block px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">Analytics</a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
