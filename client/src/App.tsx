import { Switch, Route, useLocation } from "wouter";
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
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  
  // Detect subdomain access and redirect to proper route
  useEffect(() => {
    const hostname = window.location.hostname;
    // Check if we're on a subdomain like trzlua.addypin.com
    const subdomainMatch = hostname.match(/^([A-Z0-9]{6})\.addypin\.com$/i);
    
    if (subdomainMatch && location === "/") {
      const shortcode = subdomainMatch[1].toUpperCase();
      // Redirect to the proper route for the shortcode
      setLocation(`/redirect/${shortcode}`);
    }
    
    // Also handle direct shortcode URLs like /TRZLUA
    const pathMatch = location.match(/^\/([A-Z0-9]{6})$/i);
    if (pathMatch) {
      const shortcode = pathMatch[1].toUpperCase();
      setLocation(`/redirect/${shortcode}`);
    }
  }, [location, setLocation]);
  
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
