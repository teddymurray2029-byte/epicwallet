import React, { useState } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, Check, Smartphone, Loader2 } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

export function ConnectWalletButton() {
  const { connectors, connect, isPending } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { entity, earnedBalance, earnedBalanceLoading } = useWallet();
  const [copied, setCopied] = useState(false);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openPolygonscan = () => {
    if (address) {
      window.open(`https://polygonscan.com/address/${address}`, '_blank');
    }
  };

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-care-green animate-pulse-glow" />
              <span className="font-mono text-sm">{truncateAddress(address)}</span>
              {entity && (
                <span className="text-xs text-muted-foreground capitalize">
                  ({entity.entity_type})
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-2">
            <p className="text-sm font-medium">Connected Wallet</p>
            <p className="text-xs text-muted-foreground font-mono">{truncateAddress(address)}</p>
            <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Earned Rewards</span>
              {earnedBalanceLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-sm font-semibold text-care-teal">
                  {earnedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                </span>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={copyAddress}>
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-care-green" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? 'Copied!' : 'Copy Address'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openPolygonscan}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Polygonscan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Wallet className="h-4 w-4" />
          Connect Wallet
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {connectors.map((connector) => (
          <DropdownMenuItem
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
          >
            {connector.name === 'WalletConnect' ? (
              <Smartphone className="mr-2 h-4 w-4" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            {connector.name === 'Injected' ? 'Browser Wallet' : connector.name}
            {isPending && ' (connecting...)'}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}