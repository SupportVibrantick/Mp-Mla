import { Link, useLocation } from "wouter";
import { useDashboard } from "@/hooks/useDashboard";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";

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
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/40",
  MEDIUM:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40",
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> =
  {
    OPEN: {
      bg: "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50",
      text: "text-blue-700 dark:text-blue-400",
      dot: "bg-blue-500",
    },
    IN_PROGRESS: {
      bg: "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    ESCALATED: {
      bg: "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50",
      text: "text-red-700 dark:text-red-400",
      dot: "bg-red-500",
    },
    RESOLVED: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50",
      text: "text-emerald-700 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    CLOSED: {
      bg: "bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50",
      text: "text-slate-700 dark:text-slate-400",
      dot: "bg-slate-500",
    },
    REJECTED: {
      bg: "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50",
      text: "text-rose-700 dark:text-rose-400",
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

  const totalInstitutions = institutionPieData.reduce(
    (acc: number, curr: any) => acc + curr.value,
    0,
  );
  const totalProjects = projectPieData.reduce(
    (acc: number, curr: any) => acc + curr.value,
    0,
  );

  const statsList = [
    {
      id: "wards",
      module: "wards",
      to: "/wards",
      icon: Map,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
      glowClass: "hover:shadow-indigo-500/10 hover:border-indigo-500/30",
      value: s.totalWards,
      label: "Wards",
      desc: `${s.totalPopulation.toLocaleString()} people`,
    },
    {
      id: "grievances",
      module: "grievances",
      to: "/public-requests?status=OPEN",
      icon: MessageSquare,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      glowClass: "hover:shadow-blue-500/10 hover:border-blue-500/30",
      value: s.openGrievances,
      label: "Open Requests",
      desc: `of ${s.totalGrievances} total`,
      trend: {
        current: s.grievancesThisMonth,
        previous: s.grievancesThisMonth - s.grievanceMonthlyChange,
        suffix: " mo",
      },
    },
    {
      id: "projects",
      module: "projects",
      to: "/projects",
      icon: FolderKanban,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      glowClass: "hover:shadow-amber-500/10 hover:border-amber-500/30",
      value: s.runningProjects,
      label: "Running Projects",
      desc: `${s.completedProjects} completed`,
    },
    {
      id: "voters",
      module: "wards",
      to: "/wards",
      icon: Users,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      glowClass: "hover:shadow-emerald-500/10 hover:border-emerald-500/30",
      value: s.totalVoters.toLocaleString(),
      label: "Total Voters",
      desc: `M: ${s.maleVoters.toLocaleString()} • F: ${s.femaleVoters.toLocaleString()}`,
    },
    {
      id: "departments",
      module: "departments",
      to: "/departments",
      icon: Building2,
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/40",
      glowClass: "hover:shadow-cyan-500/10 hover:border-cyan-500/30",
      value: s.totalDepartments,
      label: "Departments",
      desc: "Constituency scope",
    },
    {
      id: "facilities",
      module: "institutions",
      to: "/public-facilities",
      icon: Landmark,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      glowClass: "hover:shadow-purple-500/10 hover:border-purple-500/30",
      value: s.totalInstitutions,
      label: "Facilities",
      desc: "Active facilities",
    },
    {
      id: "meetings",
      module: "meeting",
      to: "/meetings",
      icon: Calendar,
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
      glowClass: "hover:shadow-rose-500/10 hover:border-rose-500/30",
      value: s.scheduledMeetings,
      label: "Meetings",
      desc: "Upcoming sessions",
    },
    {
      id: "groups",
      module: "community_groups",
      to: "/community",
      icon: Users,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-950/40",
      glowClass: "hover:shadow-violet-500/10 hover:border-violet-500/30",
      value: s.totalCommunityGroups,
      label: "Collectives",
      desc: "Active groups",
    },
  ];

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        {/* ═══ Constituency Overview Banner ═══ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#114b8a] via-[#253e9a] to-[#612d95] text-white p-6 sm:p-8 shadow-xl border border-white/10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <Badge
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-[#b2cbdc] border-none backdrop-blur-md px-3 py-1 text-xs font-semibold"
              >
                Constituency Overview
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200">
                MP / MLA Constituency Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/80 leading-relaxed">
                Real-time metrics, active development works, citizen requests
                tracking, and public facility management.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 xl:gap-8 bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 shadow-inner">
              {hasModule("wards") && (
                <div className="space-y-1 pr-6 border-r border-white/10">
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">
                    Wards
                  </p>
                  <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {s.totalWards}
                  </p>
                </div>
              )}
              {hasModule("grievances") && (
                <div className="space-y-1 pr-6 border-r border-white/10">
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">
                    Requests
                  </p>
                  <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {s.openGrievances}
                  </p>
                </div>
              )}
              {hasModule("projects") && (
                <div className="space-y-1 pr-6 border-r border-white/10">
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">
                    Projects
                  </p>
                  <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {s.runningProjects}
                  </p>
                </div>
              )}
              {hasModule("wards") && (
                <div className="space-y-1">
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">
                    Voters
                  </p>
                  <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {s.totalVoters >= 100000
                      ? `${(s.totalVoters / 100000).toFixed(1)}L`
                      : s.totalVoters >= 1000
                        ? `${(s.totalVoters / 1000).toFixed(0)}K`
                        : s.totalVoters.toLocaleString()}
                  </p>
                </div>
              )}
              <div className="w-full sm:w-auto mt-2 sm:mt-0 sm:pl-4">
                <Link href="/reports">
                  <Button className="w-full sm:w-auto bg-white hover:bg-indigo-50 text-[#114b8a] font-bold transition-all duration-300 border-none shadow-md hover:shadow-lg flex items-center justify-center gap-2 group px-4 py-2 h-9 text-xs">
                    Full Reports
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Row 1: Unified Stat Cards Grid ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4">
          {statsList
            .filter((item) => hasModule(item.module))
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link to={item.to} key={item.id} className="block group">
                  <Card
                    className={cn(
                      "h-full cursor-pointer transition-all duration-500 ease-out",
                      "bg-white/60 dark:bg-slate-900/60 backdrop-blur-md",
                      "border border-white/60 dark:border-slate-800/60",
                      "shadow-[0_8px_30px_rgb(0,0,0,0.015)]",
                      "hover:bg-white/80 dark:hover:bg-slate-900/80 hover:-translate-y-1.5 hover:shadow-lg",
                      item.glowClass,
                    )}
                  >
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                      <div className="flex items-center justify-between">
                        <div
                          className={cn(
                            "p-2 rounded-xl transition-transform duration-300 group-hover:scale-110",
                            item.bgColor,
                          )}
                        >
                          <Icon className={cn("h-4 w-4", item.color)} />
                        </div>
                        {item.trend && (
                          <div className="bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                            <TrendBadge
                              current={item.trend.current}
                              previous={item.trend.previous}
                              suffix={item.trend.suffix}
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] tracking-wider uppercase font-bold text-muted-foreground/85">
                          {item.label}
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent leading-none">
                          {item.value}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground/75 font-semibold truncate mt-1">
                          {item.desc}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
        </div>

        <BirthdayWidget />

        {/* ═══ Row 3: Category Chart + Project Pie ═══ */}
        {(hasModule("community_groups") || hasModule("projects")) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {hasModule("community_groups") && (
              <Card className={!hasModule("projects") ? "lg:col-span-2" : ""}>
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base font-semibold">
                        Community Groups
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Active groups by type
                      </CardDescription>
                    </div>
                    <Link to="/community">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs hover:bg-muted"
                      >
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-1 sm:px-6">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={communityTypeData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                          opacity={0.4}
                        />
                        <XAxis
                          dataKey="name"
                          fontSize={9}
                          fontWeight={500}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={50}
                          dy={5}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          fontSize={10}
                          fontWeight={500}
                          tickLine={false}
                          axisLine={false}
                          width={35}
                          dx={-5}
                          className="text-muted-foreground"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
                            fontSize: "11px",
                          }}
                          cursor={{ fill: "hsl(var(--muted)/0.15)" }}
                        />
                        <Bar
                          dataKey="count"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                        >
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
                      <CardTitle className="text-sm sm:text-base font-semibold">
                        Project Status
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {s.totalProjects} total projects • {fmt(s.totalBudget)}{" "}
                        budget
                      </CardDescription>
                    </div>
                    <Link to="/projects">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs hover:bg-muted"
                      >
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-1 sm:px-6">
                  <div className="relative h-[250px] flex items-center justify-center">
                    {projectPieData.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={projectPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={75}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {projectPieData.map((e: any, i: number) => (
                                <Cell key={i} fill={e.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "12px",
                                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
                                fontSize: "11px",
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              wrapperStyle={{ fontSize: "10px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                          <p className="text-2xl font-extrabold tracking-tight text-foreground">
                            {totalProjects}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            Projects
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        No project data
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ Row 2: Institutions Breakdown + Grievance Trend ═══ */}
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
                      <CardTitle className="text-sm sm:text-base font-semibold">
                        Public Facilities
                      </CardTitle>
                      <CardDescription className="text-xs">
                        By Category
                      </CardDescription>
                    </div>
                    <Link to="/public-facilities">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs hover:bg-muted"
                      >
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="relative h-[250px] flex items-center justify-center">
                    {institutionPieData.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={institutionPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
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
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "12px",
                                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
                                fontSize: "11px",
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              wrapperStyle={{ fontSize: "10px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                          <p className="text-2xl font-extrabold tracking-tight text-foreground">
                            {totalInstitutions}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            Total
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs">
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
                      <CardTitle className="text-sm sm:text-base font-semibold">
                        Public Request Trend
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Created vs Resolved (6 months)
                      </CardDescription>
                    </div>
                    <Link to="/public-requests">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs hover:bg-muted"
                      >
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-1 sm:px-6">
                  <div className="h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={d.grievances.trend}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
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
                              stopOpacity={0.2}
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
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#22c55e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                          opacity={0.4}
                        />
                        <XAxis
                          dataKey="month"
                          fontSize={10}
                          fontWeight={500}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          fontSize={10}
                          fontWeight={500}
                          tickLine={false}
                          axisLine={false}
                          dx={-10}
                          width={35}
                          className="text-muted-foreground"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
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
                          activeDot={{ r: 6 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="resolved"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#gradResolved)"
                          name="Resolved"
                          activeDot={{ r: 6 }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          align="right"
                          wrapperStyle={{
                            fontSize: "11px",
                            paddingBottom: "10px",
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {/* ═══ Row 4: Recent Public Requests + Projects ═══ */}
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
                    <CardTitle className="text-sm sm:text-base font-semibold">
                      Recent Public Requests
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Latest citizen requests
                    </CardDescription>
                  </div>
                  <Link to="/public-requests">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs hover:bg-muted"
                    >
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="text-[10px] text-muted-foreground uppercase bg-muted/30">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">
                            Ticket
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            Subject
                          </th>
                          <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">
                            Requestor
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            Priority
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell">
                            Age
                          </th>
                          <th className="px-4 py-3" />
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
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-3 align-middle">
                                <span
                                  onClick={() =>
                                    navigate("/public-requests/detail", {
                                      state: { id: g.id },
                                    })
                                  }
                                  className="inline-flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-200 cursor-pointer"
                                >
                                  {g.ticketNumber}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-middle font-medium text-foreground max-w-[120px] sm:max-w-[180px] truncate text-xs sm:text-sm">
                                {g.subject || g.category}
                              </td>
                              <td className="px-4 py-3 align-middle text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                                {g.complainantName || "—"}
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] sm:text-[10px] font-semibold border",
                                    pr,
                                  )}
                                >
                                  {g.priority}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                    st.bg,
                                    st.text,
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      st.dot,
                                    )}
                                  />
                                  {g.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-middle text-xs text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                                {formatDistanceToNow(new Date(g.createdAt), {
                                  addSuffix: true,
                                })}
                              </td>
                              <td className="px-4 py-3 align-middle text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted"
                                  onClick={() =>
                                    navigate("/public-requests/detail", {
                                      state: { id: g.id },
                                    })
                                  }
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                        {d.grievances.recent.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-8 text-center text-muted-foreground text-xs"
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm sm:text-base font-semibold">
                        Project Highlights
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Active development works
                      </CardDescription>
                    </div>
                    <Link to="/projects">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs hover:bg-muted"
                      >
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-3 sm:px-6">
                  {d.projects.recent.map((p: any) => {
                    const ps =
                      PROJECT_STATUS[p.status] || PROJECT_STATUS.PENDING;
                    return (
                      <Link to={`/projects/${p.id}`} key={p.id}>
                        <div className="p-3.5 rounded-xl border border-border/40 bg-card hover:bg-muted/30 transition-all duration-200 cursor-pointer group flex flex-col space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate text-foreground">
                                {p.name}
                              </h4>
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground">
                                  Ward {p.ward?.wardNumber}
                                </span>
                                <span>{fmt(p.budgetSanctioned)}</span>
                              </p>
                            </div>
                            <Badge
                              className="text-[9px] sm:text-[10px] ml-2 flex-shrink-0 font-semibold border"
                              style={{
                                backgroundColor: `${ps.color}15`,
                                color: ps.color,
                                borderColor: `${ps.color}30`,
                              }}
                            >
                              {ps.label}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] sm:text-xs font-medium">
                              <span className="text-muted-foreground">
                                Completion Progress
                              </span>
                              <span className="font-mono text-foreground font-semibold">
                                {p.completionPercent}%
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${p.completionPercent}%`,
                                  backgroundColor: ps.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {d.projects.recent.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-6 border border-dashed rounded-xl">
                      No projects yet
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ═══ Row 5: Priority + Quick Access ═══ */}
        {(hasModule("grievances") ||
          hasModule("institutions") ||
          hasModule("community_groups") ||
          hasModule("wards")) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <CardTitle className="text-sm font-semibold">
                    Public Request Priority Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-4">
                  <div className="grid grid-cols-4 gap-2.5">
                    {d.grievances.byPriority.map((p: any) => {
                      const colors: Record<
                        string,
                        { hex: string; cardClass: string }
                      > = {
                        URGENT: {
                          hex: "#ef4444",
                          cardClass:
                            "bg-rose-50/30 hover:bg-rose-50/50 border-rose-100/60 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 dark:border-rose-900/30",
                        },
                        HIGH: {
                          hex: "#f97316",
                          cardClass:
                            "bg-orange-50/30 hover:bg-orange-50/50 border-orange-100/60 dark:bg-orange-950/10 dark:hover:bg-orange-950/20 dark:border-orange-900/30",
                        },
                        MEDIUM: {
                          hex: "#f59e0b",
                          cardClass:
                            "bg-amber-50/30 hover:bg-amber-50/50 border-amber-100/60 dark:bg-amber-950/10 dark:hover:bg-amber-950/20 dark:border-amber-900/30",
                        },
                        LOW: {
                          hex: "#22c55e",
                          cardClass:
                            "bg-emerald-50/30 hover:bg-emerald-50/50 border-emerald-100/60 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 dark:border-emerald-900/30",
                        },
                      };
                      const config = colors[p.priority] || {
                        hex: "#6b7280",
                        cardClass:
                          "bg-slate-50/30 hover:bg-slate-50/50 border-slate-100/60 dark:bg-slate-900/10 dark:hover:bg-slate-900/20 dark:border-slate-800/30",
                      };

                      return (
                        <Link
                          key={p.priority}
                          to={`/public-requests?priority=${p.priority}`}
                        >
                          <div
                            className={cn(
                              "text-center p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5",
                              config.cardClass,
                            )}
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full mx-auto mb-1.5"
                              style={{ backgroundColor: config.hex }}
                            />
                            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                              {p.count}
                            </p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
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
                  <CardTitle className="text-sm font-semibold">
                    Quick Access Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-3 sm:px-6 pb-4">
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
                      label: "Community Collectives",
                      count: s.totalCommunityGroups,
                      href: "/community",
                      Icon: Users,
                      color: "#8b5cf6",
                      module: "community_groups",
                    },
                    {
                      label: "Constituency Wards",
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
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 cursor-pointer hover:shadow-sm">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center border"
                              style={{
                                backgroundColor: `${item.color}10`,
                                borderColor: `${item.color}20`,
                              }}
                            >
                              <item.Icon
                                className="h-4 w-4"
                                style={{ color: item.color }}
                              />
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-foreground">
                              {item.label}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] sm:text-xs font-semibold px-2 py-0.5"
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
