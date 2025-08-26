
'use client';

import { AuthProvider } from '@/hooks/use-auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        {children}
      </div>
    </AuthProvider>
  );
}
