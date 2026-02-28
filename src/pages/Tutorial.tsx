import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Wallet,
  UserPlus,
  Users,
  Link2,
  Coins,
  Activity,
  CreditCard,
  Rocket,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

const quickStartSteps = [
  { icon: Wallet, label: 'Connect Wallet', anchor: '#step-1' },
  { icon: UserPlus, label: 'Register', anchor: '#step-2' },
  { icon: Link2, label: 'Connect EHR', anchor: '#step-4' },
  { icon: Coins, label: 'Earn Rewards', anchor: '#step-5' },
];

interface TutorialStepProps {
  number: number;
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  linkTo?: string;
  linkLabel?: string;
}

function TutorialStep({ number, id, icon: Icon, title, children, linkTo, linkLabel }: TutorialStepProps) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <Badge className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--care-teal))] to-[hsl(var(--care-green))] text-sm font-bold text-primary-foreground border-0">
          {number}
        </Badge>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-[hsl(var(--care-teal))]" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pl-[4.5rem]">
        {children}
        {linkTo && (
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link to={linkTo}>
              {linkLabel ?? 'Go to page'} <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface FaqItemProps {
  question: string;
  answer: string;
}

function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--care-teal))]" />
        <CardTitle className="text-base">{question}</CardTitle>
      </CardHeader>
      <CardContent className="pl-11 text-sm text-muted-foreground">
        {answer}
      </CardContent>
    </Card>
  );
}

export default function Tutorial() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-10">
        {/* Hero */}
        <section className="space-y-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Getting Started with <span className="text-gradient">CareWallet</span>
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            CareWallet rewards healthcare providers with CARE tokens for clinical documentation.
            Follow these steps to set up your account, connect your EHR, and start earning.
          </p>

          {/* Quick start cards */}
          <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {quickStartSteps.map((s) => (
              <a
                key={s.label}
                href={s.anchor}
                className="group flex flex-col items-center gap-2 rounded-lg border border-border/40 bg-card/60 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <s.icon className="h-6 w-6 text-[hsl(var(--care-teal))] transition-transform group-hover:scale-110" />
                <span className="text-xs font-medium">{s.label}</span>
              </a>
            ))}
          </div>
        </section>

        <Separator />

        {/* Steps */}
        <section className="space-y-6">
          <TutorialStep number={1} id="step-1" icon={Wallet} title="Connect Your Wallet">
            <ul className="list-inside space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Install <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 inline-flex items-center gap-1">MetaMask <ExternalLink className="h-3 w-3" /></a> or any WalletConnect-compatible wallet.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Click <strong>"Connect MetaMask"</strong> in the dashboard header.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Supported networks: <strong>Polygon</strong> and <strong>Polygon Amoy</strong> (testnet).</li>
            </ul>
          </TutorialStep>

          <TutorialStep number={2} id="step-2" icon={UserPlus} title="Register as a Provider" linkTo="/provider" linkLabel="Open Dashboard">
            <ul className="list-inside space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> After connecting your wallet, the dashboard will prompt you to register.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Choose an existing organization or create a new one.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Click <strong>"Register as Provider"</strong> to complete setup.</li>
            </ul>
          </TutorialStep>

          <TutorialStep number={3} id="step-3" icon={Users} title="Join or Manage an Organization" linkTo="/admin/organizations" linkLabel="Organizations">
            <ul className="list-inside space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> <strong>Admins</strong> can create invite links and manage EHR credentials.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> <strong>Providers</strong> accept invite links to join an organization.</li>
            </ul>
          </TutorialStep>

          <TutorialStep number={4} id="step-4" icon={Link2} title="Connect Your EHR (Epic / PointClickCare)" linkTo="/provider/ehr" linkLabel="EHR Integration">
            <ul className="list-inside space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Navigate to the <strong>EHR Integration</strong> page.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Click <strong>"Connect"</strong> next to your EHR system (Epic or PointClickCare).</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Authorize via the OAuth flow — your credentials stay secure.</li>
            </ul>
          </TutorialStep>

          <TutorialStep number={5} id="step-5" icon={Coins} title="Earn and Track Rewards" linkTo="/provider/rewards" linkLabel="View Rewards">
            <ul className="list-inside space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Documentation events automatically earn <strong>CARE tokens</strong>.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> View your rewards breakdown on the <Link to="/provider/rewards" className="text-primary underline underline-offset-2">Rewards</Link> page.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Monitor real-time activity on the <Link to="/provider/activity" className="text-primary underline underline-offset-2">Activity</Link> page.</li>
            </ul>
          </TutorialStep>

          <TutorialStep number={6} id="step-6" icon={CreditCard} title="Virtual Visa Card" linkTo="/provider/card" linkLabel="Virtual Card">
            <ul className="list-inside space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Create a virtual Visa card from your dashboard.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Convert CARE tokens to USD.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--care-green))]" /> Spend anywhere Visa is accepted.</li>
            </ul>
          </TutorialStep>

          <TutorialStep number={7} id="step-7" icon={Rocket} title="Deploy CareWallet Contract (Admin)" linkTo="/admin/deploy" linkLabel="Deploy Contract">
            <p className="text-sm text-muted-foreground">
              Organization admins can deploy the CareWallet smart contract on-chain. This is only needed once per network deployment.
            </p>
          </TutorialStep>
        </section>

        <Separator />

        {/* FAQ */}
        <section id="faq" className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Frequently Asked Questions</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FaqItem
              question="What if I lose access to my wallet?"
              answer="Your CARE tokens live on the blockchain tied to your wallet address. Use your wallet's recovery phrase to restore access. Never share your recovery phrase with anyone."
            />
            <FaqItem
              question="How are reward amounts determined?"
              answer="Rewards are based on documentation event type and your organization's reward policy. Each event type (encounter notes, medication reconciliation, etc.) has a configurable base reward and provider/patient/organization split."
            />
            <FaqItem
              question="Is my data HIPAA-compliant?"
              answer="Yes. CareWallet enforces a 15-minute inactivity timeout, encrypts data in transit, and never stores PHI on-chain. Only de-identified event hashes are recorded to the blockchain."
            />
            <FaqItem
              question="Which EHR systems are supported?"
              answer="CareWallet currently supports Epic and PointClickCare via OAuth-based integrations. More EHR systems are planned for future releases."
            />
          </div>
        </section>

        {/* Bottom CTA */}
        <Card className="text-center">
          <CardContent className="py-8 space-y-3">
            <ShieldCheck className="mx-auto h-8 w-8 text-[hsl(var(--care-teal))]" />
            <p className="font-semibold">Ready to get started?</p>
            <p className="text-sm text-muted-foreground">Connect your wallet and start earning CARE tokens today.</p>
            <Button asChild variant="gradient">
              <Link to="/provider">Go to Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
