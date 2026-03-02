import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Coins,
  ShieldCheck,
  Zap,
  TrendingUp,
  Building2,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  FileText,
  Repeat,
  Heart,
} from 'lucide-react';

const STEPS = [
  {
    icon: FileText,
    title: 'Document Care',
    description:
      'Complete clinical documentation — encounter notes, discharge summaries, medication reconciliation — through your existing EHR.',
  },
  {
    icon: Coins,
    title: 'Earn CARE Tokens',
    description:
      'Every verified documentation event automatically mints CARE tokens. High-value events like discharge summaries earn up to 1,500 CARE.',
  },
  {
    icon: DollarSign,
    title: 'Cash Out Anytime',
    description:
      'Convert CARE to USD and withdraw to your bank account. No lockups, no vesting. Your work, your money.',
  },
];

const VALUE_PROPS = [
  {
    icon: TrendingUp,
    title: 'Earn $400–$800+/Day',
    description:
      'Active providers documenting 80-100 events daily earn well above traditional RN, therapist, and even physician salaries.',
  },
  {
    icon: ShieldCheck,
    title: 'HIPAA-Compliant',
    description:
      'Only de-identified hashes are stored on-chain. Zero PHI exposure. Built for healthcare from day one.',
  },
  {
    icon: Zap,
    title: 'Instant Verification',
    description:
      'Oracle-attested events are verified in seconds, not weeks. No claim forms, no denials, no waiting.',
  },
  {
    icon: Building2,
    title: 'Organization Rewards',
    description:
      'Practices and health systems earn a split on every event their providers document. Align incentives across the org.',
  },
];

const EARNINGS = [
  { event: 'Discharge Summary', care: '1,500', usd: '$9.00' },
  { event: 'Preventive Care', care: '1,200', usd: '$7.20' },
  { event: 'Encounter Note', care: '1,000', usd: '$6.00' },
  { event: 'Coding Finalized', care: '800', usd: '$4.80' },
  { event: 'Med Reconciliation', care: '750', usd: '$4.50' },
  { event: 'Orders Verified', care: '600', usd: '$3.60' },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">CareWallet</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/patient">
              <Button variant="ghost" size="sm">Patient Portal</Button>
            </Link>
            <Link to="/provider">
              <Button variant="gradient" size="sm">Provider Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Coins className="h-4 w-4" />
              Now earning up to $800+/day
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Get <span className="text-gradient">Paid More</span> for the Care You Already Deliver
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              CareWallet rewards providers with CARE tokens for every verified clinical documentation event.
              Earn above traditional salaries — nurses, therapists, and physicians alike.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link to="/provider">
                <Button variant="gradient" size="lg" className="text-base px-8">
                  Start Earning <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="text-base px-8">
                  How It Works
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="bg-muted/50 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center space-y-4 mb-10">
            <h2 className="text-3xl font-bold">See CareWallet in Action</h2>
            <p className="text-muted-foreground">Watch how providers are earning more for the documentation they already do.</p>
          </div>
          <div className="mx-auto max-w-md">
            <div className="relative overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-elevated)] bg-card aspect-[9/16]">
              <iframe
                src="https://www.youtube.com/embed/m4g6RagB3bg"
                title="CareWallet Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground">Three steps. No new workflows. Just more income.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <Card key={step.title} className="relative overflow-hidden">
                <div className="absolute top-4 right-4 text-5xl font-black text-primary/10">
                  {i + 1}
                </div>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Value of CARE */}
      <section className="bg-muted/50 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">What Makes CARE Valuable?</h2>
            <p className="text-muted-foreground">
              CARE tokens are backed by verified clinical work — real documentation events attested by on-chain oracles.
              Each token represents measurable healthcare value delivered.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((vp) => (
              <Card key={vp.title} className="h-full">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <vp.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{vp.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{vp.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Table */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center space-y-4 mb-10">
            <h2 className="text-3xl font-bold">Earnings Per Event</h2>
            <p className="text-muted-foreground">
              At 1 CARE = $0.01 USD with a 60% provider split, here's what you earn per completed event.
            </p>
          </div>

          <div className="mx-auto max-w-lg">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {EARNINGS.map((row) => (
                    <div
                      key={row.event}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{row.event}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-primary">{row.usd}</span>
                        <span className="text-xs text-muted-foreground ml-2">({row.care} CARE)</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    An active provider completing <strong className="text-foreground">80–100 events/day</strong> earns
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">$400 – $800+ / day</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Token Cycle */}
      <section className="bg-muted/50 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center space-y-4 mb-10">
            <h2 className="text-3xl font-bold">The CARE Ecosystem</h2>
            <p className="text-muted-foreground">
              A virtuous cycle that rewards every participant in the care delivery chain.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Heart,
                title: 'Providers',
                split: '60%',
                desc: 'Earn the largest share for every documented clinical event. Your work, your reward.',
              },
              {
                icon: Repeat,
                title: 'Organizations',
                split: '30%',
                desc: 'Practices and health systems earn a split for supporting quality documentation.',
              },
              {
                icon: Coins,
                title: 'Patients',
                split: '10%',
                desc: 'Patients earn CARE for participating in their care — consent, intake, follow-ups.',
              },
            ].map((role) => (
              <Card key={role.title}>
                <CardContent className="pt-6 space-y-3 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <role.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{role.title}</h3>
                  <p className="text-3xl font-bold text-primary">{role.split}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{role.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to Earn What You Deserve?</h2>
            <p className="text-lg text-muted-foreground">
              Join hundreds of providers already earning above traditional salaries with CareWallet.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/provider">
                <Button variant="gradient" size="lg" className="text-base px-8">
                  Open Provider Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/patient">
                <Button variant="outline" size="lg" className="text-base px-8">
                  I'm a Patient
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <span>CareWallet © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" />
            <span>HIPAA-compliant · No PHI on-chain</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
