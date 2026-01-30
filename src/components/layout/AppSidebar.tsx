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
  LayoutDashboard,
  FileText,
  Wallet,
  TrendingUp,
  Settings,
  Shield,
  Users,
  Activity,
  Receipt,
  QrCode,
  History,
  Coins,
  Link2,
  UserPlus,
} from 'lucide-react';

// Provider navigation items
const providerNavItems = [
  { title: 'Dashboard', url: '/provider', icon: LayoutDashboard },
  { title: 'Rewards', url: '/provider/rewards', icon: Coins },
  { title: 'Activity', url: '/provider/activity', icon: Activity },
  { title: 'Transactions', url: '/provider/transactions', icon: Receipt },
  { title: 'Epic Connection', url: '/provider/epic', icon: Link2 },
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
  { title: 'Invites', url: '/organization/invites', icon: UserPlus },
  { title: 'Policies', url: '/admin/policies', icon: FileText },
  { title: 'Oracle Keys', url: '/admin/oracles', icon: Shield },
  { title: 'Monitoring', url: '/admin/monitoring', icon: TrendingUp },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { entity, isProvider, isPatient, isAdmin, isOrganization, isConnected } = useWallet();

  // Determine which nav items to show based on entity type
  const getNavItems = () => {
    if (isAdmin) return adminNavItems;
    if (isProvider) return providerNavItems;
    if (isPatient) return patientNavItems;
    if (isOrganization) return adminNavItems; // Organizations see admin-like view
    // Default: show provider dashboard for unregistered wallets
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
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-care-green via-care-blue to-care-green text-sidebar-primary-foreground shadow-sm">
            <span className="text-lg">💚🪙</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">
                CareCoin <span className="text-base">✨</span>
              </span>
              <span className="text-xs font-medium tracking-wide text-sidebar-foreground/60">
                Care<span className="text-care-green">💖</span>Coin Rewards
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/provider' || item.url === '/patient' || item.url === '/admin'}
                      className="flex items-center gap-3 hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-3">
          {!collapsed && (
            <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-care-green' : 'bg-muted-foreground'}`} />
              <span>{isConnected ? 'Wallet Connected' : 'Not Connected'}</span>
            </div>
          )}
          {collapsed && (
            <div className={`mx-auto h-2 w-2 rounded-full ${isConnected ? 'bg-care-green' : 'bg-muted-foreground'}`} />
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
