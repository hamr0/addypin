import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContactForm } from "@/components/ContactForm";
import Home from "@/pages/Home";
import RedirectPage from "@/pages/RedirectPage";
import VersionPage from "@/pages/VersionPage";
import EditPage from "@/pages/EditPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/edit" component={EditPage} />
      <Route path="/redirect/:shortcode" component={RedirectPage} />
      <Route path="/versions" component={VersionPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
