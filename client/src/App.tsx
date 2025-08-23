import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContactForm } from "@/components/ContactForm";
import { useUmami } from "@/hooks/useUmami";
import Home from "@/pages/Home";
import RedirectPage from "@/pages/RedirectPage";
import VersionPage from "@/pages/VersionPage";
import EditPage from "@/pages/EditPage";
import FeaturesPage from "@/pages/FeaturesPage";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/edit" component={EditPage} />
      <Route path="/redirect/:shortcode" component={RedirectPage} />
      <Route path="/versions" component={VersionPage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/analytics" component={AnalyticsDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Umami analytics
  useUmami();
  // CI/CD Test - Build 2025.08.23-11:30

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <ContactForm />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
