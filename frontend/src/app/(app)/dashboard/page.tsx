'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { KitchenDashboard } from '@/components/dashboard/kitchen-dashboard';
import { DispatchDashboard } from '@/components/dashboard/dispatch-dashboard';
import { DriverDashboard } from '@/components/dashboard/driver-dashboard';
import { ShieldAlert } from 'lucide-react';

export default function DashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  // The authenticated user's role name selects the presentation only; every
  // dashboard API is still protected by permissions on the backend.
  const roleName = user.role;

  if (roleName === 'ADMIN') {
    return <AdminDashboard />;
  }
  
  if (roleName === 'KITCHEN') {
    return <KitchenDashboard />;
  }

  if (roleName === 'DISPATCH') {
    return <DispatchDashboard />;
  }

  if (roleName === 'DRIVER') {
    return <DriverDashboard />;
  }

  // Safe fallback for unrecognized or custom roles
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl text-center mx-auto mt-20">
        <div className="mb-5 mx-auto grid size-12 place-items-center rounded-full bg-orange-100 text-orange-600">
          <ShieldAlert aria-hidden="true" className="size-6" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">No dashboard configured</h2>
        <p className="mt-2 text-muted-foreground">
          Your current role ({roleName || 'Unknown'}) does not have a dedicated operational dashboard.
          Use the navigation menu to access available features.
        </p>
      </div>
    </div>
  );
}
