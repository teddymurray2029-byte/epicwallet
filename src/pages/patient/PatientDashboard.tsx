import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import {
  Wallet, Coins, QrCode, History, ArrowRight, ShieldCheck,
} from 'lucide-react';

export default function PatientDashboard() {
  const { isConnected, address, earnedBalance, earnedBalanceLoading, onChainBalance, isContractDeployed, chainName } = useWallet();

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg py-16 text-center space-y-6 animate-fade-in-up">
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-[hsl(var(--care-teal)/0.2)] to-[hsl(var(--care-green)/0.2)] flex items-center justify-center ring-1 ring-[hsl(var(--care-teal)/0.2)]">
            <Wallet className="h-10 w-10 text-[hsl(var(--care-teal))]" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to CareWallet</h1>
          <p className="text-muted-foreground">Connect your wallet to view your CARE balance, pay invoices, and manage your healthcare rewards.</p>
          <ConnectWalletButton />
        </div>
      </DashboardLayout>
    );
  }

  const quickActions = [
    { icon: QrCode, label: 'Pay Invoice', description: 'Scan a QR code to pay', to: '/patient/pay' },
    { icon: Coins, label: 'My Rewards', description: 'View earned CARE tokens', to: '/patient/rewards' },
    { icon: History, label: 'History', description: 'Transaction history', to: '/patient/history' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">Patient Dashboard</h1>
          <p className="text-muted-foreground">Manage your CARE tokens and healthcare payments</p>
        </div>

        {/* Balance Hero */}
        <Card className="shimmer-border bg-hero-gradient border-[hsl(var(--care-teal)/0.2)] overflow-hidden relative">
          <div className="absolute inset-0 bg-card-mesh pointer-events-none" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Earned Rewards</p>
                  {earnedBalanceLoading ? (
                    <Skeleton className="h-10 w-40" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gradient inline-block">
                        {earnedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xl text-muted-foreground">CARE</span>
                    </div>
                  )}
                </div>
                {isContractDeployed && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">On-Chain Balance ({chainName})</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[hsl(var(--care-blue))]">
                        {onChainBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-lg text-muted-foreground">CARE</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="h-16 w-16 rounded-full bg-[hsl(var(--care-teal)/0.2)] flex items-center justify-center ring-1 ring-[hsl(var(--care-teal)/0.2)] shadow-[var(--shadow-glow-teal)]" style={{ animation: 'float 3s ease-in-out infinite' }}>
                <Coins className="h-8 w-8 text-[hsl(var(--care-teal))]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action, i) => (
            <Card key={action.label} className="card-interactive" style={{ animation: `fade-in-up 0.4s ease-out ${i * 80}ms both` }}>
              <CardContent className="pt-6">
                <Link to={action.to} className="flex flex-col items-center text-center gap-3 group">
                  <div className="p-3 rounded-xl bg-[hsl(var(--care-teal)/0.1)] ring-1 ring-[hsl(var(--care-teal)/0.15)] transition-transform group-hover:scale-110">
                    <action.icon className="h-6 w-6 text-[hsl(var(--care-teal))]" />
                  </div>
                  <div>
                    <p className="font-semibold">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[hsl(var(--care-teal))] transition-colors" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* HIPAA note */}
        <Card variant="glass" className="border-[hsl(var(--care-teal)/0.15)]">
          <CardContent className="pt-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-[hsl(var(--care-teal))] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Your data is secure</p>
              <p className="text-xs text-muted-foreground">CareWallet never stores personal health information on-chain. Only de-identified hashes are recorded for auditability.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
