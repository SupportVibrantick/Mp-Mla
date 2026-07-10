import { Link, useLocation } from "wouter";
import { useDashboard } from "@/hooks/useDashboard";
import { MainLayout } from "@/components/layout/MainLayout";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  MessageSquare,
  FolderKanban,
  Building2,
  Map,
  Users,
  IndianRupee,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Eye,
  MoreHorizontal,
  Landmark,
  Target,
  BarChart3,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import BirthdayWidget from "./dashboard/BirthdayWidget";
import { useAuth } from "@/hooks/useAuth";

// ─── Helpers ────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  MEDIUM:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  LOW: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_STYLES: Record<string, { bg: string; dot: string }> = {
  OPEN: {
    bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  IN_PROGRESS: {
    bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  ESCALATED: {
    bg: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
  RESOLVED: {
    bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    dot: "bg-green-500",
  },
  CLOSED: {
    bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-500",
  },
  REJECTED: {
    bg: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

const PROJECT_STATUS: Record<string, { color: string; label: string }> = {
  PENDING: { color: "#3b82f6", label: "Pending" },
  RUNNING: { color: "#f59e0b", label: "Running" },
  COMPLETED: { color: "#22c55e", label: "Completed" },
  ON_HOLD: { color: "#ef4444", label: "On Hold" },
  CANCELLED: { color: "#6b7280", label: "Cancelled" },
};

const CATEGORY_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

// ─── Loading Skeleton ───────────────────────────────────

function DashboardSkeleton() {
  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-[350px]" />
          <Skeleton className="h-[350px]" />
        </div>
        <div className="grid xl:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] xl:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    </MainLayout>
  );
}

// ─── Trend Badge ────────────────────────────────────────

function TrendBadge({
  current,
  previous,
  suffix = "",
}: {
  current: number;
  previous: number;
  suffix?: string;
}) {
  const diff = current - previous;
  const pct =
    previous > 0
      ? Math.round((Math.abs(diff) / previous) * 100)
      : current > 0
        ? 100
        : 0;

  if (diff === 0)
    return (
      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );

  return (
    <span
      className={`text-[10px] flex items-center gap-0.5 font-medium ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}
    >
      {diff > 0 ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {pct}%{suffix}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════

// ... (keep all imports and helpers the same)

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { hasModule } = useAuth();
  const { data: res, isLoading } = useDashboard();

  if (isLoading) return <DashboardSkeleton />;

  const d = res?.data;
  if (!d)
    return (
      <MainLayout title="Dashboard">
        <p className="text-muted-foreground text-center py-20">
          No data available
        </p>
      </MainLayout>
    );

  const s = d.summary;

  const grievanceCategoryData = d.grievances.byCategory.map(
    (c: any, i: number) => ({
      name: c.category.replace("_", " "),
      value: c.count,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }),
  );

  const projectPieData = d.projects.byStatus
    .filter((p: any) => p.count > 0)
    .map((p: any) => ({
      name: PROJECT_STATUS[p.status]?.label || p.status,
      value: p.count,
      color: PROJECT_STATUS[p.status]?.color || "#6b7280",
    }));

  const institutionPieData = (d.institutions?.byCategory || []).map(
    (c: any, i: number) => ({
      name: c.category.replace("_", " "),
      value: c.count,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }),
  );

  const communityTypeData = (d.communityGroups?.byType || []).map((t: any) => ({
    name: t.type.replace("_", " "),
    count: t.count,
  }));

  return (
    <MainLayout title="Dashboard ">
      <div className="space-y-4 sm:space-y-6">
        {/* ═══ Row 1: Key Stat Cards ══════════════════ */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {hasModule("wards") && (
            <Link to="/wards">
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Map className="h-4 w-4 text-indigo-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {s.totalWards}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Active Wards
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    {s.totalPopulation.toLocaleString()} people
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {hasModule("grievances") && (
            <Link to="/public-requests?status=OPEN">
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <TrendBadge
                      current={s.grievancesThisMonth}
                      previous={
                        s.grievancesThisMonth - s.grievanceMonthlyChange
                      }
                      suffix=" this mo"
                    />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {s.openGrievances}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Open Requests
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    of {s.totalGrievances} total requests
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {hasModule("projects") && (
            <Link to="/projects">
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <FolderKanban className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {s.runningProjects}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Running Projects
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    {s.completedProjects} completed
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {hasModule("wards") && (
            <Link to="/wards">
              <Card className="h-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-3 w-4 text-green-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {s.totalVoters.toLocaleString()}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Total Registered Voters
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground flex gap-2 mt-1">
                    <span>M: {s.maleVoters.toLocaleString()}</span>
                    <span>F: {s.femaleVoters.toLocaleString()}</span>
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* ═══ Row 1b: Additional Stat Cards ══════════════ */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {hasModule("departments") && (
            <Link to="/departments">
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Building2 className="h-4 w-4 text-cyan-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {s.totalDepartments}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Total Departments
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Across constituency
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {hasModule("institutions") && (
            <Link to="/public-facilities">
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Landmark className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {s.totalInstitutions}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Total Public Facilities
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Active facilities
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {hasModule("meeting") && (
            <Link to="/meetings">
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="h-4 w-4 text-rose-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {s.scheduledMeetings}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Meetings Scheduled
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Upcoming sessions
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {hasModule("community_groups") && (
            <Link to="/community">
              <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-4 w-4 text-violet-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {s.totalCommunityGroups}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Active Community Groups
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Citizen collectives
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        <BirthdayWidget />

        {/* ═══ Row 2: Institutions Breakdown + Grievance Trend ═════ */}
        {(hasModule("institutions") || hasModule("grievances")) && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            {hasModule("institutions") && (
              <Card
                className={
                  hasModule("grievances") ? "lg:col-span-2" : "lg:col-span-5"
                }
              >
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base">
                        Public Facilities
                      </CardTitle>
                      <CardDescription>By Category</CardDescription>
                    </div>
                    <Link to="/public-facilities">
                      <Button variant="ghost" size="sm" className="text-xs">
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="h-[250px] flex items-center justify-center">
                    {institutionPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={institutionPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {institutionPieData.map(
                              (entry: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: "8px",
                              border: "none",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                              fontSize: "11px",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "10px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No public facility data
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {hasModule("grievances") && (
              <Card
                className={
                  hasModule("institutions") ? "lg:col-span-3" : "lg:col-span-5"
                }
              >
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base">
                        Public Request Trend
                      </CardTitle>
                      <CardDescription className="text-[11px] sm:text-sm">
                        Created vs Resolved (6 months)
                      </CardDescription>
                    </div>
                    <Link to="/public-requests">
                      <Button variant="ghost" size="sm" className="text-xs">
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-1 sm:px-6">
                  <div className="h-[200px] sm:h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={d.grievances.trend}>
                        <defs>
                          <linearGradient
                            id="gradCreated"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="gradResolved"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#22c55e"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#22c55e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis
                          dataKey="month"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            fontSize: "11px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="created"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#gradCreated)"
                          name="Created"
                        />
                        <Area
                          type="monotone"
                          dataKey="resolved"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#gradResolved)"
                          name="Resolved"
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ Row 3: Category Chart + Project Pie ════ */}
        {(hasModule("community_groups") || hasModule("projects")) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {hasModule("community_groups") && (
              <Card className={!hasModule("projects") ? "lg:col-span-2" : ""}>
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base">
                        Community Groups
                      </CardTitle>
                      <CardDescription className="text-[11px] sm:text-sm">
                        Active groups by type
                      </CardDescription>
                    </div>
                    <Link to="/community">
                      <Button variant="ghost" size="sm" className="text-xs">
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-1 sm:px-6">
                  <div className="h-[220px] sm:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={communityTypeData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis
                          dataKey="name"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            fontSize: "11px",
                          }}
                          cursor={{ fill: "transparent" }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {communityTypeData.map((entry: any, i: number) => (
                            <Cell
                              key={i}
                              fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasModule("projects") && (
              <Card
                className={
                  !hasModule("community_groups") ? "lg:col-span-2" : ""
                }
              >
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base">
                        Project Status
                      </CardTitle>
                      <CardDescription className="text-[11px] sm:text-sm">
                        {s.totalProjects} total projects • {fmt(s.totalBudget)}{" "}
                        budget
                      </CardDescription>
                    </div>
                    <Link to="/projects">
                      <Button variant="ghost" size="sm" className="text-xs">
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-1 sm:px-6">
                  <div className="h-[220px] sm:h-[260px] flex items-center justify-center">
                    {projectPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={projectPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {projectPieData.map((e: any, i: number) => (
                              <Cell key={i} fill={e.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            wrapperStyle={{ fontSize: "11px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No project data
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ Row 4: Recent Public Requests + Projects ════ */}
        {(hasModule("grievances") || hasModule("projects")) && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {hasModule("grievances") && (
              <Card
                className={
                  hasModule("projects") ? "xl:col-span-2" : "xl:col-span-3"
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3 px-3 sm:px-6">
                  <div>
                    <CardTitle className="text-sm sm:text-base">
                      Recent Public Requests
                    </CardTitle>
                    <CardDescription className="text-[11px] sm:text-sm">
                      Latest citizen requests
                    </CardDescription>
                  </div>
                  <Link to="/public-requests">
                    <Button variant="outline" size="sm" className="text-xs">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="text-[10px] sm:text-[11px] text-muted-foreground uppercase bg-muted/30">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 text-left">
                            Ticket
                          </th>
                          <th className="px-3 sm:px-4 py-2 text-left">
                            Subject
                          </th>
                          <th className="px-3 sm:px-4 py-2 text-left hidden sm:table-cell">
                            Requestor
                          </th>
                          <th className="px-3 sm:px-4 py-2 text-left">
                            Priority
                          </th>
                          <th className="px-3 sm:px-4 py-2 text-left">
                            Status
                          </th>
                          <th className="px-3 sm:px-4 py-2 text-left hidden sm:table-cell">
                            Age
                          </th>
                          <th className="px-3 sm:px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {d.grievances.recent.map((g: any) => {
                          const st =
                            STATUS_STYLES[g.status] || STATUS_STYLES.OPEN;
                          const pr = PRIORITY_COLORS[g.priority] || "";
                          return (
                            <tr
                              key={g.id}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-3 sm:px-4 py-2">
                                <span
                                  onClick={() =>
                                    navigate("/public-requests/detail", {
                                      state: { id: g.id },
                                    })
                                  }
                                  className="font-mono text-[11px] sm:text-xs text-primary hover:underline cursor-pointer font-semibold"
                                >
                                  {g.ticketNumber}
                                </span>
                              </td>
                              <td className="px-3 sm:px-4 py-2 max-w-[120px] sm:max-w-[180px] truncate text-xs sm:text-sm">
                                {g.subject || g.category}
                              </td>
                              <td className="px-3 sm:px-4 py-2 text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                                {g.complainantName || "—"}
                              </td>
                              <td className="px-3 sm:px-4 py-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] sm:text-[10px] ${pr}`}
                                >
                                  {g.priority}
                                </Badge>
                              </td>
                              <td className="px-3 sm:px-4 py-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium ${st.bg}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                                  />
                                  {g.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-3 sm:px-4 py-2 text-[10px] text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                                {formatDistanceToNow(new Date(g.createdAt), {
                                  addSuffix: false,
                                })}
                              </td>
                              <td className="px-3 sm:px-4 py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    navigate("/public-requests/detail", {
                                      state: { id: g.id },
                                    })
                                  }
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {d.grievances.recent.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-8 text-center text-muted-foreground"
                            >
                              No requests yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasModule("projects") && (
              <Card className={!hasModule("grievances") ? "xl:col-span-3" : ""}>
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <CardTitle className="text-sm sm:text-base">
                    Project Highlights
                  </CardTitle>
                  <CardDescription className="text-[11px] sm:text-sm">
                    Active development works
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-3 sm:px-6">
                  {d.projects.recent.map((p: any) => {
                    const ps =
                      PROJECT_STATUS[p.status] || PROJECT_STATUS.PENDING;
                    return (
                      <Link to={`/projects/${p.id}`} key={p.id}>
                        <div className="cursor-pointer group">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-xs sm:text-sm group-hover:text-primary transition-colors truncate">
                                {p.name}
                              </h4>
                              <span className="text-[10px] text-muted-foreground">
                                #{p.ward?.wardNumber} {p.ward?.name} •{" "}
                                {fmt(p.budgetSanctioned)}
                              </span>
                            </div>
                            <Badge
                              className="text-[9px] sm:text-[10px] ml-2 flex-shrink-0"
                              style={{
                                backgroundColor: `${ps.color}20`,
                                color: ps.color,
                              }}
                            >
                              {ps.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${p.completionPercent}%`,
                                  backgroundColor: ps.color,
                                }}
                              />
                            </div>
                            <span className="text-[10px] sm:text-xs font-mono font-medium w-8 text-right">
                              {p.completionPercent}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {d.projects.recent.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No projects yet
                    </p>
                  )}
                  <Link to="/projects">
                    <Button variant="outline" className="w-full text-xs mt-2">
                      View All Projects
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ Row 5: Priority + Quick Access ═ */}
        {(hasModule("grievances") ||
          hasModule("institutions") ||
          hasModule("community_groups") ||
          hasModule("wards")) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {hasModule("grievances") && (
              <Card
                className={
                  !(
                    hasModule("institutions") ||
                    hasModule("community_groups") ||
                    hasModule("wards")
                  )
                    ? "md:col-span-3 lg:col-span-3"
                    : "md:col-span-2 lg:col-span-2"
                }
              >
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-sm">
                    Public Request Priority
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    {d.grievances.byPriority.map((p: any) => {
                      const colors: Record<string, string> = {
                        URGENT: "#ef4444",
                        HIGH: "#f97316",
                        MEDIUM: "#f59e0b",
                        LOW: "#22c55e",
                      };
                      return (
                        <Link
                          key={p.priority}
                          to={`/public-requests?priority=${p.priority}`}
                        >
                          <div className="text-center p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                            <div
                              className="w-3 h-3 rounded-full mx-auto mb-1"
                              style={{
                                backgroundColor:
                                  colors[p.priority] || "#6b7280",
                              }}
                            />
                            <p className="text-base sm:text-lg font-bold">
                              {p.count}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                              {p.priority}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {(hasModule("institutions") ||
              hasModule("community_groups") ||
              hasModule("wards")) && (
              <Card
                className={
                  !hasModule("grievances") ? "md:col-span-2 lg:col-span-3" : ""
                }
              >
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-sm">Quick Access</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-3 sm:px-6">
                  {[
                    {
                      label: "Public Facilities",
                      count: s.totalInstitutions,
                      href: "/public-facilities",
                      Icon: Building2,
                      color: "#6366f1",
                      module: "institutions",
                    },
                    {
                      label: "Community",
                      count: s.totalCommunityGroups,
                      href: "/community",
                      Icon: Users,
                      color: "#8b5cf6",
                      module: "community_groups",
                    },
                    {
                      label: "Wards",
                      count: s.totalWards,
                      href: "/wards",
                      Icon: Map,
                      color: "#3b82f6",
                      module: "wards",
                    },
                  ]
                    .filter((item) => hasModule(item.module))
                    .map((item) => (
                      <Link to={item.href} key={item.label}>
                        <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${item.color}15` }}
                            >
                              <item.Icon
                                className="h-3.5 sm:h-4 w-3.5 sm:w-4"
                                style={{ color: item.color }}
                              />
                            </div>
                            <span className="text-xs sm:text-sm font-medium">
                              {item.label}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] sm:text-xs"
                          >
                            {item.count}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
