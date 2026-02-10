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
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/40 bg-card/80 shadow-[var(--shadow-card)] backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <div className="hidden md:flex items-center gap-2">
                  {/* Logo and title in header for context */}
                </div>
              </div>

              <div className="flex items-center gap-3" data-tutorial="connect-wallet">
                <ConnectWalletButton />
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="h-full rounded-2xl border border-border/40 bg-gradient-to-br from-card/90 via-card/70 to-card/80 p-4 shadow-[var(--shadow-elevated)] backdrop-blur-lg md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
