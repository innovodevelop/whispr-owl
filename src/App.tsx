import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CryptoAuthProvider, useCryptoAuth } from "@/hooks/useCryptoAuth";
import { PinPrompt } from "@/components/PinPrompt";
import { usePinGate } from "@/hooks/usePinGate";
import { CryptoAuthFlow } from "./pages/CryptoAuthFlow";
import Index from "./pages/Index";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import Financial from "./pages/Financial";
import NotFound from "./pages/NotFound";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading, isAuthenticated } = useCryptoAuth();

  console.log("ProtectedRoute: loading=", loading, "isAuthenticated=", isAuthenticated);

  if (loading) {
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

  if (!isAuthenticated) {
    console.log("ProtectedRoute: Redirecting to crypto auth");
    return <CryptoAuthFlow />;
  }

  console.log("ProtectedRoute: Showing protected content");
  return <>{children}</>;
};

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CryptoAuthProvider>
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </CryptoAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
