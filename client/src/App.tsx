import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/LoadingSpinner";
import Landing from "@/pages/Landing";
import Students from "@/pages/Students";
import StudentDashboard from "@/pages/StudentDashboard";
import LearningOutcomes from "@/pages/LearningOutcomes";
import UploadEvidence from "@/pages/UploadEvidence";
import EvidenceLibrary from "@/pages/EvidenceLibrary";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/students" />} />
      <Route path="/students" component={Students} />
      <Route path="/students/:id" component={StudentDashboard} />
      <Route path="/outcomes" component={LearningOutcomes} />
      <Route path="/upload" component={UploadEvidence} />
      <Route path="/library" component={EvidenceLibrary} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Landing />;
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
