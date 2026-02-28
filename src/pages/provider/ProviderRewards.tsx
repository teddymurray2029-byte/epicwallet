import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useWallet } from '@/contexts/WalletContext';
import { useRewardsSummary, useRewardsByEventType, useRewardPolicies } from '@/hooks/useRewardsData';
import { RewardsChart } from '@/components/provider/RewardsChart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Coins, TrendingUp, Calendar, Clock, Award, Percent,
  FileText, Pill, ClipboardList, ListChecks, ShieldCheck,
  HeartPulse, Code, UserCheck, Handshake, PhoneCall
} from 'lucide-react';

const eventTypeIcons: Record<string, React.ElementType> = {
  encounter_note: FileText,
  medication_reconciliation: Pill,
  discharge_summary: ClipboardList,
  problem_list_update: ListChecks,
  orders_verified: ShieldCheck,
  preventive_care: HeartPulse,
  coding_finalized: Code,
  intake_completed: UserCheck,
  consent_signed: Handshake,
  follow_up_completed: PhoneCall,
};

export default function ProviderRewards() {
  const { entity, isConnected, earnedBalance, earnedBalanceLoading, onChainBalance, isContractDeployed, chainName } = useWallet();
  const { data: summary, isLoading: summaryLoading } = useRewardsSummary();
  const { data: byEventType, isLoading: byEventLoading } = useRewardsByEventType();
  const { data: policies, isLoading: policiesLoading } = useRewardPolicies();

  if (!isConnected || !entity) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Coins className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Connect your wallet to view rewards.</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalEarned = summary?.totalEarned ?? 0;
  const nextMilestone = Math.ceil(totalEarned / 1000) * 1000 || 1000;
  const milestoneProgress = (totalEarned / nextMilestone) * 100;

  const stats = [
    { label: 'Total Earned', value: summary?.totalEarned ?? 0, icon: Coins, color: 'text-care-teal' },
    { label: 'This Month', value: summary?.thisMonth ?? 0, icon: Calendar, color: 'text-care-green' },
    { label: 'This Week', value: summary?.thisWeek ?? 0, icon: TrendingUp, color: 'text-care-blue' },
    { label: 'Pending', value: summary?.pendingRewards ?? 0, icon: Clock, color: 'text-care-warning' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Rewards</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your CARE token earnings</p>
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
                <div>
                  <p className="text-xs text-muted-foreground mb-1">On-Chain ({chainName})</p>
                  {!isContractDeployed ? (
                    <span className="text-sm text-muted-foreground">Not deployed</span>
                  ) : (
                    <p className="text-xl font-bold text-care-blue">
                      {onChainBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      <span className="text-sm text-muted-foreground font-normal ml-2">CARE</span>
                    </p>
                  )}
                </div>
              </div>
              <Coins className="h-10 w-10 text-care-teal/30" />
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Progress to {nextMilestone.toLocaleString()} CARE</span>
                <span>{milestoneProgress.toFixed(0)}%</span>
              </div>
              <Progress value={milestoneProgress} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                {summaryLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className={`text-lg font-bold ${stat.color}`}>
                    {stat.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <RewardsChart />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Earnings by Type
              </CardTitle>
              <CardDescription>Breakdown by documentation type</CardDescription>
            </CardHeader>
            <CardContent>
              {byEventLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : byEventType && byEventType.length > 0 ? (
                <div className="space-y-2">
                  {byEventType.map((item) => {
                    const IconComp = eventTypeIcons[item.eventType] || FileText;
                    return (
                      <div key={item.eventType} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                        <div className="flex items-center gap-2.5">
                          <IconComp className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">{item.eventType}</p>
                            <p className="text-xs text-muted-foreground">{item.count} events</p>
                          </div>
                        </div>
                        <p className="font-bold text-care-teal">{item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No earnings yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Policies */}
        {policies && policies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Reward Policies
              </CardTitle>
              <CardDescription>Current rates · 10% network fee</CardDescription>
            </CardHeader>
            <CardContent>
              {policiesLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {policies.map((policy) => {
                    const eventKey = policy.event_type as string;
                    const IconComp = eventTypeIcons[eventKey] || FileText;
                    return (
                      <div key={policy.id} className="p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <IconComp className="h-3.5 w-3.5 text-primary" />
                          <Badge variant="outline" className="text-xs capitalize">
                            {policy.event_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-xl font-bold text-care-teal">{policy.base_reward} CARE</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          P:{policy.provider_split}% · O:{policy.organization_split}% · Pt:{policy.patient_split}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
