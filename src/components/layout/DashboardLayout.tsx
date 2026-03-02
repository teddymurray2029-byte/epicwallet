import React from 'react';
import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { HipaaNotice } from './HipaaNotice';

interface DashboardLayoutProps {
  children: ReactNode;
}

const routeLabels: Record<string, string> = {
  provider: 'Provider',
  patient: 'Patient',
  admin: 'Admin',
  rewards: 'Rewards',
  activity: 'Activity',
  transactions: 'Transactions',
  invoice: 'Invoice',
  card: 'Card',
  organizations: 'Organizations',
  deploy: 'Deploy',
  pay: 'Pay',
  history: 'History',
  'audit-logs': 'Audit Logs',
  ehr: 'EHR',
  offramp: 'Cash Out',
  leaderboard: 'Leaderboard',
  analytics: 'Analytics',
  tutorial: 'Tutorial',
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const breadcrumbs = segments.map((seg, i) => ({
    label: routeLabels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    path: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/40">
            <div className="flex h-12 items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                {breadcrumbs.length > 0 && (
                  <Breadcrumb className="hidden sm:block">
                    <BreadcrumbList>
                      {breadcrumbs.map((crumb, i) => (
                        <React.Fragment key={crumb.path}>
                          {i > 0 && <BreadcrumbSeparator />}
                          <BreadcrumbItem>
                            {crumb.isLast ? (
                              <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link to={crumb.path}>{crumb.label}</Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </React.Fragment>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                )}
              </div>
              <div data-tutorial="connect-wallet">
                <ConnectWalletButton />
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6" key={location.pathname}>
            {children}
          </main>

          <HipaaNotice />
        </div>
      </div>
    </SidebarProvider>
  );
}
