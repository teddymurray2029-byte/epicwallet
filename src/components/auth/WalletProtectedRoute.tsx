import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Loader2 } from 'lucide-react';

type WalletProtectedRouteProps = {
  children: ReactNode;
  requireEntity?: boolean;
};

export function WalletProtectedRoute({ children, requireEntity = true }: WalletProtectedRouteProps) {
  const { isConnected, entity, entityLoading, isConnecting } = useWallet();

  if (isConnecting || entityLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--care-teal))] via-[hsl(var(--care-blue))] to-[hsl(var(--care-green))] text-white shadow-[var(--shadow-glow-teal)] animate-scale-pop">
          <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7">
            <text x="3" y="23" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700" fill="white">CC</text>
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return <Navigate to="/provider" replace />;
  }

  if (requireEntity && !entity) {
    return <Navigate to="/provider" replace />;
  }

  return <>{children}</>;
}
