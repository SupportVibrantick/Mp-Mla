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
import CommunityListPage from "./pages/community/CommunityListPage";
import CommunityFormPage from "./pages/community/CommunityFormPage";
import CommunityDetailPage from "./pages/community/CommunityDetailPage";
import InstitutionListPage from "./pages/institutions/InstitutionListPage";
import InstitutionFormPage from "./pages/institutions/InstitutionFormPage";
import InstitutionDetailPage from "./pages/institutions/InstitutionDetailPage";
import GrievanceListPage from "./pages/grievances/GrievanceListPage";
import GrievanceFormPage from "./pages/grievances/GrievanceFormPage";
import GrievanceDetailPage from "./pages/grievances/GrievanceDetailPage";
import DepartmentListPage from "./pages/departments/DepartmentListPage";
import ProjectListPage from "./pages/projects/ProjectListPage";
import ProjectFormPage from "./pages/projects/ProjectFormPage";
import ProjectDetailPage from "./pages/projects/ProjectDetailPage";
import FundsPage from "./pages/funds/FundsPage";
import SchemeListPage from "./pages/schemes/SchemeListPage";
import SchemeFormPage from "./pages/schemes/SchemeFormPage";
import SchemeDetailPage from "./pages/schemes/SchemeDetailPage";
import FundsOverviewPage from "./pages/funds/FundsOverviewPage";
import FundDetailPage from "./pages/funds/FundDetailPage";
import ReportsPage from "./pages/reports/ReportsPage";
import BirthdaysPage from "./pages/leaders/BirthdaysPage";
import LeaderFormPage from "./pages/leaders/LeaderFormPage";
import LeaderListPage from "./pages/leaders/LeaderListPage";
import LeaderDetailPage from "./pages/leaders/LeaderDetailPage";

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

      {/* <Route path="/grievances">
        <ProtectedRoute module="grievances" action="view">
          <Grievances />
        </ProtectedRoute>
      </Route> */}

      <Route path="/grievances">
        <ProtectedRoute module="grievances" action="read">
          <GrievanceListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/grievances/new">
        <ProtectedRoute module="grievances" action="create">
          <GrievanceFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/grievances/:id/edit">
        <ProtectedRoute module="grievances" action="update">
          <GrievanceFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/grievances/:id">
        <ProtectedRoute module="grievances" action="read">
          <GrievanceDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/departments">
        <ProtectedRoute module="departments" action="read">
          <DepartmentListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/departments/:id">
        <ProtectedRoute module="departments" action="read">
          <DepartmentListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/projects">
        <ProtectedRoute module="projects" action="read">
          <ProjectListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/projects/new">
        <ProtectedRoute module="projects" action="create">
          <ProjectFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/projects/:id/edit">
        <ProtectedRoute module="projects" action="update">
          <ProjectFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/projects/:id">
        <ProtectedRoute module="projects" action="read">
          <ProjectDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute module="projects" action="view">
          <UserManagement />
        </ProtectedRoute>
      </Route>

      <Route path="/community">
        <ProtectedRoute module="community_groups" action="read">
          <CommunityListPage />
        </ProtectedRoute>
      </Route>

      <Route path="/community/new">
        <ProtectedRoute module="community_groups" action="create">
          <CommunityFormPage />
        </ProtectedRoute>
      </Route>

      <Route path="/community/:id/edit">
        <ProtectedRoute module="community_groups" action="update">
          <CommunityFormPage />
        </ProtectedRoute>
      </Route>

      <Route path="/community/:id">
        <ProtectedRoute module="community_groups" action="read">
          <CommunityDetailPage />
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

      {/* <Route path="/institutions">
        <ProtectedRoute module="institutions" action="view">
          <Institutions />
        </ProtectedRoute>
      </Route> */}
      <Route path="/institutions">
        <ProtectedRoute module="institutions" action="read">
          <InstitutionListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/institutions/new">
        <ProtectedRoute module="institutions" action="create">
          <InstitutionFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/institutions/:id/edit">
        <ProtectedRoute module="institutions" action="update">
          <InstitutionFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/institutions/:id">
        <ProtectedRoute module="institutions" action="read">
          <InstitutionDetailPage />
        </ProtectedRoute>
      </Route>
      {/* <Route path="/reports">
        <ProtectedRoute module="institutions" action="view">
          <Reports />
        </ProtectedRoute>
      </Route> */}

      <Route path="/leaders">
        <ProtectedRoute module="leaders" action="read">
          <LeaderListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/leaders/birthdays">
        <ProtectedRoute module="leaders" action="read">
          <BirthdaysPage />
        </ProtectedRoute>
      </Route>
      <Route path="/leaders/new">
        <ProtectedRoute module="leaders" action="create">
          <LeaderFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/leaders/:id/edit">
        <ProtectedRoute module="leaders" action="update">
          <LeaderFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/leaders/:id">
        <ProtectedRoute module="leaders" action="read">
          <LeaderDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute module="reports" action="read">
          <ReportsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/demographics">
        <ProtectedRoute module="demographics" action="view">
          <Community />
        </ProtectedRoute>
      </Route>

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

      <Route path="/funds">
        <ProtectedRoute module="funds" action="read">
          <FundsOverviewPage />
        </ProtectedRoute>
      </Route>
      <Route path="/funds/:id">
        <ProtectedRoute module="funds" action="read">
          <FundDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/schemes">
        <ProtectedRoute module="schemes" action="read">
          <SchemeListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/schemes/new">
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
