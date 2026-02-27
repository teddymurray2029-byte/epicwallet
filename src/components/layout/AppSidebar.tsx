import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { useWallet } from '@/contexts/WalletContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Wallet,
  Activity,
  Receipt,
  QrCode,
  CreditCard,
  History,
  Coins,
  Link2,
  Rocket,
  Users,
  BookOpen,
  Shield,
  FileBarChart,
  Trophy,
  BarChart3,
  Banknote,
} from 'lucide-react';

// Provider navigation items
const providerNavItems = [
  { title: 'Dashboard', url: '/provider', icon: LayoutDashboard },
  { title: 'Rewards', url: '/provider/rewards', icon: Coins },
  { title: 'Activity', url: '/provider/activity', icon: Activity },
  { title: 'Transactions', url: '/provider/transactions', icon: Receipt },
  { title: 'Generate Invoice', url: '/provider/invoice', icon: QrCode },
  { title: 'EHR Integration', url: '/provider/ehr', icon: Link2 },
  { title: 'Virtual Card', url: '/provider/card', icon: CreditCard },
  { title: 'Cash Out', url: '/provider/offramp', icon: Banknote },
  { title: 'Leaderboard', url: '/provider/leaderboard', icon: Trophy },
  { title: 'Organization', url: '/admin/organizations', icon: Users },
  { title: 'Tutorial', url: '/tutorial', icon: BookOpen },
];

// Patient navigation items
const patientNavItems = [
  { title: 'Dashboard', url: '/patient', icon: LayoutDashboard },
  { title: 'My Rewards', url: '/patient/rewards', icon: Coins },
  { title: 'Pay Invoice', url: '/patient/pay', icon: QrCode },
  { title: 'History', url: '/patient/history', icon: History },
];

// Admin navigation items
const adminNavItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Organizations', url: '/admin/organizations', icon: Users },
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
  { title: 'Audit Logs', url: '/admin/audit-logs', icon: Shield },
  { title: 'Deploy Contract', url: '/admin/deploy', icon: Rocket },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { entity, isProvider, isPatient, isAdmin, isOrganization, isConnected, address } = useWallet();

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  const getNavItems = () => {
    if (isAdmin && isProvider) {
      const combined = [...providerNavItems];
      adminNavItems.forEach((item) => {
        if (!combined.some((p) => p.url === item.url)) {
          combined.push(item);
        }
      });
      return combined;
    }
    if (isAdmin) return adminNavItems;
    if (isProvider) return providerNavItems;
    if (isPatient) return patientNavItems;
    if (isOrganization) return adminNavItems;
    return providerNavItems;
  };

  const navItems = getNavItems();
  const groupLabel = isAdmin
    ? 'Admin Console'
    : isOrganization
      ? 'Organization'
      : isPatient
        ? 'Patient Portal'
        : 'Provider Dashboard';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/40">
        <div className="flex items-center gap-3 px-3 py-4">
          {/* Logo mark */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--care-teal))] to-[hsl(var(--care-green))] text-white shadow-[var(--shadow-glow-teal)] transition-transform duration-200 hover:scale-105">
            <svg viewBox="0 0 32 32" fill="none" className="h-5 w-5">
              <text x="3" y="23" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700" fill="white">CC</text>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
                CareWallet
              </span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-sidebar-foreground/40">
                Healthcare Rewards
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent data-tutorial="sidebar-nav" className="py-2">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1">
              {groupLabel}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <TooltipProvider delayDuration={0}>
                {navItems.map((item) => {
                  const isActive =
                    (item.url === '/provider' || item.url === '/patient' || item.url === '/admin')
                      ? location.pathname === item.url
                      : location.pathname.startsWith(item.url);

                  const dataTutorial = 
                    item.url === '/admin/organizations' ? 'organization-link' :
                    item.url === '/provider/ehr' ? 'epic-link' :
                    undefined;

                  const linkContent = (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/provider' || item.url === '/patient' || item.url === '/admin'}
                          className={`group/nav flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-primary font-medium shadow-[inset_3px_0_0_0_hsl(var(--sidebar-primary))]'
                              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                          }`}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                          data-tutorial={dataTutorial}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover/nav:text-sidebar-foreground/80'}`} />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.title}>
                        <TooltipTrigger asChild>
                          {linkContent}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40">
        <div className="px-3 py-3 space-y-1.5">
          {!collapsed && (
            <>
              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50">
                <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-[hsl(var(--care-green))] animate-pulse-ring' : 'bg-muted-foreground/50'}`} />
                <span className="font-mono text-[11px]">
                  {isConnected && address
                    ? truncateAddress(address)
                    : 'Not Connected'}
                </span>
              </div>
              <p className="text-[10px] text-sidebar-foreground/25 tracking-wider font-mono">v0.1.0 · Testnet</p>
            </>
          )}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`mx-auto h-1.5 w-1.5 rounded-full cursor-default ${isConnected ? 'bg-[hsl(var(--care-green))] animate-pulse-ring' : 'bg-muted-foreground/50'}`} />
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {isConnected && address ? truncateAddress(address) : 'Not Connected'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
