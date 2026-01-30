import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';

type WalletProtectedRouteProps = {
  children: ReactNode;
  requireEntity?: boolean;
};

export function WalletProtectedRoute({ children, requireEntity = true }: WalletProtectedRouteProps) {
  const { isConnected, entity, entityLoading, isConnecting } = useWallet();

  if (isConnecting || entityLoading) {
    return null;
  }

  if (!isConnected) {
    return <Navigate to="/provider" replace />;
  }

  if (requireEntity && !entity) {
    return <Navigate to="/provider" replace />;
  }

  return <>{children}</>;
}
