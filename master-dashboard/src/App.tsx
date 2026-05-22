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
import UserManagement from "@/pages/admin/User";
import Permissions from "@/pages/admin/Permissions";
import UserPermissions from "./pages/admin/UserPermissions";
// import Reports from "./pages/Reports";


import SettingsPage from "./pages/settings/SettingsPage";
import AuditLogsPage from "./pages/auditLogs/AuditLogsPage";
import RecycleBinPage from "./pages/recycleBin/RecycleBinPage";

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
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>


      <Route path="/users">
        <ProtectedRoute module="users" action="read">
          <UserManagement />
        </ProtectedRoute>
      </Route>


      <Route path="/permissions">
        <ProtectedRoute module="users" action="read">
          <Permissions />
        </ProtectedRoute>
      </Route>
      <Route path="/users/:id/permissions">
        <ProtectedRoute module="users" action="update">
          <UserPermissions />
        </ProtectedRoute>
      </Route>

      {/* <Route path="/institutions">
        <ProtectedRoute module="institutions" action="view">
          <Institutions />
        </ProtectedRoute>
      </Route> */}

      {/* <Route path="/reports">
        <ProtectedRoute module="institutions" action="view">
          <Reports />
        </ProtectedRoute>
      </Route> */}



      {/* <Route path="/schemes">
        <ProtectedRoute module="schemes" action="view">
          <Schemes />
        </ProtectedRoute>
      </Route> */}
      {/* <Route path="/funds">
        <ProtectedRoute module="funds" action="read">
          <FundsPage />
        </ProtectedRoute>
      </Route> */}


      {/* <Route path="/schemes">
        <ProtectedRoute module="schemes" action="read">
          <SchemeListPage />
        </ProtectedRoute>
      </Route> */}
      <Route path="/settings">
        <ProtectedRoute module="settings" action="read">
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/audit-logs">
        <ProtectedRoute module="audit_logs" action="read">
          <AuditLogsPage />
        </ProtectedRoute>
      </Route>
      {/* <Route path="/schemes/new">
        <ProtectedRoute module="schemes" action="create">
          <SchemeFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/schemes/:id/edit">
        <ProtectedRoute module="schemes" action="update">
          <SchemeFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/schemes/:id">
        <ProtectedRoute module="schemes" action="read">
          <SchemeDetailPage />
        </ProtectedRoute>
      </Route> */}
      {/* <Route path="/wards">
        <ProtectedRoute module="wards" action="view">
          <Wards />
        </ProtectedRoute>
      </Route> */}



      <Route path="/recycle-bin">
        <ProtectedRoute module="recycle_bin" action="read">
          <RecycleBinPage />
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
