import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, CheckCircle, AlertCircle, Coins, Loader2 } from 'lucide-react';

export function WalletStatusCard() {
  const { address, isConnected, entity, entityLoading, earnedBalance, earnedBalanceLoading, onChainBalance, onChainBalanceLoading, isContractDeployed, chainName } = useWallet();

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!isConnected) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground text-center">Connect your wallet to view your dashboard</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Wallet</CardTitle>
          <Badge variant={entity?.is_verified ? 'default' : 'secondary'}>
            {entity?.is_verified ? (
              <><CheckCircle className="mr-1 h-3 w-3" />Verified</>
            ) : (
              <><AlertCircle className="mr-1 h-3 w-3" />Unverified</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Address</span>
          <code className="font-mono bg-muted px-2.5 py-1 rounded-md text-xs">{address ? truncateAddress(address) : '—'}</code>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Role</span>
          <Badge variant="outline" className="capitalize">
            {entityLoading ? 'Loading...' : entity?.entity_type || 'Not Registered'}
          </Badge>
        </div>

        {entity?.display_name && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{entity.display_name}</span>
          </div>
        )}

        <div className="pt-3 border-t space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-care-teal" />
              <span className="text-sm">Earned</span>
            </div>
            {earnedBalanceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="text-lg font-bold text-care-teal">
                {earnedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-normal">CARE</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-care-blue" />
              <span className="text-sm">On-Chain</span>
              <span className="text-xs text-muted-foreground">({chainName})</span>
            </div>
            {onChainBalanceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : !isContractDeployed ? (
              <span className="text-xs text-muted-foreground">Not deployed</span>
            ) : (
              <span className="text-lg font-bold text-care-blue">
                {onChainBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs text-muted-foreground font-normal">CARE</span>
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
