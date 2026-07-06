import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { GuestRoute } from "./components/auth/GuestRoute";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import TenantsPage from "@/pages/admin/Tenants";
import SubscriptionsPage from "@/pages/admin/Subscriptions";
import TenantSubscriptionsPage from "@/pages/admin/TenantSubscriptions";
import UpcomingRenewalsPage from "@/pages/admin/UpcomingRenewals";
import InvoicesPage from "@/pages/admin/Invoices";
import ModulesPage from "@/pages/admin/Modules";
import PaymentsPage from "@/pages/admin/Payments";
import PlatformSettingsPage from "@/pages/admin/PlatformSettings";
import PlatformUsersPage from "@/pages/admin/PlatformUsers";
import ProfilePage from "./pages/ProfilePage";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <GuestRoute>
          <Login />
        </GuestRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute module="dashboard" action="read">
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute module="dashboard" action="read">
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/tenants">
        <ProtectedRoute module="tenants" action="read">
          <TenantsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/subscriptions">
        <ProtectedRoute module="subscriptions" action="read">
          <SubscriptionsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/subscriptions/tenants">
        <ProtectedRoute module="subscriptions" action="read">
          <TenantSubscriptionsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/subscriptions/renewals">
        <ProtectedRoute module="subscriptions" action="read">
          <UpcomingRenewalsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/subscriptions/invoices">
        <ProtectedRoute module="subscriptions" action="read">
          <InvoicesPage />
        </ProtectedRoute>
      </Route>

      <Route path="/modules">
        <ProtectedRoute module="modules" action="read">
          <ModulesPage />
        </ProtectedRoute>
      </Route>

      <Route path="/payments">
        <ProtectedRoute module="payments" action="read">
          <PaymentsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute module="users" action="read">
          <PlatformUsersPage />
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute module="settings" action="read">
          <PlatformSettingsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>

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
          <SettingsProvider>
            <LanguageProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </LanguageProvider>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
