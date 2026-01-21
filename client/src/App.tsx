import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { useOrganisation } from "@/hooks/use-organisation";
import { LoadingPage } from "@/components/LoadingSpinner";
import Landing from "@/pages/Landing";
import OrganisationSetup from "@/pages/OrganisationSetup";
import Students from "@/pages/Students";
import StudentDashboard from "@/pages/StudentDashboard";
import LearningOutcomes from "@/pages/LearningOutcomes";
import UploadEvidence from "@/pages/UploadEvidence";
import EvidenceLibrary from "@/pages/EvidenceLibrary";
import OrganisationAdmin from "@/pages/OrganisationAdmin";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/not-found";

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
    </Switch>
  );
}

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/students" />} />
      <Route path="/students" component={Students} />
      <Route path="/students/:id" component={StudentDashboard} />
      <Route path="/outcomes" component={LearningOutcomes} />
      <Route path="/upload" component={UploadEvidence} />
      <Route path="/library" component={EvidenceLibrary} />
      <Route path="/admin" component={OrganisationAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { hasOrganisation, isLoading: orgLoading } = useOrganisation();

  // Public routes accessible to everyone
  if (location === "/privacy" || location === "/terms") {
    return <PublicRoutes />;
  }

  if (authLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Landing />;
  }

  if (orgLoading) {
    return <LoadingPage />;
  }

  if (!hasOrganisation) {
    return <OrganisationSetup />;
  }

  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
