import React from 'react';
import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
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
  epic: 'Epic Integration',
  organizations: 'Organizations',
  invites: 'Invites',
  deploy: 'Deploy Contract',
  organization: 'Organization',
  policies: 'Policies',
  oracles: 'Oracle Keys',
  monitoring: 'Monitoring',
  settings: 'Settings',
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
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-muted/60 to-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Decorative gradient orbs */}
          <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,hsl(var(--care-teal)/0.07)_0%,transparent_70%)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-60 -left-40 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,hsl(var(--care-green)/0.05)_0%,transparent_70%)] blur-3xl" />

          {/* Header */}
          <header className="sticky top-0 z-40 bg-card/80 shadow-[var(--shadow-card)] backdrop-blur-xl">
            <div className="flex h-14 sm:h-16 items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <SidebarTrigger className="md:hidden" />
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

              <div className="flex items-center gap-3" data-tutorial="connect-wallet">
                <ConnectWalletButton />
              </div>
            </div>
            {/* Gradient accent line */}
            <div className="h-px bg-gradient-to-r from-transparent via-[hsl(var(--care-teal)/0.4)] to-transparent" />
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 relative">
            <div className="h-full animate-fade-in-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
