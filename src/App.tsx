import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CryptoAuthProvider, useCryptoAuth } from "@/hooks/useCryptoAuth";
import { LegacyMigrationProvider, useLegacyMigration } from "@/hooks/useLegacyMigration";
import { LegacyMigrationFlow } from "@/components/migration/LegacyMigrationFlow";
import { PinPrompt } from "@/components/PinPrompt";
import { usePinGate } from "@/hooks/usePinGate";
import { CryptoAuthFlow } from "./pages/CryptoAuthFlow";
import Index from "./pages/Index";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import Financial from "./pages/Financial";
import DeviceManagement from "./pages/DeviceManagement";
import NotFound from "./pages/NotFound";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

const queryClient = new QueryClient();

const App = () => {
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { loading: cryptoLoading, isAuthenticated } = useCryptoAuth();
    const { needsMigration, loading: migrationLoading } = useLegacyMigration();

    console.log("ProtectedRoute: cryptoLoading=", cryptoLoading, "migrationLoading=", migrationLoading, "isAuthenticated=", isAuthenticated, "needsMigration=", needsMigration);

    // Show loading while checking authentication status
    if (cryptoLoading || migrationLoading) {
      console.log("ProtectedRoute: Showing loading state");
      return (
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Initializing secure authentication...</p>
          </div>
        </div>
      );
    }

    // Priority 1: Migration needed (legacy user without crypto identity)
    if (needsMigration) {
      console.log("ProtectedRoute: Redirecting to migration flow");
      return <LegacyMigrationFlow />;
    }

    // Priority 2: Not crypto authenticated (new user or returning crypto user)
    if (!isAuthenticated) {
      console.log("ProtectedRoute: Redirecting to crypto auth");
      return <CryptoAuthFlow />;
    }

    // Priority 3: Fully authenticated, show protected content
    console.log("ProtectedRoute: Showing protected content");
    return <>{children}</>;
  };

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CryptoAuthProvider>
            <LegacyMigrationProvider>
              <TooltipProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/auth" element={<CryptoAuthFlow />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    } />
                    <Route path="/contacts" element={
                      <ProtectedRoute>
                        <Contacts />
                      </ProtectedRoute>
                    } />
                    <Route path="/financial" element={
                      <ProtectedRoute>
                        <Financial />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings/devices" element={
                      <ProtectedRoute>
                        <DeviceManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
                <Toaster />
                <Sonner />
              </TooltipProvider>
            </LegacyMigrationProvider>
          </CryptoAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
