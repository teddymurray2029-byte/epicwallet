import React from 'react';
import { useLocation } from 'react-router-dom';
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
  Users,
  BookOpen,
  Shield,
  BarChart3,
  Banknote,
  Trophy,
  Rocket,
} from 'lucide-react';

const providerNavItems = [
  { title: 'Dashboard', url: '/provider', icon: LayoutDashboard },
  { title: 'Rewards', url: '/provider/rewards', icon: Coins },
  { title: 'Activity', url: '/provider/activity', icon: Activity },
  { title: 'Transactions', url: '/provider/transactions', icon: Receipt },
  { title: 'Invoice', url: '/provider/invoice', icon: QrCode },
  { title: 'EHR', url: '/provider/ehr', icon: Link2 },
  { title: 'Leaderboard', url: '/provider/leaderboard', icon: Trophy },
  { title: 'Cash Out', url: '/provider/offramp', icon: Banknote },
];

const patientNavItems = [
  { title: 'Dashboard', url: '/patient', icon: LayoutDashboard },
  { title: 'Rewards', url: '/patient/rewards', icon: Coins },
  { title: 'Pay', url: '/patient/pay', icon: QrCode },
  { title: 'History', url: '/patient/history', icon: History },
];

const adminNavItems = [
  { title: 'Organizations', url: '/admin/organizations', icon: Users },
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
  { title: 'Audit Logs', url: '/admin/audit-logs', icon: Shield },
  { title: 'Deploy', url: '/admin/deploy', icon: Rocket },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { isProvider, isPatient, isAdmin, isOrganization, isConnected, address } = useWallet();

  const truncAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  const getNavItems = () => {
    if (isAdmin && isProvider) return [...providerNavItems, ...adminNavItems.filter(a => !providerNavItems.some(p => p.url === a.url))];
    if (isAdmin) return adminNavItems;
    if (isProvider) return providerNavItems;
    if (isPatient) return patientNavItems;
    if (isOrganization) return adminNavItems;
    return providerNavItems;
  };

  const navItems = getNavItems();
  const groupLabel = isAdmin ? 'Admin' : isOrganization ? 'Organization' : isPatient ? 'Patient' : 'Provider';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/30">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
            CW
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">
              CareWallet
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent data-tutorial="sidebar-nav" className="py-1">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-0.5">
              {groupLabel}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <TooltipProvider delayDuration={0}>
                {navItems.map((item) => {
                  const isActive =
                    ['/provider', '/patient', '/admin'].includes(item.url)
                      ? location.pathname === item.url
                      : location.pathname.startsWith(item.url);

                  const dataTutorial =
                    item.url === '/admin/organizations' ? 'organization-link' :
                    item.url === '/provider/ehr' ? 'epic-link' :
                    undefined;

                  const link = (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={['/provider', '/patient', '/admin'].includes(item.url)}
                          className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                          }`}
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                          data-tutorial={dataTutorial}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/40'}`} />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.title}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">{item.title}</TooltipContent>
                      </Tooltip>
                    );
                  }
                  return link;
                })}
              </TooltipProvider>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/30">
        <div className="px-3 py-2">
          {!collapsed && (
            <div className="flex items-center gap-2 text-xs text-sidebar-foreground/40">
              <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
              <span className="font-mono text-[11px]">
                {isConnected && address ? truncAddr(address) : 'Not Connected'}
              </span>
            </div>
          )}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`mx-auto h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {isConnected && address ? truncAddr(address) : 'Not Connected'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
