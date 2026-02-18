import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Grievances from "@/pages/Grievances";
import Projects from "@/pages/Projects";
import Institutions from "@/pages/Institutions";
import Community from "@/pages/Community";
import Schemes from "@/pages/Schemes";
import Wards from "@/pages/Wards";
import Login from "@/pages/Login";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/grievances" component={Grievances} />
      <Route path="/projects" component={Projects} />
      <Route path="/institutions" component={Institutions} />
      <Route path="/community" component={Community} />
      <Route path="/schemes" component={Schemes} />
      <Route path="/wards" component={Wards} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
