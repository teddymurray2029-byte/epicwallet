import React from 'react';
import { ReactNode } from 'react';
import {
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
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
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
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
            <div className="h-full animate-fade-in-up rounded-2xl border border-border/40 bg-gradient-to-br from-card/90 via-card/70 to-card/80 p-4 shadow-[var(--shadow-elevated)] backdrop-blur-lg md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
