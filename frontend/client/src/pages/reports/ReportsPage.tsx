import { useState, useMemo } from "react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  useGrievanceReport,
  useProjectReport,
  useWardReport,
  // useSchemeReport,
  useInstitutionReport,
  useDemographicReport,
  useMonthlyReport,
  useExportReport,
} from "@/hooks/useReports";
import { useWards } from "@/hooks/useWards";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import {
  BarChart3,
  FileText,
  Download,
  Printer,
  Filter,
  Calendar,
  ClipboardList,
  Building2,
  Map,
  Users,
  PieChart as PieIcon,
  MessageSquare,
  Landmark,
  TrendingUp,
} from "lucide-react";

type ReportType =
  | "grievance"
  | "project"
  | "ward"
  // | "scheme"
  | "institution"
  | "demographic"
  | "monthly";
type DateRange =
  | "this_week"
  | "this_month"
  | "this_year"
  | "last_7"
  | "last_30"
  | "last_90"
  | "custom";

const REPORTS = [
  {
    id: "grievance" as const,
    label: "Grievance",
    icon: MessageSquare,
    desc: "Status, category, priority breakdown",
  },
  {
    id: "project" as const,
    label: "Projects",
    icon: ClipboardList,
    desc: "Budget, timelines, completion",
  },
  {
    id: "ward" as const,
    label: "Ward Performance",
    icon: Map,
    desc: "Ward-wise consolidated view",
  },
  // {
  //   id: "scheme" as const,
  //   label: "Schemes",
  //   icon: Users,
  //   desc: "Beneficiary coverage analysis",
  // },
  {
    id: "institution" as const,
    label: "Institutions",
    icon: Building2,
    desc: "Category-wise listing",
  },
  {
    id: "demographic" as const,
    label: "Demographics",
    icon: PieIcon,
    desc: "Population breakdown",
  },
  {
    id: "monthly" as const,
    label: "Monthly",
    icon: BarChart3,
    desc: "Governance overview",
  },
];

const DATE_RANGES = [
  { id: "this_week" as const, label: "This Week" },
  { id: "this_month" as const, label: "This Month" },
  { id: "this_year" as const, label: "This Year" },
  { id: "last_7" as const, label: "Last 7 Days" },
  { id: "last_30" as const, label: "Last 30 Days" },
  { id: "last_90" as const, label: "Last 90 Days" },
  { id: "custom" as const, label: "Custom Range" },
];

const COLORS = [
  "#6366f1",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function ReportsPage() {
  const [active, setActive] = useState<ReportType>("grievance");
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  const [wardFilter, setWardFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();
  const exportReport = useExportReport();
  const { data: wardsRes } = useWards({ limit: 100 });
  const wards = wardsRes?.data?.wards || [];
  const today = new Date();

  const interval = useMemo(() => {
    switch (dateRange) {
      case "this_week":
        return {
          start: startOfWeek(today, { weekStartsOn: 1 }),
          end: endOfWeek(today, { weekStartsOn: 1 }),
        };
      case "this_month":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "this_year":
        return { start: startOfYear(today), end: endOfYear(today) };
      case "last_7":
        return { start: subDays(today, 7), end: today };
      case "last_30":
        return { start: subDays(today, 30), end: today };
      case "last_90":
        return { start: subDays(today, 90), end: today };
      case "custom":
        return {
          start: customFrom || subDays(today, 30),
          end: customTo || today,
        };
    }
  }, [dateRange, customFrom, customTo]);

  const filterParams = useMemo(() => {
    const p: Record<string, any> = {
      dateFrom: interval.start.toISOString().split("T")[0],
      dateTo: interval.end.toISOString().split("T")[0],
    };
    if (wardFilter !== "all") p.wardId = wardFilter;
    return p;
  }, [interval, wardFilter]);

  const exportParams = useMemo(() => {
    const p: Record<string, any> = {};
    if (wardFilter !== "all") p.wardId = wardFilter;
    p.dateFrom = interval.start.toISOString().split("T")[0];
    p.dateTo = interval.end.toISOString().split("T")[0];
    return p;
  }, [interval, wardFilter]);

  // Report queries — only active one fetches
  const gReport = useGrievanceReport(
    active === "grievance" ? filterParams : undefined,
  );
  const pReport = useProjectReport(
    active === "project"
      ? { wardId: wardFilter !== "all" ? wardFilter : undefined }
      : undefined,
  );
  const wReport = useWardReport();
  // const sReport = useSchemeReport(
  //   active === "scheme"
  //     ? { wardId: wardFilter !== "all" ? wardFilter : undefined }
  //     : undefined,
  // );
  const iReport = useInstitutionReport(
    active === "institution"
      ? { wardId: wardFilter !== "all" ? wardFilter : undefined }
      : undefined,
  );
  const dReport = useDemographicReport();
  const mReport = useMonthlyReport();

  const isLoading =
    (active === "grievance" && gReport.isLoading) ||
    (active === "project" && pReport.isLoading) ||
    (active === "ward" && wReport.isLoading) ||
    // (active === "scheme" && sReport.isLoading) ||
    (active === "institution" && iReport.isLoading) ||
    (active === "demographic" && dReport.isLoading) ||
    (active === "monthly" && mReport.isLoading);

  return (
    <MainLayout title="Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate & export governance reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={() => exportReport(active, exportParams)}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Report Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            const isAct = active === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActive(r.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-200",
                  isAct
                    ? "bg-primary/10 border-primary/40 text-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-tight">
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <Select
                value={dateRange}
                onValueChange={(v) => setDateRange(v as DateRange)}
              >
                <SelectTrigger className="w-40">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dateRange === "custom" && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        {customFrom
                          ? format(customFrom, "dd MMM yyyy")
                          : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={customFrom}
                        onSelect={setCustomFrom}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        {customTo ? format(customTo, "dd MMM yyyy") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={customTo}
                        onSelect={setCustomTo}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger className="w-44">
                  <Map className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {wards.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      #{w.wardNumber} {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="ml-auto text-xs text-muted-foreground">
                {format(interval.start, "dd MMM yyyy")} —{" "}
                {format(interval.end, "dd MMM yyyy")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}

        {/* ═══ GRIEVANCE ══════════════════════════════════ */}
        {active === "grievance" &&
          gReport.data?.data &&
          (() => {
            const d = gReport.data.data;
            const s = d.summary;
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { label: "Total", value: s.total, color: "#6366f1" },
                    { label: "Open", value: s.open, color: "#3b82f6" },
                    { label: "Resolved", value: s.resolved, color: "#22c55e" },
                    { label: "Overdue", value: s.overdue, color: "#ef4444" },
                    {
                      label: "Resolution",
                      value: `${s.resolutionRate}%`,
                      color: "#8b5cf6",
                    },
                  ].map((c) => (
                    <Card key={c.label}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {c.label}
                        </p>
                        <p
                          className="text-2xl font-bold mt-1"
                          style={{ color: c.color }}
                        >
                          {c.value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">By Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={d.byCategory}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.1}
                            />
                            <XAxis dataKey="category" fontSize={10} />
                            <YAxis fontSize={10} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {d.byCategory.map((_: any, i: number) => (
                                <Cell
                                  key={i}
                                  fill={COLORS[i % COLORS.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">By Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={d.byStatus}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              dataKey="count"
                              nameKey="status"
                              label={({ status, percent }: any) =>
                                `${status} ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              {d.byStatus.map((_: any, i: number) => (
                                <Cell
                                  key={i}
                                  fill={COLORS[i % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {d.trend?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Monthly Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={d.trend}>
                            <defs>
                              <linearGradient
                                id="gf"
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
                                id="gr"
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
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.1}
                            />
                            <XAxis dataKey="month" fontSize={10} />
                            <YAxis fontSize={10} />
                            <Tooltip />
                            <Legend />
                            <Area
                              type="monotone"
                              dataKey="filed"
                              stroke="#3b82f6"
                              fill="url(#gf)"
                              strokeWidth={2}
                              name="Filed"
                            />
                            <Area
                              type="monotone"
                              dataKey="resolved"
                              stroke="#22c55e"
                              fill="url(#gr)"
                              strokeWidth={2}
                              name="Resolved"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Grievance Details ({d.rows.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Ward</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.rows.slice(0, 100).map((g: any) => (
                          <TableRow key={g.id}>
                            <TableCell className="font-mono text-xs">
                              {g.ticketNumber}
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate text-sm">
                              {g.subject || g.category}
                            </TableCell>
                            <TableCell className="text-xs">
                              {g.category}
                            </TableCell>
                            <TableCell className="text-xs">
                              #{g.ward?.wardNumber} {g.ward?.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {g.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="text-[10px]">{g.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(g.createdAt), "dd MMM yyyy")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()}

        {/* ═══ PROJECT ════════════════════════════════════ */}
        {active === "project" &&
          pReport.data?.data &&
          (() => {
            const d = pReport.data.data;
            const s = d.summary;
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "Total", value: s.total },
                    { label: "Running", value: s.running },
                    { label: "Completed", value: s.completed },
                    { label: "Budget", value: fmt(s.totalBudget) },
                    { label: "Used", value: fmt(s.totalUsed) },
                    { label: "Avg %", value: `${s.avgCompletion}%` },
                  ].map((c) => (
                    <Card key={c.label}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {c.label}
                        </p>
                        <p className="text-2xl font-bold text-primary mt-1">
                          {c.value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Budget by Category (₹ L)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={d.byCategory.map((c: any) => ({
                              name: c.category,
                              budget: Math.round(c.budget / 100000),
                            }))}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.1}
                            />
                            <XAxis dataKey="name" fontSize={10} />
                            <YAxis fontSize={10} />
                            <Tooltip formatter={(v) => `₹${v} L`} />
                            <Bar
                              dataKey="budget"
                              fill="#6366f1"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Fund Type Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={d.byFund.map((f: any) => ({
                                name: f.fundType,
                                value: f.count,
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              dataKey="value"
                              label
                            >
                              {d.byFund.map((_: any, i: number) => (
                                <Cell
                                  key={i}
                                  fill={COLORS[i % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Projects ({d.rows.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Ward</TableHead>
                          <TableHead>Dept</TableHead>
                          <TableHead className="text-right">Budget</TableHead>
                          <TableHead className="text-center">
                            Progress
                          </TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.rows.slice(0, 100).map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs">
                              {p.projectCode}
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate">
                              {p.name}
                            </TableCell>
                            <TableCell className="text-xs">
                              #{p.ward?.wardNumber} {p.ward?.name}
                            </TableCell>
                            <TableCell className="text-xs">
                              {p.departmentName}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {fmt(p.budgetSanctioned)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <Progress
                                  value={p.completionPercent}
                                  className="h-1.5 w-14"
                                />
                                <span className="text-xs">
                                  {p.completionPercent}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="text-[10px]">{p.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()}

        {/* ═══ WARD ═══════════════════════════════════════ */}
        {active === "ward" &&
          wReport.data?.data &&
          (() => {
            const d = wReport.data.data;
            return (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Ward-wise Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={d.wards}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" fontSize={9} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="grievances"
                            fill="#ef4444"
                            name="Grievances"
                          />
                          <Bar
                            dataKey="projects"
                            fill="#3b82f6"
                            name="Projects"
                          />
                          <Bar
                            dataKey="institutions"
                            fill="#22c55e"
                            name="Institutions"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ward</TableHead>
                          <TableHead className="text-right">
                            Population
                          </TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-center">
                            Grievances
                          </TableHead>
                          <TableHead className="text-center">
                            Projects
                          </TableHead>
                          <TableHead className="text-center">
                            Institutions
                          </TableHead>
                          <TableHead className="text-right">
                            Project Budget
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.wards.map((w: any) => (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium">
                              #{w.wardNumber} {w.name}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {w.totalPopulation.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {w.areaType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {w.grievances}
                            </TableCell>
                            <TableCell className="text-center">
                              {w.projects}
                            </TableCell>
                            <TableCell className="text-center">
                              {w.institutions}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {fmt(w.projectBudget)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Total ({d.wards.length} wards)</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {d.totals.population.toLocaleString()}
                          </TableCell>
                          <TableCell />
                          <TableCell className="text-center">
                            {d.totals.grievances}
                          </TableCell>
                          <TableCell className="text-center">
                            {d.totals.projects}
                          </TableCell>
                          <TableCell className="text-center">
                            {d.totals.institutions}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {fmt(d.totals.budget)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()}

        {/* ═══ SCHEME ═════════════════════════════════════ */}
        {/* {active === "scheme" &&
          sReport.data?.data &&
          (() => {
            const d = sReport.data.data;
            const t = d.totals;
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Active Schemes", value: t.active },
                    { label: "Total Budget", value: fmt(t.budget) },
                    {
                      label: "Beneficiaries",
                      value: t.beneficiaries.toLocaleString(),
                    },
                    { label: "Coverage", value: `${t.overallCoverage}%` },
                  ].map((c) => (
                    <Card key={c.label}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {c.label}
                        </p>
                        <p className="text-2xl font-bold text-primary mt-1">
                          {c.value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Beneficiary Coverage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {d.rows.length === 0 ? (
                      <div className="h-[280px] flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">
                          No schemes available for selected ward
                        </p>
                      </div>
                    ) : (
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={d.rows.map((s: any) => ({
                              name:
                                s.name.length > 16
                                  ? s.name.slice(0, 16) + "…"
                                  : s.name,
                              target: s.totalTarget,
                              actual: s.totalBeneficiaries,
                            }))}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.1}
                            />
                            <XAxis dataKey="name" fontSize={9} />
                            <YAxis fontSize={10} />
                            <Tooltip />
                            <Legend />
                            <Bar
                              dataKey="target"
                              fill="#94a3b8"
                              name="Target"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="actual"
                              fill="#22c55e"
                              name="Actual"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scheme</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead className="text-right">Budget</TableHead>
                          <TableHead className="text-right">Target</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-center">
                            Coverage
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.rows.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {s.name}
                            </TableCell>
                            <TableCell className="text-xs">
                              {s.department}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {s.level}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {fmt(s.budget)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {s.totalTarget.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {s.totalBeneficiaries.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <Progress
                                  value={s.coverage}
                                  className="h-1.5 w-14"
                                />
                                <span className="text-xs">{s.coverage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()} */}

        {/* ═══ INSTITUTION ════════════════════════════════ */}
        {active === "institution" &&
          iReport.data?.data &&
          (() => {
            const d = iReport.data.data;
            const s = d.summary;
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total", value: s.total },
                    { label: "Active", value: s.active },
                    { label: "Under Maintenance", value: s.underMaintenance },
                    { label: "Categories", value: s.categories },
                  ].map((c) => (
                    <Card key={c.label}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {c.label}
                        </p>
                        <p className="text-2xl font-bold text-primary mt-1">
                          {c.value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={d.byCategory}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="category" fontSize={9} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill="#22c55e"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Ward</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.rows.map((i: any) => (
                          <TableRow key={i.id}>
                            <TableCell className="font-medium">
                              {i.name}
                            </TableCell>
                            <TableCell className="text-xs capitalize">
                              {i.category.replace(/_/g, " ")}
                            </TableCell>
                            <TableCell className="text-xs">
                              #{i.ward?.wardNumber} {i.ward?.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {i.contactNo || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className="text-[10px]">{i.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()}

        {/* ═══ DEMOGRAPHIC ════════════════════════════════ */}
        {active === "demographic" &&
          dReport.data?.data &&
          (() => {
            const d = dReport.data.data;
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    {
                      label: "Population",
                      value: d.totals.population.toLocaleString(),
                    },
                    { label: "Male", value: d.totals.male.toLocaleString() },
                    {
                      label: "Female",
                      value: d.totals.female.toLocaleString(),
                    },
                    {
                      label: "Households",
                      value: d.totals.households.toLocaleString(),
                    },
                    { label: "Wards", value: d.totals.wards },
                  ].map((c) => (
                    <Card key={c.label}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {c.label}
                        </p>
                        <p className="text-2xl font-bold text-primary mt-1">
                          {c.value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Population by Ward
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={d.wards.map((w: any) => ({
                            name: `#${w.wardNumber}`,
                            population: w.totalPopulation,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Bar
                            dataKey="population"
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ward</TableHead>
                          <TableHead className="text-right">
                            Population
                          </TableHead>
                          <TableHead className="text-right">Male</TableHead>
                          <TableHead className="text-right">Female</TableHead>
                          <TableHead className="text-right">
                            Households
                          </TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Zone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {d.wards.map((w: any) => (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium">
                              #{w.wardNumber} {w.name}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {w.totalPopulation.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {w.totalMale.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {w.totalFemale.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {w.totalHouseholds.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {w.areaType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {w.zone || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            );
          })()}

        {/* ═══ MONTHLY ════════════════════════════════════ */}
        {active === "monthly" &&
          mReport.data?.data &&
          (() => {
            const d = mReport.data.data;
            const s = d.summary;
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    {
                      label: "Grievances (Month)",
                      value: s.grievancesThisMonth,
                    },
                    { label: "Resolved (Month)", value: s.resolvedThisMonth },
                    { label: "Running Projects", value: s.runningProjects },
                    { label: "Completed Projects", value: s.completedProjects },
                    { label: "Institutions", value: s.activeInstitutions },
                    // { label: "Active Schemes", value: s.activeSchemes },
                  ].map((c) => (
                    <Card key={c.label}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {c.label}
                        </p>
                        <p className="text-2xl font-bold text-primary mt-1">
                          {c.value}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Grievance Trend (6 Months)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={d.trend}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.1}
                            />
                            <XAxis dataKey="month" fontSize={10} />
                            <YAxis fontSize={10} />
                            <Tooltip />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="filed"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="resolved"
                              stroke="#22c55e"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Department Performance (Resolution %)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={d.deptPerformance.slice(0, 8)}
                            layout="vertical"
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.1}
                            />
                            <XAxis
                              type="number"
                              domain={[0, 100]}
                              fontSize={10}
                            />
                            <YAxis
                              dataKey="dept"
                              type="category"
                              width={100}
                              fontSize={10}
                            />
                            <Tooltip />
                            <Bar
                              dataKey="score"
                              fill="#6366f1"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-3">
                      Fund Overview ({s.financialYear})
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {
                          label: "Allocated",
                          value: s.allocated,
                          color: "#3b82f6",
                        },
                        {
                          label: "Released",
                          value: s.released,
                          color: "#f59e0b",
                        },
                        {
                          label: "Utilized",
                          value: s.utilized,
                          color: "#22c55e",
                        },
                      ].map((b) => (
                        <div key={b.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              {b.label}
                            </span>
                            <span className="font-mono font-semibold">
                              {fmt(b.value)}
                            </span>
                          </div>
                          <Progress
                            value={
                              s.allocated > 0
                                ? (b.value / s.allocated) * 100
                                : 0
                            }
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t">
          Report generated on {format(today, "dd MMMM yyyy, hh:mm a")} •
          Constituency Management Portal
        </div>
      </div>
    </MainLayout>
  );
}
