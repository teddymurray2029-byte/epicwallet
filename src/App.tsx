import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';
import { WalletProvider } from '@/contexts/WalletContext';
import { WalletProtectedRoute } from "@/components/auth/WalletProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderRewards from "./pages/provider/ProviderRewards";
import ProviderActivity from "./pages/provider/ProviderActivity";
import ProviderTransactions from "./pages/provider/ProviderTransactions";
import ProviderInvoice from "./pages/provider/ProviderInvoice";
import EhrIntegration from "./pages/provider/EhrIntegration";
import VirtualCard from "./pages/provider/VirtualCard";
import DeployContract from "./pages/admin/DeployContract";
import AuditLogs from "./pages/admin/AuditLogs";
import OrganizationAnalytics from "./pages/admin/OrganizationAnalytics";
import RewardsLeaderboard from "./pages/provider/RewardsLeaderboard";
import InviteAcceptLegacy from "./pages/InviteAccept";
import OrganizationInvites from "./pages/organization/OrganizationInvites";
import AcceptInvite from "./pages/invites/AcceptInvite";
import Tutorial from "./pages/Tutorial";
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientRewards from "./pages/patient/PatientRewards";
import PatientHistory from "./pages/patient/PatientHistory";
import PatientPay from "./pages/patient/PatientPay";

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              
              {/* Provider Routes */}
              <Route path="/provider" element={<ProviderDashboard />} />
              <Route
                path="/provider/rewards"
                element={
                  <WalletProtectedRoute>
                    <ProviderRewards />
                  </WalletProtectedRoute>
                }
              />
              <Route
                path="/provider/activity"
                element={
                  <WalletProtectedRoute>
                    <ProviderActivity />
                  </WalletProtectedRoute>
                }
              />
              <Route
                path="/provider/transactions"
                element={
                  <WalletProtectedRoute>
                    <ProviderTransactions />
                  </WalletProtectedRoute>
                }
              />
              <Route
                path="/provider/ehr"
                element={
                  <WalletProtectedRoute>
                    <EhrIntegration />
                  </WalletProtectedRoute>
                }
              />
              <Route
                path="/provider/card"
                element={
                  <WalletProtectedRoute>
                    <VirtualCard />
                  </WalletProtectedRoute>
                }
              />
              <Route path="/provider/leaderboard" element={<RewardsLeaderboard />} />
              <Route path="/provider/epic" element={<Navigate to="/provider/ehr" replace />} />
              <Route
                path="/provider/invoice"
                element={
                  <WalletProtectedRoute>
                    <ProviderInvoice />
                  </WalletProtectedRoute>
                }
              />
              
              {/* Patient Routes */}
              <Route path="/patient" element={<PatientDashboard />} />
              <Route path="/patient/rewards" element={<PatientRewards />} />
              <Route path="/patient/pay" element={<PatientPay />} />
              <Route path="/patient/history" element={<PatientHistory />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<Navigate to="/admin/organizations" replace />} />
              <Route path="/admin/deploy" element={<DeployContract />} />
              <Route path="/admin/organizations" element={<OrganizationInvites />} />
              <Route path="/admin/audit-logs" element={<AuditLogs />} />
              <Route path="/admin/analytics" element={<OrganizationAnalytics />} />

              {/* Invite Routes */}
              <Route path="/invites/accept" element={<AcceptInvite />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              
              {/* Tutorial */}
              <Route path="/tutorial" element={<Tutorial />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
