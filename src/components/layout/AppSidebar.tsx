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
} from 'lucide-react';

// Provider navigation items
const providerNavItems = [
  { title: 'Dashboard', url: '/provider', icon: LayoutDashboard },
  { title: 'Rewards', url: '/provider/rewards', icon: Coins },
  { title: 'Activity', url: '/provider/activity', icon: Activity },
  { title: 'Transactions', url: '/provider/transactions', icon: Receipt },
  { title: 'EHR Integration', url: '/provider/ehr', icon: Link2 },
  { title: 'Virtual Card', url: '/provider/card', icon: CreditCard },
  { title: 'Organization', url: '/admin/organizations', icon: Users },
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
  { title: 'Deploy Contract', url: '/admin/deploy', icon: Rocket },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { entity, isProvider, isPatient, isAdmin, isOrganization, isConnected, address } = useWallet();

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  // Determine which nav items to show based on entity type
  // Admins who are also providers see everything
  const getNavItems = () => {
    if (isAdmin && isProvider) {
      // Merge provider + admin items, avoiding duplicate Dashboard
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
      <SidebarHeader className="border-b border-sidebar-border/60 bg-gradient-to-b from-sidebar-accent/30 to-transparent">
        <div className="flex items-center gap-3 px-2 py-3">
          {/* Professional SVG logo mark */}
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--care-teal))] via-[hsl(var(--care-blue))] to-[hsl(var(--care-green))] text-white shadow-[0_2px_8px_hsl(180_45%_35%/0.3)] transition-transform duration-200 hover:scale-105">
            <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6">
              <text x="3" y="23" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700" fill="white">CC</text>
            </svg>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">
                CareCoin
              </span>
              <span className="text-xs font-medium tracking-wide text-sidebar-foreground/60">
                Healthcare Rewards
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent data-tutorial="sidebar-nav">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>}
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
                          className={`flex items-center gap-3 transition-all duration-200 hover:bg-sidebar-accent hover:translate-x-0.5 rounded-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                            isActive ? 'bg-sidebar-accent text-sidebar-primary font-medium border-l-2 border-[hsl(var(--sidebar-primary))] rounded-l-none' : ''
                          }`}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium rounded-md"
                          data-tutorial={dataTutorial}
                        >
                          <item.icon className={`h-4 w-4 transition-colors ${isActive ? 'text-sidebar-primary' : ''}`} />
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

      <SidebarFooter className="border-t border-sidebar-border/60 bg-gradient-to-t from-sidebar-accent/20 to-transparent">
        <div className="px-2 py-3 space-y-2">
          {!collapsed && (
            <>
              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-[hsl(var(--care-green))] animate-pulse-ring' : 'bg-muted-foreground'}`} />
                <span>
                  {isConnected && address
                    ? truncateAddress(address)
                    : 'Not Connected'}
                </span>
              </div>
              <p className="text-[10px] text-sidebar-foreground/30 tracking-wider">v0.1.0 · Testnet</p>
            </>
          )}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`mx-auto h-2 w-2 rounded-full cursor-default ${isConnected ? 'bg-[hsl(var(--care-green))] animate-pulse-ring' : 'bg-muted-foreground'}`} />
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
