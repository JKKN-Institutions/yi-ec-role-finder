import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { RoleProvider } from "@/contexts/RoleContext";
import Index from "./pages/Index";
import Assessment from "./pages/Assessment";
import Results from "./pages/Results";
import ThankYou from "./pages/ThankYou";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import Admin from "./pages/Admin";
import CandidateProfile from "./pages/CandidateProfile";
import AdminScoreComparison from "./pages/AdminScoreComparison";
import AdminAdaptiveAnalytics from "./pages/AdminAdaptiveAnalytics";
import AdminAdaptiveTest from "./pages/AdminAdaptiveTest";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ImpersonationBanner />
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/assessment/:id" element={<Assessment />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/results/:id" element={<Results />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/candidates" element={<Admin />} />
            <Route path="/admin/comparison" element={<Admin />} />
            <Route path="/admin/analytics" element={<Admin />} />
            <Route path="/admin/validation" element={<Admin />} />
            <Route path="/admin/tracking" element={<Admin />} />
            <Route path="/admin/verticals" element={<Admin />} />
            <Route path="/admin/roles" element={<Admin />} />
            <Route path="/admin/activity-log" element={<Admin />} />
            <Route path="/admin/adaptive-analytics" element={<AdminAdaptiveAnalytics />} />
            <Route path="/admin/adaptive-test" element={<AdminAdaptiveTest />} />
            <Route path="/admin/score-comparison" element={<AdminScoreComparison />} />
            <Route path="/admin/super-dashboard" element={<SuperAdminDashboard />} />
            <Route path="/admin/candidate/:assessmentId" element={<CandidateProfile />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RoleProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
