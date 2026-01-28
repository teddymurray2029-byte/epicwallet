import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, CheckCircle, AlertCircle, Coins, Loader2 } from 'lucide-react';

export function WalletStatusCard() {
  const { address, isConnected, entity, entityLoading, careBalance, balanceLoading } = useWallet();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Connect your wallet to view your dashboard
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Wallet Status</CardTitle>
          <Badge 
            variant={entity?.is_verified ? 'default' : 'secondary'}
            className={entity?.is_verified ? 'bg-care-green' : ''}
          >
            {entity?.is_verified ? (
              <>
                <CheckCircle className="mr-1 h-3 w-3" />
                Verified
              </>
            ) : (
              <>
                <AlertCircle className="mr-1 h-3 w-3" />
                Unverified
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Address</span>
          <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
            {address ? truncateAddress(address) : '—'}
          </code>
        </div>

        {/* Entity Type */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Role</span>
          <Badge variant="outline" className="capitalize">
            {entityLoading ? 'Loading...' : entity?.entity_type || 'Not Registered'}
          </Badge>
        </div>

        {/* Display Name */}
        {entity?.display_name && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{entity.display_name}</span>
          </div>
        )}

        {/* CARE Token Balance */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-care-teal" />
              <span className="text-sm font-medium">CARE Balance</span>
            </div>
            <div className="text-right">
              {balanceLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <span className="text-2xl font-bold text-care-teal">
                    {careBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">CARE</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}