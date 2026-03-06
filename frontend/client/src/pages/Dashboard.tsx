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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import BirthdayWidget from "./dashboard/BirthdayWidget";

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

export default function Dashboard() {
  const [, navigate] = useLocation();
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

  // Chart data
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

  const fundUtilPct =
    s.fundTotalAllocated > 0
      ? Math.round((s.fundTotalUtilized / s.fundTotalAllocated) * 100)
      : 0;
  const fundRelPct =
    s.fundTotalAllocated > 0
      ? Math.round((s.fundTotalReleased / s.fundTotalAllocated) * 100)
      : 0;

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        {/* ═══ Row 1: Key Stat Cards ══════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Wards */}
          <Link to="/wards">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer  ">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Map className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold">{s.totalWards}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Active Wards
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.totalPopulation.toLocaleString()} people
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Open Grievances */}
          <Link to="/grievances?status=OPEN">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <TrendBadge
                    current={s.grievancesThisMonth}
                    previous={s.grievancesThisMonth - s.grievanceMonthlyChange}
                    suffix=" this mo"
                  />
                </div>
                <p className="text-2xl font-bold">{s.openGrievances}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Open Grievances
                </p>
                <p className="text-xs text-muted-foreground">
                  of {s.totalGrievances} total
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Overdue */}
          {/* <Link to="/grievances?overdue=true">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {s.overdueGrievances}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Overdue
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {s.resolutionRate}% resolution rate
                </p>
              </CardContent>
            </Card>
          </Link> */}

          {/* Projects */}
          <Link to="/projects">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <FolderKanban className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">{s.runningProjects}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Running Projects
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.completedProjects} completed
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Fund Utilization */}
          <Link to="/funds">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <IndianRupee className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold">{fmt(s.fundTotalUtilized)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fund Utilized ({s.financialYear})
                </p>

                <Progress value={fundUtilPct} className="h-1 mt-2.5" />
              </CardContent>
            </Card>
          </Link>

          {/* Schemes */}
          {/* <Link to="/schemes">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                </div>
                <p className="text-2xl font-bold">
                  {s.totalBeneficiaries.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Beneficiaries
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {s.activeSchemes} active schemes • {s.schemeCoverage}%
                  coverage
                </p>
              </CardContent>
            </Card>
          </Link> */}
        </div>
        <BirthdayWidget />
        {/* ═══ Row 2: Fund Flow + Grievance Trend ═════ */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Fund Flow */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Fund Flow</CardTitle>
                  <CardDescription>FY {s.financialYear}</CardDescription>
                </div>
                <Link to="/funds">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Details →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: "Allocated",
                  value: s.fundTotalAllocated,
                  color: "#3b82f6",
                  pct: 100,
                },
                {
                  label: "Released",
                  value: s.fundTotalReleased,
                  color: "#f59e0b",
                  pct: fundRelPct,
                },
                {
                  label: "Utilized",
                  value: s.fundTotalUtilized,
                  color: "#22c55e",
                  pct: fundUtilPct,
                },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-mono font-semibold">
                      {fmt(b.value)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${b.pct}%`,
                        backgroundColor: b.color,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                    {b.pct}%
                  </p>
                </div>
              ))}

              {/* Fund type mini pills */}
              {d.funds.byType?.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-[10px] text-muted-foreground mb-2">
                    By Fund Type
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {d.funds.byType.map((f: any) => (
                      <Badge
                        key={f.fundType}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {f.fundType}: {fmt(f.allocated)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grievance Trend */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Grievance Trend</CardTitle>
                  <CardDescription>
                    Created vs Resolved (6 months)
                  </CardDescription>
                </div>
                <Link to="/grievances">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[230px]">
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
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "12px",
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
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Row 3: Category Chart + Project Pie ════ */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Grievances by Category */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Grievances by Category
              </CardTitle>
              <CardDescription>Top complaint categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={grievanceCategoryData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -10,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="name"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      cursor={{ fill: "transparent" }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {grievanceCategoryData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Project Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Project Status</CardTitle>
                  <CardDescription className="text">
                    {s.totalProjects} total projects • {fmt(s.totalBudget)}{" "}
                    budget
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] flex items-center justify-center">
                {projectPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {projectPieData.map((e: any, i: number) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
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
        </div>

        {/* ═══ Row 4: Recent Grievances + Projects ════ */}
        <div className="grid xl:grid-cols-3 gap-6">
          {/* Recent Grievances */}
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Recent Grievances</CardTitle>
                <CardDescription>Latest citizen complaints</CardDescription>
              </div>
              <Link to="/grievances">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] text-muted-foreground uppercase bg-muted/30">
                    <tr>
                      <th className="px-4 py-2.5 text-left rounded-tl-lg">
                        Ticket
                      </th>
                      <th className="px-4 py-2.5 text-left">Subject</th>
                      <th className="px-4 py-2.5 text-left">Complainant</th>
                      <th className="px-4 py-2.5 text-left">Priority</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                      <th className="px-4 py-2.5 text-left">Age</th>
                      <th className="px-4 py-2.5 rounded-tr-lg" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {d.grievances.recent.map((g: any) => {
                      const st = STATUS_STYLES[g.status] || STATUS_STYLES.OPEN;
                      const pr = PRIORITY_COLORS[g.priority] || "";
                      return (
                        <tr
                          key={g.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <span
                              onClick={() => navigate("/grievances/detail", { state: { id: g.id } })}
                              className="font-mono text-xs text-primary hover:underline cursor-pointer font-semibold"
                            >
                              {g.ticketNumber}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 max-w-[180px] truncate text-sm">
                            {g.subject || g.category}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground text-sm">
                            {g.complainantName || "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${pr}`}
                            >
                              {g.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${st.bg}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                              />
                              {g.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(g.createdAt), {
                              addSuffix: false,
                            })}
                          </td>
                          <td className="px-4 py-2.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => navigate("/grievances/detail", { state: { id: g.id } })}
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
                          No grievances yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Project Highlights
                  </CardTitle>
                  <CardDescription>Active development works</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {d.projects.recent.map((p: any) => {
                const ps = PROJECT_STATUS[p.status] || PROJECT_STATUS.PENDING;
                return (
                  <Link to={`/projects/${p.id}`} key={p.id}>
                    <div className="cursor-pointer group">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                            {p.name}
                          </h4>
                          <span className="text-[10px] text-muted-foreground">
                            #{p.ward?.wardNumber} {p.ward?.name} •{" "}
                            {fmt(p.budgetSanctioned)}
                          </span>
                        </div>
                        <Badge
                          className="text-[10px] ml-2 flex-shrink-0"
                          style={{
                            backgroundColor: `${ps.color}20`,
                            color: ps.color,
                          }}
                        >
                          {ps.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${p.completionPercent}%`,
                              backgroundColor: ps.color,
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-medium w-8 text-right">
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
        </div>

        {/* ═══ Row 5: Quick Access + Priority Breakdown ═ */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Grievance Priority Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Grievance Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {d.grievances.byPriority.map((p: any) => {
                  const colors: Record<string, string> = {
                    URGENT: "#ef4444",
                    HIGH: "#f97316",
                    MEDIUM: "#f59e0b",
                    LOW: "#22c55e",
                  };
                  return (
                    <div
                      key={p.priority}
                      className="text-center p-3 rounded-lg border"
                    >
                      <div
                        className="w-3 h-3 rounded-full mx-auto mb-1.5"
                        style={{
                          backgroundColor: colors[p.priority] || "#6b7280",
                        }}
                      />
                      <p className="text-lg font-bold">{p.count}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.priority}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Navigation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: "Institutions",
                  count: s.totalInstitutions,
                  href: "/institutions",
                  Icon: Building2,
                  color: "#6366f1",
                },
                {
                  label: "Departments",
                  count: s.totalDepartments,
                  href: "/departments",
                  Icon: Landmark,
                  color: "#8b5cf6",
                },
                {
                  label: "Wards",
                  count: s.totalWards,
                  href: "/wards",
                  Icon: Map,
                  color: "#3b82f6",
                },
              ].map((item) => (
                <Link to={item.href} key={item.label}>
                  <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${item.color}15`,
                        }}
                      >
                        <item.Icon
                          className="h-4 w-4"
                          style={{ color: item.color }}
                        />
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {item.count}
                    </Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Scheme Coverage */}
          {/* <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Scheme Coverage</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    strokeWidth="10"
                    className="stroke-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    strokeWidth="10"
                    strokeDasharray={`${s.schemeCoverage * 2.51} 251`}
                    strokeLinecap="round"
                    className="stroke-purple-500 transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">
                    {s.schemeCoverage}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {s.totalBeneficiaries.toLocaleString()} beneficiaries
              </p>
              <Link to="/schemes">
                <Button variant="ghost" size="sm" className="text-xs mt-1">
                  View Schemes →
                </Button>
              </Link>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </MainLayout>
  );
}
