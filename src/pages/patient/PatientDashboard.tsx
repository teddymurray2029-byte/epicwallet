import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet } from '@/contexts/WalletContext';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { Wallet, Coins, QrCode, History, ArrowRight, ShieldCheck } from 'lucide-react';

export default function PatientDashboard() {
  const { isConnected, earnedBalance, earnedBalanceLoading, onChainBalance, isContractDeployed, chainName } = useWallet();

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-sm py-16 text-center space-y-5">
          <Wallet className="h-10 w-10 text-primary mx-auto" />
          <div>
            <h1 className="text-xl font-semibold">Welcome to CareWallet</h1>
            <p className="text-sm text-muted-foreground mt-1">Connect your wallet to view balances and manage rewards.</p>
          </div>
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
        <div>
          <h1 className="text-2xl font-semibold">Patient Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your CARE tokens and healthcare payments</p>
        </div>

        {/* Balance */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Earned Rewards</p>
                  {earnedBalanceLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <p className="text-3xl font-bold text-care-teal">
                      {earnedBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      <span className="text-base text-muted-foreground font-normal ml-2">CARE</span>
                    </p>
                  )}
                </div>
                {isContractDeployed && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">On-Chain ({chainName})</p>
                    <p className="text-xl font-bold text-care-blue">
                      {onChainBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      <span className="text-sm text-muted-foreground font-normal ml-2">CARE</span>
                    </p>
                  </div>
                )}
              </div>
              <Coins className="h-10 w-10 text-care-teal/30" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.to}>
              <Card className="h-full hover:border-primary/30 transition-colors">
                <CardContent className="pt-5 pb-5 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* HIPAA note */}
        <Card>
          <CardContent className="pt-4 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Your data is secure</p>
              <p className="text-xs text-muted-foreground">CareWallet never stores personal health information on-chain. Only de-identified hashes are recorded.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
