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
import WardsPage from "./pages/wards/AllWards";
import WardFormPage from "./pages/wards/WardFormPage";
import WardDetailPage from "./pages/wards/WardDetailPage";
import CommunityListPage from "./pages/community/CommunityListPage";
import CommunityFormPage from "./pages/community/CommunityFormPage";
import CommunityDetailPage from "./pages/community/CommunityDetailPage";
import PublicFacilityListPage from "./pages/public-facilities/PublicFacilityListPage";
import PublicFacilityFormPage from "./pages/public-facilities/PublicFacilityFormPage";
import PublicFacilityDetailPage from "./pages/public-facilities/PublicFacilityDetailPage";
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
import SchemeApplicationListPage from "./pages/schemes/SchemeApplicationListPage";
import SchemeApplicationFormPage from "./pages/schemes/SchemeApplicationFormPage";
import SchemeApplicationDetailPage from "./pages/schemes/SchemeApplicationDetailPage";
import ContactListPage from "./pages/crm/ContactListPage";
import ContactFormPage from "./pages/crm/ContactFormPage";
import ContactDetailPage from "./pages/crm/ContactDetailPage";
import DocumentListPage from "./pages/documents/DocumentListPage";
import DocumentFormPage from "./pages/documents/DocumentFormPage";
import DocumentDetailPage from "./pages/documents/DocumentDetailPage";
import FundsOverviewPage from "./pages/funds/FundsOverviewPage";
import FundDetailPage from "./pages/funds/FundDetailPage";
import ReportsPage from "./pages/reports/ReportsPage";
import BirthdaysPage from "./pages/leaders/BirthdaysPage";
import LeaderFormPage from "./pages/leaders/LeaderFormPage";
import LeaderListPage from "./pages/leaders/LeaderListPage";
import LeaderDetailPage from "./pages/leaders/LeaderDetailPage";
import SettingsPage from "./pages/settings/SettingsPage";
import AuditLogsPage from "./pages/auditLogs/AuditLogsPage";
import RecycleBinPage from "./pages/recycleBin/RecycleBinPage";
import DemographicsPage from "@/pages/Demographics";
import RegisterPublicFacilityPage from "./pages/public-facilities/RegisterPublicFacilityPage";
import PublicFacilityRequestsPage from "./pages/public-facilities/PublicFacilityRequestsPage";
import MeetingListPage from "./pages/meetings/MeetingListPage";
import MeetingFormPage from "./pages/meetings/MeetingFormPage";
import AppointmentListPage from "./pages/appointments/AppointmentListPage";
import AppointmentFormPage from "./pages/appointments/AppointmentFormPage";
import ProfilePage from "./pages/ProfilePage";
import BillingPage from "./pages/account/BillingPage";
import PdfReportsPage from "./pages/reports/PdfReportsPage";
import TasksPage from "./pages/tasks/TasksPage";

// Events & Janata Darbar
import EventListPage from "./pages/events/EventListPage";
import EventFormPage from "./pages/events/EventFormPage";
import EventDetailPage from "./pages/events/EventDetailPage";
import JanataDarbarListPage from "./pages/janataDarbar/JanataDarbarListPage";
import JanataDarbarFormPage from "./pages/janataDarbar/JanataDarbarFormPage";
import JanataDarbarSessionPage from "./pages/janataDarbar/JanataDarbarSessionPage";

import CompetitorListPage from "./pages/competitors/CompetitorListPage";
import CompetitorFormPage from "./pages/competitors/CompetitorFormPage";
import CompetitorDashboard from "./pages/competitors/CompetitorDashboard";
import CompetitorDetailPage from "./pages/competitors/CompetitorDetailPage";
import VoterListPage from "./pages/voterList/VoterListPage";

// Geography management pages
import GeographyPage from "./pages/geography/GeographyPage";
import ConstituenciesPage from "./pages/geography/ConstituenciesPage";
import RepresentativePage from "./pages/geography/RepresentativePage";
import DistrictsPage from "./pages/geography/DistrictsPage";
import BlocksPage from "./pages/geography/BlocksPage";
import TownVillagesPage from "./pages/geography/TownVillagesPage";
import PollingLocationsPage from "./pages/geography/PollingLocationsPage";
import BoothsPage from "./pages/geography/BoothsPage";
import BulkImportPage from "./pages/geography/BulkImportPage";
import BoothDetailPage from "./pages/geography/BoothDetailPage";
import TownVillageDetailPage from "./pages/geography/TownVillageDetailPage";
import PollingLocationDetailPage from "./pages/geography/PollingLocationDetailPage";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <GuestRoute>
          <Login />
        </GuestRoute>
      </Route>

      {/* Public route — no login required */}
      <Route path="/register-public-facility">
        <RegisterPublicFacilityPage />
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

      <Route path="/public-requests">
        <ProtectedRoute module="grievances" action="read">
          <GrievanceListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/public-requests/new">
        <ProtectedRoute module="grievances" action="create">
          <GrievanceFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/public-requests/edit">
        <ProtectedRoute module="grievances" action="update">
          <GrievanceFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/public-requests/detail">
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
        <ProtectedRoute module="users" action="read">
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
        <ProtectedRoute module="wards" action="read">
          <WardsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/wards/new">
        <ProtectedRoute module="wards" action="create">
          <WardFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/wards/:id/edit">
        <ProtectedRoute module="wards" action="update">
          <WardFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/wards/:id">
        <ProtectedRoute module="wards" action="read">
          <WardDetailPage />
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
      <Route path="/public-facilities">
        <ProtectedRoute module="institutions" action="read">
          <PublicFacilityListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/public-facilities/requests">
        <ProtectedRoute module="institutions" action="read">
          <PublicFacilityRequestsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/public-facilities/new">
        <ProtectedRoute module="institutions" action="create">
          <PublicFacilityFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/public-facilities/:id/edit">
        <ProtectedRoute module="institutions" action="update">
          <PublicFacilityFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/public-facilities/:id">
        <ProtectedRoute module="institutions" action="read">
          <PublicFacilityDetailPage />
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
      <Route path="/reports/pdf">
        <ProtectedRoute module="reports" action="read">
          <PdfReportsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute module="reports" action="read">
          <ReportsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/demographics">
        <ProtectedRoute module="demographics" action="read">
          <DemographicsPage />
        </ProtectedRoute>
      </Route>

      {/* Competitor Analysis */}
      <Route path="/competitor-analysis">
        <ProtectedRoute module="competitors" action="read">
          <CompetitorListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/competitor-analysis/dashboard">
        <ProtectedRoute module="competitors" action="read">
          <CompetitorDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/competitor-analysis/new">
        <ProtectedRoute module="competitors" action="create">
          <CompetitorFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/competitor-analysis/:id/edit">
        <ProtectedRoute module="competitors" action="update">
          <CompetitorFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/competitor-analysis/:id">
        <ProtectedRoute module="competitors" action="read">
          <CompetitorDetailPage />
        </ProtectedRoute>
      </Route>

      {/* Voter List */}
      <Route path="/voter-list">
        <ProtectedRoute module="voter_list" action="read">
          <VoterListPage />
        </ProtectedRoute>
      </Route>

      {/* Geography Management */}
      <Route path="/geography">
        <ProtectedRoute module="constituency" action="read">
          <GeographyPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/constituencies/:id">
        <ProtectedRoute module="constituency" action="read">
          <ConstituenciesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/constituencies">
        <ProtectedRoute module="constituency" action="read">
          <ConstituenciesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/representative">
        <ProtectedRoute module="constituency" action="read">
          <RepresentativePage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/districts/:id">
        <ProtectedRoute module="constituency" action="read">
          <DistrictsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/districts">
        <ProtectedRoute module="constituency" action="read">
          <DistrictsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/geography/blocks">
        <ProtectedRoute module="constituency" action="read">
          <BlocksPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/town-villages">
        <ProtectedRoute module="constituency" action="read">
          <TownVillagesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/town-villages/:id">
        <ProtectedRoute module="constituency" action="read">
          <TownVillageDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/wards">
        <ProtectedRoute module="wards" action="read">
          <WardsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/geography/wards/new">
        <ProtectedRoute module="wards" action="create">
          <WardFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/wards/:id/edit">
        <ProtectedRoute module="wards" action="update">
          <WardFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/wards/:id">
        <ProtectedRoute module="wards" action="read">
          <WardDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/polling-locations">
        <ProtectedRoute module="constituency" action="read">
          <PollingLocationsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/polling-locations/:id">
        <ProtectedRoute module="constituency" action="read">
          <PollingLocationDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/booths">
        <ProtectedRoute module="constituency" action="read">
          <BoothsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/booths/:id">
        <ProtectedRoute module="constituency" action="read">
          <BoothDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/geography/import">
        <ProtectedRoute module="constituency" action="read">
          <BulkImportPage />
        </ProtectedRoute>
      </Route>

      {/* Representative Profile Redirect for Compatibility */}
      <Route path="/representative-profile">
        <ProtectedRoute module="constituency" action="read">
          <RepresentativePage />
        </ProtectedRoute>
      </Route>

      <Route path="/schemes">
        <ProtectedRoute module="schemes" action="read">
          <SchemeListPage />
        </ProtectedRoute>
      </Route>
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
      <Route path="/tasks">
        <ProtectedRoute module="tasks" action="read">
          <TasksPage />
        </ProtectedRoute>
      </Route>
      <Route path="/billing">
        <ProtectedRoute>
          <BillingPage />
        </ProtectedRoute>
      </Route>
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
      <Route path="/documents/new">
        <ProtectedRoute module="documents" action="create">
          <DocumentFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/documents/:id/edit">
        <ProtectedRoute module="documents" action="update">
          <DocumentFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/documents/:id">
        <ProtectedRoute module="documents" action="read">
          <DocumentDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/documents">
        <ProtectedRoute module="documents" action="read">
          <DocumentListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/crm/contacts/new">
        <ProtectedRoute module="crm" action="create">
          <ContactFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/crm/contacts/:id/edit">
        <ProtectedRoute module="crm" action="update">
          <ContactFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/crm/contacts/:id">
        <ProtectedRoute module="crm" action="read">
          <ContactDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/crm/contacts">
        <ProtectedRoute module="crm" action="read">
          <ContactListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/schemes/applications/new">
        <ProtectedRoute module="scheme_applications" action="create">
          <SchemeApplicationFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/schemes/applications/:id/edit">
        <ProtectedRoute module="scheme_applications" action="update">
          <SchemeApplicationFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/schemes/applications/:id">
        <ProtectedRoute module="scheme_applications" action="read">
          <SchemeApplicationDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/schemes/applications">
        <ProtectedRoute module="scheme_applications" action="read">
          <SchemeApplicationListPage />
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

      <Route path="/meetings">
        <ProtectedRoute module="meeting" action="read">
          <MeetingListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/meetings/new">
        <ProtectedRoute module="meeting" action="create">
          <MeetingFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/meetings/:id/edit">
        <ProtectedRoute module="meeting" action="update">
          <MeetingFormPage />
        </ProtectedRoute>
      </Route>

      <Route path="/appointments">
        <ProtectedRoute module="appointments" action="read">
          <AppointmentListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/appointments/new">
        <ProtectedRoute module="appointments" action="create">
          <AppointmentFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/appointments/:id/edit">
        <ProtectedRoute module="appointments" action="update">
          <AppointmentFormPage />
        </ProtectedRoute>
      </Route>

      <Route path="/events">
        <ProtectedRoute module="meeting" action="read">
          <EventListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/events/new">
        <ProtectedRoute module="meeting" action="create">
          <EventFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/events/:id">
        <ProtectedRoute module="meeting" action="read">
          <EventDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/events/:id/edit">
        <ProtectedRoute module="meeting" action="update">
          <EventFormPage />
        </ProtectedRoute>
      </Route>

      <Route path="/janata-darbar">
        <ProtectedRoute module="meeting" action="read">
          <JanataDarbarListPage />
        </ProtectedRoute>
      </Route>
      <Route path="/janata-darbar/new">
        <ProtectedRoute module="meeting" action="create">
          <JanataDarbarFormPage />
        </ProtectedRoute>
      </Route>
      <Route path="/janata-darbar/:id">
        <ProtectedRoute module="meeting" action="read">
          <JanataDarbarSessionPage />
        </ProtectedRoute>
      </Route>
      <Route path="/janata-darbar/:id/edit">
        <ProtectedRoute module="meeting" action="update">
          <JanataDarbarFormPage />
        </ProtectedRoute>
      </Route>

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
