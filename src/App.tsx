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
import EpicIntegration from "./pages/provider/EpicIntegration";
import DeployContract from "./pages/admin/DeployContract";
import OrganizationInvites from "./pages/organization/OrganizationInvites";
import AcceptInvite from "./pages/invites/AcceptInvite";

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
                path="/provider/epic"
                element={
                  <WalletProtectedRoute>
                    <EpicIntegration />
                  </WalletProtectedRoute>
                }
              />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<Navigate to="/admin/organizations" replace />} />
              <Route path="/admin/deploy" element={<DeployContract />} />
              <Route path="/admin/organizations" element={<OrganizationInvites />} />

              {/* Invite Routes */}
              <Route path="/invite/:token" element={<AcceptInvite />} />
              
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
