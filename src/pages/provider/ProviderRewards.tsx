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
import { MOCK_REWARDS_SUMMARY, MOCK_REWARDS_BY_EVENT_TYPE, MOCK_REWARD_POLICIES } from '@/lib/mockData';

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
          <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to view your rewards.</p>
        </div>
      </DashboardLayout>
    );
  }

  const isSummaryMock = !summaryLoading && (!summary || (summary.totalEarned === 0 && summary.pendingRewards === 0));
  const displaySummary = isSummaryMock ? MOCK_REWARDS_SUMMARY : summary;

  const isByEventMock = !byEventLoading && (!byEventType || byEventType.length === 0);
  const displayByEvent = isByEventMock ? MOCK_REWARDS_BY_EVENT_TYPE : byEventType;

  const isPoliciesMock = !policiesLoading && (!policies || policies.length === 0);
  const displayPolicies = isPoliciesMock ? MOCK_REWARD_POLICIES : policies;

  const totalEarned = displaySummary?.totalEarned ?? 0;
  const nextMilestone = Math.ceil(totalEarned / 1000) * 1000 || 1000;
  const milestoneProgress = (totalEarned / nextMilestone) * 100;

  const stats = [
    { label: 'Total Earned', value: displaySummary?.totalEarned ?? 0, icon: Coins, color: 'text-[hsl(var(--care-teal))]', bgColor: 'bg-[hsl(var(--care-teal)/0.1)]', borderColor: 'border-t-[hsl(var(--care-teal))]' },
    { label: 'This Month', value: displaySummary?.thisMonth ?? 0, icon: Calendar, color: 'text-[hsl(var(--care-green))]', bgColor: 'bg-[hsl(var(--care-green)/0.1)]', borderColor: 'border-t-[hsl(var(--care-green))]' },
    { label: 'This Week', value: displaySummary?.thisWeek ?? 0, icon: TrendingUp, color: 'text-[hsl(var(--care-blue))]', bgColor: 'bg-[hsl(var(--care-blue)/0.1)]', borderColor: 'border-t-[hsl(var(--care-blue))]' },
    { label: 'Pending', value: displaySummary?.pendingRewards ?? 0, icon: Clock, color: 'text-[hsl(var(--care-warning))]', bgColor: 'bg-[hsl(var(--care-warning)/0.1)]', borderColor: 'border-t-[hsl(var(--care-warning))]' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">Rewards</h1>
          <p className="text-muted-foreground">Track your CareCoin earnings from healthcare documentation</p>
        </div>

        {/* Current Balance Hero */}
        <Card className="shimmer-border bg-hero-gradient border-[hsl(var(--care-teal)/0.2)] overflow-hidden relative">
          <div className="absolute inset-0 bg-card-mesh pointer-events-none" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Earned Rewards (Claimable)</p>
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
                <div>
                  <p className="text-sm text-muted-foreground mb-1">On-Chain Balance ({chainName})</p>
                  <div className="flex items-baseline gap-2">
                    {!isContractDeployed ? (
                      <span className="text-lg text-muted-foreground">Contract not deployed</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-[hsl(var(--care-blue))]">
                          {onChainBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-lg text-muted-foreground">CARE</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="h-16 w-16 rounded-full bg-[hsl(var(--care-teal)/0.2)] flex items-center justify-center ring-1 ring-[hsl(var(--care-teal)/0.2)] shadow-[var(--shadow-glow-teal)]" style={{ animation: 'float 3s ease-in-out infinite' }}>
                <Coins className="h-8 w-8 text-[hsl(var(--care-teal))]" />
              </div>
            </div>

            {/* Milestone progress */}
            <div className="mt-6 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Progress to {nextMilestone.toLocaleString()} CARE</span>
                <span>{milestoneProgress.toFixed(0)}%</span>
              </div>
              <Progress value={milestoneProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={stat.label} className={`border-t-2 ${stat.borderColor} card-interactive ${isSummaryMock ? 'opacity-75' : ''}`} style={{ animation: `fade-in-up 0.4s ease-out ${index * 80}ms both` }}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  {isSummaryMock && index === 0 && (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider ml-auto">Sample</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {summaryLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <p className={`text-xl font-bold ${stat.color}`}>
                    {stat.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          <RewardsChart />

          <Card className={isByEventMock ? 'opacity-75' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Earnings by Event Type
                </CardTitle>
                {isByEventMock && <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Sample Data</Badge>}
              </div>
              <CardDescription>Breakdown of your rewards by documentation type</CardDescription>
            </CardHeader>
            <CardContent>
              {byEventLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : displayByEvent && displayByEvent.length > 0 ? (
                <div className="space-y-3">
                  {displayByEvent.map((item, index) => {
                    const IconComp = eventTypeIcons[item.eventType] || FileText;
                    return (
                      <div
                        key={item.eventType}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/20 transition-all duration-200 hover:bg-muted/60 hover:shadow-sm"
                        style={{ animation: `fade-in-up 0.3s ease-out ${index * 50}ms both` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-md bg-[hsl(var(--care-teal)/0.1)]">
                            <IconComp className="h-4 w-4 text-[hsl(var(--care-teal))]" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.eventType}</p>
                            <p className="text-xs text-muted-foreground">{item.count} events</p>
                          </div>
                        </div>
                        <p className="font-bold text-[hsl(var(--care-teal))]">
                          {item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} CARE
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No earnings data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start documenting to earn CARE tokens</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Reward Policies */}
        <Card className={isPoliciesMock ? 'opacity-75' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Active Reward Policies
                </CardTitle>
                <CardDescription>Current reward rates for documentation events (10% network fee applied)</CardDescription>
              </div>
              {isPoliciesMock && <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">Sample Data</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {policiesLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : displayPolicies && displayPolicies.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {displayPolicies.map((policy, index) => {
                  const eventKey = policy.event_type as string;
                  const IconComp = eventTypeIcons[eventKey] || FileText;
                  return (
                    <div
                      key={policy.id}
                      className="p-4 rounded-lg border border-border/40 bg-card border-l-4 border-l-[hsl(var(--care-teal))] card-interactive"
                      style={{ animation: `scale-pop 0.35s ease-out ${index * 60}ms both` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-[hsl(var(--care-teal)/0.1)]">
                          <IconComp className="h-3.5 w-3.5 text-[hsl(var(--care-teal))]" />
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {policy.event_type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-[hsl(var(--care-teal))]">{policy.base_reward} CARE</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Provider: {policy.provider_split}% • Org: {policy.organization_split}% • Patient: {policy.patient_split}%
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
