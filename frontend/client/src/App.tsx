import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { GuestRoute } from "./components/auth/GuestRoute";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Grievances from "@/pages/Grievances";
import Projects from "@/pages/Projects";
import Institutions from "@/pages/Institutions";
import Community from "@/pages/Community";
import Schemes from "@/pages/Schemes";
import Wards from "@/pages/Wards";
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import UserManagement from "@/pages/admin/User";
import Permissions from "@/pages/admin/Permissions";
import UserPermissions from "./pages/admin/UserPermissions";
import Reports from "./pages/Reports";
import WardsPage from "./pages/wards/AllWards";
import WardFormPage from "./pages/wards/WardFormPage";
import WardDetailPage from "./pages/wards/WardDetailPage";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <GuestRoute>
          <Login />
        </GuestRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/grievances">
        <ProtectedRoute module="grievances" action="view">
          <Grievances />
        </ProtectedRoute>
      </Route>

      <Route path="/projects">
        <ProtectedRoute module="projects" action="view">
          <Projects />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute module="projects" action="view">
          <UserManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/wards">
        <ProtectedRoute module="projects" action="view">
          <WardsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/wards/new">
        <ProtectedRoute module="projects" action="view">
          <WardFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/wards/:id/edit">
        <ProtectedRoute module="projects" action="view">
          <WardFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/wards/:id">
        <ProtectedRoute module="projects" action="view">
          <WardDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/permissions">
        <ProtectedRoute module="projects" action="view">
          <Permissions />
        </ProtectedRoute>
      </Route>
      <Route path="/users/:id/permissions">
        <ProtectedRoute module="projects" action="view">
          <UserPermissions />
        </ProtectedRoute>
      </Route>

      <Route path="/institutions">
        <ProtectedRoute module="institutions" action="view">
          <Institutions />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute module="institutions" action="view">
          <Reports />
        </ProtectedRoute>
      </Route>

      <Route path="/community">
        <ProtectedRoute module="demographics" action="view">
          <Community />
        </ProtectedRoute>
      </Route>

      <Route path="/schemes">
        <ProtectedRoute module="schemes" action="view">
          <Schemes />
        </ProtectedRoute>
      </Route>

      {/* <Route path="/wards">
        <ProtectedRoute module="wards" action="view">
          <Wards />
        </ProtectedRoute>
      </Route> */}

      <Route path="/change-password" component={ChangePassword} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
