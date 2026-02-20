// import { MainLayout } from "@/components/layout/MainLayout";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,
//   CardDescription,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Cell,
//   LineChart,
//   Line,
//   PieChart,
//   Pie,
//   Legend,
//   AreaChart,
//   Area,
// } from "recharts";
// import {
//   FileDown,
//   Filter,
//   Calendar as CalendarIcon,
//   TrendingUp,
//   Users,
//   AlertCircle,
//   CheckCircle2,
//   Clock,
//   ArrowUpRight,
// } from "lucide-react";
// import { Badge } from "@/components/ui/badge";

// const monthlyData = [
//   { month: "Jan", grievances: 120, resolved: 95, projects: 2 },
//   { month: "Feb", grievances: 150, resolved: 110, projects: 3 },
//   { month: "Mar", grievances: 180, resolved: 140, projects: 5 },
//   { month: "Apr", grievances: 140, resolved: 130, projects: 4 },
//   { month: "May", grievances: 160, resolved: 145, projects: 6 },
//   { month: "Jun", grievances: 200, resolved: 170, projects: 8 },
// ];

// const categoryData = [
//   { name: "Roads", value: 35, color: "#3B82F6" },
//   { name: "Water", value: 25, color: "#10B981" },
//   { name: "Power", value: 20, color: "#F59E0B" },
//   { name: "Health", value: 15, color: "#EF4444" },
//   { name: "Others", value: 5, color: "#8B5CF6" },
// ];

// const wardPerformance = [
//   { ward: "Ward 01", efficiency: 92, cases: 45 },
//   { ward: "Ward 02", efficiency: 78, cases: 32 },
//   { ward: "Ward 03", efficiency: 85, cases: 58 },
//   { ward: "Ward 04", efficiency: 95, cases: 20 },
//   { ward: "Ward 05", efficiency: 65, cases: 85 },
// ];

// export default function Reports() {
//   return (
//     <MainLayout title="Analytics & Reports">
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
//         <div>
//           <h2 className="text-3xl font-bold font-heading tracking-tight">
//             Performance Insights
//           </h2>
//           <p className="text-muted-foreground">
//             Comprehensive reporting for constituency development
//           </p>
//         </div>
//         <div className="flex gap-3 w-full md:w-auto">
//           <Button
//             variant="outline"
//             className="gap-2 border-primary/20 hover:bg-primary/5"
//           >
//             <CalendarIcon className="h-4 w-4" />
//             Last 6 Months
//           </Button>
//           <Button className="gap-2 shadow-lg shadow-primary/20">
//             <FileDown className="h-4 w-4" />
//             Export Full Report
//           </Button>
//         </div>
//       </div>

//       {/* High Level Metrics */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//         {[
//           {
//             label: "Overall Efficiency",
//             value: "84.2%",
//             trend: "+2.4%",
//             icon: TrendingUp,
//             color: "text-emerald-500",
//           },
//           {
//             label: "Active Citizens",
//             value: "12,450",
//             trend: "+156",
//             icon: Users,
//             color: "text-blue-500",
//           },
//           {
//             label: "Critical Issues",
//             value: "24",
//             trend: "-5",
//             icon: AlertCircle,
//             color: "text-rose-500",
//           },
//           {
//             label: "Success Rate",
//             value: "91%",
//             trend: "+1.2%",
//             icon: CheckCircle2,
//             color: "text-emerald-500",
//           },
//         ].map((stat, i) => (
//           <Card
//             key={i}
//             className="glass-card border-none overflow-hidden group"
//           >
//             <CardContent className="p-6 relative">
//               <div className="flex justify-between items-start">
//                 <div>
//                   <p className="text-sm font-medium text-muted-foreground mb-1">
//                     {stat.label}
//                   </p>
//                   <h3 className="text-3xl font-bold font-heading">
//                     {stat.value}
//                   </h3>
//                 </div>
//                 <div
//                   className={`p-3 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors`}
//                 >
//                   <stat.icon className={`h-6 w-6 ${stat.color}`} />
//                 </div>
//               </div>
//               <div className="mt-4 flex items-center gap-1.5">
//                 <Badge
//                   variant="secondary"
//                   className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-medium"
//                 >
//                   {stat.trend}
//                 </Badge>
//                 <span className="text-xs text-muted-foreground">
//                   vs last period
//                 </span>
//               </div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       <Tabs defaultValue="overview" className="space-y-8">
//         <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto w-fit border border-border/50">
//           <TabsTrigger
//             value="overview"
//             className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg"
//           >
//             Overview
//           </TabsTrigger>
//           <TabsTrigger
//             value="grievances"
//             className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg"
//           >
//             Grievances
//           </TabsTrigger>
//           <TabsTrigger
//             value="projects"
//             className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg"
//           >
//             Projects
//           </TabsTrigger>
//           <TabsTrigger
//             value="wards"
//             className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-lg"
//           >
//             Ward Comparison
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="overview" className="space-y-8">
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//             <Card className="glass-card border-none p-2">
//               <CardHeader>
//                 <CardTitle>Grievance vs Resolution Trend</CardTitle>
//                 <CardDescription>
//                   Monthly growth and closure tracking
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="h-[350px] w-full">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <AreaChart data={monthlyData}>
//                       <defs>
//                         <linearGradient id="colorG" x1="0" y1="0" x2="0" y2="1">
//                           <stop
//                             offset="5%"
//                             stopColor="#3B82F6"
//                             stopOpacity={0.3}
//                           />
//                           <stop
//                             offset="95%"
//                             stopColor="#3B82F6"
//                             stopOpacity={0}
//                           />
//                         </linearGradient>
//                         <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
//                           <stop
//                             offset="5%"
//                             stopColor="#10B981"
//                             stopOpacity={0.3}
//                           />
//                           <stop
//                             offset="95%"
//                             stopColor="#10B981"
//                             stopOpacity={0}
//                           />
//                         </linearGradient>
//                       </defs>
//                       <CartesianGrid
//                         strokeDasharray="3 3"
//                         vertical={false}
//                         opacity={0.1}
//                       />
//                       <XAxis
//                         dataKey="month"
//                         axisLine={false}
//                         tickLine={false}
//                         fontSize={12}
//                         dy={10}
//                       />
//                       <YAxis axisLine={false} tickLine={false} fontSize={12} />
//                       <Tooltip
//                         contentStyle={{
//                           borderRadius: "16px",
//                           border: "none",
//                           boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
//                         }}
//                       />
//                       <Area
//                         type="monotone"
//                         dataKey="grievances"
//                         stroke="#3B82F6"
//                         strokeWidth={3}
//                         fillOpacity={1}
//                         fill="url(#colorG)"
//                         name="New Cases"
//                       />
//                       <Area
//                         type="monotone"
//                         dataKey="resolved"
//                         stroke="#10B981"
//                         strokeWidth={3}
//                         fillOpacity={1}
//                         fill="url(#colorR)"
//                         name="Resolved"
//                       />
//                     </AreaChart>
//                   </ResponsiveContainer>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card className="glass-card border-none p-2">
//               <CardHeader>
//                 <CardTitle>Category Distribution</CardTitle>
//                 <CardDescription>Sector-wise issue breakdown</CardDescription>
//               </CardHeader>
//               <CardContent className="flex flex-col items-center">
//                 <div className="h-[300px] w-full">
//                   <ResponsiveContainer width="100%" height="100%">
//                     <PieChart>
//                       <Pie
//                         data={categoryData}
//                         cx="50%"
//                         cy="50%"
//                         innerRadius={80}
//                         outerRadius={110}
//                         paddingAngle={8}
//                         dataKey="value"
//                       >
//                         {categoryData.map((entry, index) => (
//                           <Cell key={`cell-${index}`} fill={entry.color} />
//                         ))}
//                       </Pie>
//                       <Tooltip />
//                       <Legend
//                         verticalAlign="bottom"
//                         align="center"
//                         iconType="circle"
//                         wrapperStyle={{ paddingTop: "20px" }}
//                       />
//                     </PieChart>
//                   </ResponsiveContainer>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           <Card className="glass-card border-none">
//             <CardHeader className="flex flex-row items-center justify-between">
//               <div>
//                 <CardTitle>Ward Performance Leaderboard</CardTitle>
//                 <CardDescription>
//                   Efficiency and case load by administrative ward
//                 </CardDescription>
//               </div>
//               <Button variant="ghost" className="gap-2 text-primary">
//                 View All Wards <ArrowUpRight className="h-4 w-4" />
//               </Button>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-6">
//                 {wardPerformance
//                   .sort((a, b) => b.efficiency - a.efficiency)
//                   .map((ward, i) => (
//                     <div key={i} className="space-y-2">
//                       <div className="flex justify-between items-end">
//                         <div className="flex items-center gap-3">
//                           <span className="text-sm font-bold text-muted-foreground w-6">
//                             0{i + 1}
//                           </span>
//                           <div>
//                             <p className="font-semibold text-foreground">
//                               {ward.ward}
//                             </p>
//                             <p className="text-xs text-muted-foreground">
//                               {ward.cases} Total Cases
//                             </p>
//                           </div>
//                         </div>
//                         <div className="text-right">
//                           <span
//                             className={`text-sm font-bold ${ward.efficiency > 80 ? "text-emerald-500" : "text-amber-500"}`}
//                           >
//                             {ward.efficiency}% Efficiency
//                           </span>
//                         </div>
//                       </div>
//                       <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
//                         <div
//                           className={`h-full transition-all duration-1000 ${ward.efficiency > 80 ? "bg-emerald-500" : ward.efficiency > 70 ? "bg-amber-500" : "bg-rose-500"}`}
//                           style={{ width: `${ward.efficiency}%` }}
//                         />
//                       </div>
//                     </div>
//                   ))}
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="grievances">
//           <Card className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed">
//             <Clock className="h-12 w-12 text-muted-foreground mb-4" />
//             <h3 className="text-xl font-bold font-heading">
//               Grievance Deep Dive
//             </h3>
//             <p className="text-muted-foreground max-w-sm mx-auto mt-2">
//               Detailed breakdowns by resolution time, department responsiveness,
//               and recurring issue patterns.
//             </p>
//             <Button className="mt-6" variant="outline">
//               Generate Detailed View
//             </Button>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </MainLayout>
//   );
// }

import { useState, useMemo } from "react";
import {
  format,
  subDays,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
} from "date-fns";
import {
  BarChart3,
  FileText,
  Download,
  Printer,
  Filter,
  Calendar,
  ChevronDown,
  TrendingUp,
  Users,
  ClipboardList,
  Building2,
  Map,
  ShieldCheck,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import {
  MOCK_GRIEVANCES,
  MOCK_PROJECTS,
  MOCK_INSTITUTIONS,
  MOCK_SCHEMES,
  MOCK_WARDS,
  GRIEVANCE_BY_CATEGORY,
  MONTHLY_GRIEVANCE_TREND,
  DEPARTMENT_PERFORMANCE,
} from "@/lib/mock-data";
import { GRIEVANCE_CATEGORIES } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { MainLayout } from "@/components/layout/MainLayout";

type ReportType =
  | "grievance"
  | "project"
  | "institution"
  | "ward"
  | "scheme"
  | "demographic"
  | "monthly";
type DateRange =
  | "today"
  | "this_week"
  | "this_month"
  | "this_year"
  | "last_7"
  | "last_30"
  | "last_90"
  | "custom";

const REPORT_TYPES: {
  id: ReportType;
  label: string;
  icon: any;
  description: string;
}[] = [
  {
    id: "grievance",
    label: "Grievance Summary",
    icon: FileText,
    description: "Complaints by status, category, ward & priority",
  },
  {
    id: "project",
    label: "Project Progress",
    icon: ClipboardList,
    description: "Budget utilisation, timelines & completion rates",
  },
  {
    id: "institution",
    label: "Institution Directory",
    icon: Building2,
    description: "Category-wise institution listing with status",
  },
  {
    id: "ward",
    label: "Ward Performance",
    icon: Map,
    description: "Ward-wise grievances, projects & institutions",
  },
  {
    id: "scheme",
    label: "Scheme Coverage",
    icon: Users,
    description: "Beneficiary targets vs actuals, budget usage",
  },
  {
    id: "demographic",
    label: "Demographic Summary",
    icon: PieChart,
    description: "Population breakdown by ward & area type",
  },
  {
    id: "monthly",
    label: "Monthly Governance",
    icon: BarChart3,
    description: "Consolidated monthly governance overview",
  },
];

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "this_year", label: "This Year" },
  { id: "last_7", label: "Last 7 Days" },
  { id: "last_30", label: "Last 30 Days" },
  { id: "last_90", label: "Last 90 Days" },
  { id: "custom", label: "Custom Range" },
];

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(190, 80%, 45%)",
  "hsl(330, 70%, 55%)",
  "hsl(80, 60%, 45%)",
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("grievance");
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  const [wardFilter, setWardFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();
  const [previewOpen, setPreviewOpen] = useState(false);

  const today = new Date();

  const getDateInterval = () => {
    switch (dateRange) {
      case "today":
        return { start: today, end: today };
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
  };

  const interval = getDateInterval();

  const filteredGrievances = useMemo(() => {
    return MOCK_GRIEVANCES.filter((g) => {
      const d = parseISO(g.created_date);
      const inDate = isWithinInterval(d, {
        start: interval.start,
        end: interval.end,
      });
      const inWard = wardFilter === "all" || g.ward_id === wardFilter;
      return inDate && inWard;
    });
  }, [dateRange, wardFilter, customFrom, customTo]);

  const filteredProjects = useMemo(() => {
    return MOCK_PROJECTS.filter((p) => {
      const inWard = wardFilter === "all" || p.ward_id === wardFilter;
      return inWard;
    });
  }, [wardFilter]);

  const filteredInstitutions = useMemo(() => {
    return MOCK_INSTITUTIONS.filter(
      (i) => wardFilter === "all" || i.ward_id === wardFilter,
    );
  }, [wardFilter]);

  const filteredSchemes = useMemo(() => {
    return MOCK_SCHEMES.filter(
      (s) => wardFilter === "all" || s.ward_id === wardFilter,
    );
  }, [wardFilter]);

  // Summary stats
  const grievanceStats = useMemo(() => {
    const total = filteredGrievances.length;
    const pending = filteredGrievances.filter(
      (g) => g.status === "pending",
    ).length;
    const resolved = filteredGrievances.filter(
      (g) => g.status === "resolved",
    ).length;
    const inProgress = filteredGrievances.filter(
      (g) => g.status === "in_progress",
    ).length;
    const highPriority = filteredGrievances.filter(
      (g) => g.priority === "high",
    ).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return {
      total,
      pending,
      resolved,
      inProgress,
      highPriority,
      resolutionRate,
    };
  }, [filteredGrievances]);

  const projectStats = useMemo(() => {
    const total = filteredProjects.length;
    const completed = filteredProjects.filter(
      (p) => p.status === "completed",
    ).length;
    const running = filteredProjects.filter(
      (p) => p.status === "running",
    ).length;
    const totalBudget = filteredProjects.reduce(
      (s, p) => s + p.budget_sanctioned,
      0,
    );
    const usedBudget = filteredProjects.reduce((s, p) => s + p.budget_used, 0);
    const avgCompletion =
      total > 0
        ? Math.round(
            filteredProjects.reduce((s, p) => s + p.completion_percentage, 0) /
              total,
          )
        : 0;
    return {
      total,
      completed,
      running,
      totalBudget,
      usedBudget,
      avgCompletion,
    };
  }, [filteredProjects]);

  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredGrievances.forEach((g) => {
      counts[g.category] = (counts[g.category] || 0) + 1;
    });
    return Object.entries(counts).map(([k, v]) => ({
      name: GRIEVANCE_CATEGORIES[k] || k,
      value: v,
    }));
  }, [filteredGrievances]);

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredGrievances.forEach((g) => {
      counts[g.status] = (counts[g.status] || 0) + 1;
    });
    return Object.entries(counts).map(([k, v]) => ({
      name: k.replace("_", " "),
      value: v,
    }));
  }, [filteredGrievances]);

  const projectBudgetData = useMemo(() => {
    return filteredProjects.map((p) => ({
      name:
        p.project_name.length > 18
          ? p.project_name.slice(0, 18) + "…"
          : p.project_name,
      sanctioned: p.budget_sanctioned / 100000,
      released: p.budget_released / 100000,
      used: p.budget_used / 100000,
    }));
  }, [filteredProjects]);

  const wardSummary = useMemo(() => {
    return MOCK_WARDS.map((w) => ({
      ...w,
      grievances: MOCK_GRIEVANCES.filter((g) => g.ward_id === w.ward_id).length,
      projects: MOCK_PROJECTS.filter((p) => p.ward_id === w.ward_id).length,
      institutions: MOCK_INSTITUTIONS.filter((i) => i.ward_id === w.ward_id)
        .length,
      schemes: MOCK_SCHEMES.filter((s) => s.ward_id === w.ward_id).length,
    }));
  }, []);

  const handlePrint = () => window.print();

  const formatCurrency = (v: number) => `₹${(v / 100000).toFixed(1)}L`;

  const activeReportMeta = REPORT_TYPES.find((r) => r.id === activeReport)!;

  return (
    <MainLayout title="Reports">
      <div className="space-y-6 page-transition">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">
              Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate, preview, and download governance reports
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Print
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground">
              <Download className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-1.5" /> Export Excel
            </Button>
          </div>
        </div>

        {/* Report Type Selector Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {REPORT_TYPES.map((r) => {
            const Icon = r.icon;
            const isActive = activeReport === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary/10 border-primary/40 text-primary shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold leading-tight">
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" /> Filters
              </div>
              <Select
                value={dateRange}
                onValueChange={(v) => setDateRange(v as DateRange)}
              >
                <SelectTrigger className="w-[160px]">
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={customFrom}
                        onSelect={setCustomFrom}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        {customTo ? format(customTo, "dd MMM yyyy") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={customTo}
                        onSelect={setCustomTo}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger className="w-[170px]">
                  <Map className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {MOCK_WARDS.map((w) => (
                    <SelectItem key={w.ward_id} value={w.ward_id}>
                      {w.ward_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto text-xs text-muted-foreground">
                {format(interval.start, "dd MMM yyyy")} —{" "}
                {format(interval.end, "dd MMM yyyy")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <div className="space-y-6">
          {/* ─── GRIEVANCE REPORT ─── */}
          {activeReport === "grievance" && (
            <>
              {/* KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: "Total",
                    value: grievanceStats.total,
                    color: "text-primary",
                  },
                  {
                    label: "Pending",
                    value: grievanceStats.pending,
                    color: "text-warning",
                  },
                  {
                    label: "In Progress",
                    value: grievanceStats.inProgress,
                    color: "text-primary",
                  },
                  {
                    label: "Resolved",
                    value: grievanceStats.resolved,
                    color: "text-accent",
                  },
                  {
                    label: "High Priority",
                    value: grievanceStats.highPriority,
                    color: "text-destructive",
                  },
                  {
                    label: "Resolution %",
                    value: `${grievanceStats.resolutionRate}%`,
                    color: "text-accent",
                  },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p
                        className={cn(
                          "text-2xl font-bold font-heading mt-1",
                          s.color,
                        )}
                      >
                        {s.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryChartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="value"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
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
                        <RePieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {statusChartData.map((_, i) => (
                              <Cell
                                key={i}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Monthly Grievance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={MONTHLY_GRIEVANCE_TREND}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="filed"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.15}
                        />
                        <Area
                          type="monotone"
                          dataKey="resolved"
                          stroke="hsl(var(--chart-2))"
                          fill="hsl(var(--chart-2))"
                          fillOpacity={0.15}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Data Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Grievance Details</CardTitle>
                  <CardDescription className="text-xs">
                    {filteredGrievances.length} records
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Citizen</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGrievances.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No grievances in selected range
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredGrievances.map((g) => (
                          <TableRow key={g.grievance_id}>
                            <TableCell className="font-mono text-xs">
                              {g.grievance_id}
                            </TableCell>
                            <TableCell className="font-medium">
                              {g.citizen_name}
                            </TableCell>
                            <TableCell>
                              {GRIEVANCE_CATEGORIES[g.category]}
                            </TableCell>
                            <TableCell>
                              {
                                MOCK_WARDS.find((w) => w.ward_id === g.ward_id)
                                  ?.ward_name
                              }
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={g.priority} />
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={g.status} />
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(parseISO(g.created_date), "dd MMM yyyy")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── PROJECT REPORT ─── */}
          {activeReport === "project" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: "Total Projects",
                    value: projectStats.total,
                    color: "text-primary",
                  },
                  {
                    label: "Completed",
                    value: projectStats.completed,
                    color: "text-accent",
                  },
                  {
                    label: "Running",
                    value: projectStats.running,
                    color: "text-primary",
                  },
                  {
                    label: "Total Budget",
                    value: formatCurrency(projectStats.totalBudget),
                    color: "text-foreground",
                  },
                  {
                    label: "Budget Used",
                    value: formatCurrency(projectStats.usedBudget),
                    color: "text-warning",
                  },
                  {
                    label: "Avg Completion",
                    value: `${projectStats.avgCompletion}%`,
                    color: "text-accent",
                  },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p
                        className={cn(
                          "text-2xl font-bold font-heading mt-1",
                          s.color,
                        )}
                      >
                        {s.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Budget Comparison (₹ in Lakhs)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={projectBudgetData} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={130}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="sanctioned"
                          fill="hsl(var(--primary))"
                          name="Sanctioned"
                          radius={[0, 4, 4, 0]}
                        />
                        <Bar
                          dataKey="released"
                          fill="hsl(var(--chart-2))"
                          name="Released"
                          radius={[0, 4, 4, 0]}
                        />
                        <Bar
                          dataKey="used"
                          fill="hsl(var(--chart-3))"
                          name="Used"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((p) => (
                        <TableRow key={p.project_id}>
                          <TableCell className="font-medium max-w-[180px] truncate">
                            {p.project_name}
                          </TableCell>
                          <TableCell>
                            {
                              MOCK_WARDS.find((w) => w.ward_id === p.ward_id)
                                ?.ward_name
                            }
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.department}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatCurrency(p.budget_sanctioned)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatCurrency(p.budget_used)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{
                                    width: `${p.completion_percentage}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs">
                                {p.completion_percentage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={p.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── INSTITUTION REPORT ─── */}
          {activeReport === "institution" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: "Total Institutions",
                    value: filteredInstitutions.length,
                  },
                  {
                    label: "Active",
                    value: filteredInstitutions.filter(
                      (i) => i.status === "active",
                    ).length,
                  },
                  {
                    label: "Under Maintenance",
                    value: filteredInstitutions.filter(
                      (i) => i.status === "under_maintenance",
                    ).length,
                  },
                  {
                    label: "Categories",
                    value: new Set(
                      filteredInstitutions.map((i) => i.inst_category),
                    ).size,
                  },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold font-heading text-primary mt-1">
                        {s.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Category Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(() => {
                          const counts: Record<string, number> = {};
                          filteredInstitutions.forEach((i) => {
                            counts[i.inst_category] =
                              (counts[i.inst_category] || 0) + 1;
                          });
                          return Object.entries(counts).map(([k, v]) => ({
                            name: k.replace("_", " "),
                            value: v,
                          }));
                        })()}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar
                          dataKey="value"
                          fill="hsl(var(--chart-2))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Institution Listing</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Est. Year</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInstitutions.map((i) => (
                        <TableRow key={i.institution_id}>
                          <TableCell className="font-medium">
                            {i.name}
                          </TableCell>
                          <TableCell className="capitalize text-xs">
                            {i.inst_category.replace("_", " ")}
                          </TableCell>
                          <TableCell>
                            {
                              MOCK_WARDS.find((w) => w.ward_id === i.ward_id)
                                ?.ward_name
                            }
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {i.official_contact_no}
                          </TableCell>
                          <TableCell className="text-xs">
                            {i.established_year || "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={i.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── WARD PERFORMANCE REPORT ─── */}
          {activeReport === "ward" && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ward-wise Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={wardSummary}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis dataKey="ward_name" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="grievances"
                          fill="hsl(var(--chart-4))"
                          name="Grievances"
                        />
                        <Bar
                          dataKey="projects"
                          fill="hsl(var(--primary))"
                          name="Projects"
                        />
                        <Bar
                          dataKey="institutions"
                          fill="hsl(var(--chart-2))"
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
                        <TableHead>Population</TableHead>
                        <TableHead>Area Type</TableHead>
                        <TableHead>Grievances</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead>Institutions</TableHead>
                        <TableHead>Schemes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wardSummary.map((w) => (
                        <TableRow key={w.ward_id}>
                          <TableCell className="font-medium">
                            {w.ward_name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {w.population.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="capitalize text-xs"
                            >
                              {w.area_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{w.grievances}</TableCell>
                          <TableCell>{w.projects}</TableCell>
                          <TableCell>{w.institutions}</TableCell>
                          <TableCell>{w.schemes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── SCHEME COVERAGE REPORT ─── */}
          {activeReport === "scheme" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Schemes", value: filteredSchemes.length },
                  {
                    label: "Total Budget",
                    value: `₹${(filteredSchemes.reduce((s, sc) => s + sc.budget, 0) / 10000000).toFixed(1)}Cr`,
                  },
                  {
                    label: "Target Beneficiaries",
                    value: filteredSchemes
                      .reduce((s, sc) => s + sc.target_beneficiaries, 0)
                      .toLocaleString(),
                  },
                  {
                    label: "Current Beneficiaries",
                    value: filteredSchemes
                      .reduce((s, sc) => s + sc.current_beneficiaries, 0)
                      .toLocaleString(),
                  },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold font-heading text-primary mt-1">
                        {s.value}
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
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={filteredSchemes.map((s) => ({
                          name:
                            s.name.length > 16
                              ? s.name.slice(0, 16) + "…"
                              : s.name,
                          target: s.target_beneficiaries,
                          current: s.current_beneficiaries,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="target"
                          fill="hsl(var(--muted-foreground))"
                          name="Target"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="current"
                          fill="hsl(var(--chart-2))"
                          name="Current"
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
                        <TableHead>Scheme</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Ward</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Coverage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchemes.map((s) => (
                        <TableRow key={s.scheme_id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {s.name}
                          </TableCell>
                          <TableCell className="text-xs">
                            {s.department}
                          </TableCell>
                          <TableCell>
                            {
                              MOCK_WARDS.find((w) => w.ward_id === s.ward_id)
                                ?.ward_name
                            }
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatCurrency(s.budget)}
                          </TableCell>
                          <TableCell>
                            {s.target_beneficiaries.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {s.current_beneficiaries.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-14 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-accent"
                                  style={{
                                    width: `${Math.round((s.current_beneficiaries / s.target_beneficiaries) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs">
                                {Math.round(
                                  (s.current_beneficiaries /
                                    s.target_beneficiaries) *
                                    100,
                                )}
                                %
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── DEMOGRAPHIC REPORT ─── */}
          {activeReport === "demographic" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: "Total Population",
                    value: MOCK_WARDS.reduce(
                      (s, w) => s + w.population,
                      0,
                    ).toLocaleString(),
                  },
                  { label: "Total Wards", value: MOCK_WARDS.length },
                  {
                    label: "Urban Wards",
                    value: MOCK_WARDS.filter((w) => w.area_type === "urban")
                      .length,
                  },
                  {
                    label: "Rural Wards",
                    value: MOCK_WARDS.filter((w) => w.area_type === "rural")
                      .length,
                  },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold font-heading text-primary mt-1">
                        {s.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                          data={MOCK_WARDS.map((w) => ({
                            name: w.ward_name,
                            population: w.population,
                          }))}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="population"
                            fill="hsl(var(--primary))"
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
                      Area Type Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={[
                              {
                                name: "Urban",
                                value: MOCK_WARDS.filter(
                                  (w) => w.area_type === "urban",
                                ).length,
                              },
                              {
                                name: "Semi-Urban",
                                value: MOCK_WARDS.filter(
                                  (w) => w.area_type === "semi-urban",
                                ).length,
                              },
                              {
                                name: "Rural",
                                value: MOCK_WARDS.filter(
                                  (w) => w.area_type === "rural",
                                ).length,
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {[0, 1, 2].map((i) => (
                              <Cell key={i} fill={CHART_COLORS[i]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ward</TableHead>
                        <TableHead>Population</TableHead>
                        <TableHead>Area Type</TableHead>
                        <TableHead>Zone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MOCK_WARDS.map((w) => (
                        <TableRow key={w.ward_id}>
                          <TableCell className="font-medium">
                            {w.ward_name}
                          </TableCell>
                          <TableCell className="font-mono">
                            {w.population.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="capitalize text-xs"
                            >
                              {w.area_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{w.zone}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ─── MONTHLY GOVERNANCE REPORT ─── */}
          {activeReport === "monthly" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Grievances Filed", value: MOCK_GRIEVANCES.length },
                  {
                    label: "Resolved",
                    value: MOCK_GRIEVANCES.filter(
                      (g) => g.status === "resolved",
                    ).length,
                  },
                  {
                    label: "Active Projects",
                    value: MOCK_PROJECTS.filter((p) => p.status === "running")
                      .length,
                  },
                  {
                    label: "Projects Done",
                    value: MOCK_PROJECTS.filter((p) => p.status === "completed")
                      .length,
                  },
                  { label: "Institutions", value: MOCK_INSTITUTIONS.length },
                  { label: "Active Schemes", value: MOCK_SCHEMES.length },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold font-heading text-primary mt-1">
                        {s.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Grievance Trend (12 Months)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={MONTHLY_GRIEVANCE_TREND}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="filed"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="resolved"
                            stroke="hsl(var(--chart-2))"
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
                      Department Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={DEPARTMENT_PERFORMANCE}
                          layout="vertical"
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            dataKey="dept"
                            type="category"
                            width={80}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="score"
                            fill="hsl(var(--primary))"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ward overview table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Ward-wise Consolidated Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ward</TableHead>
                        <TableHead>Population</TableHead>
                        <TableHead>Grievances</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead>Institutions</TableHead>
                        <TableHead>Schemes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wardSummary.map((w) => (
                        <TableRow key={w.ward_id}>
                          <TableCell className="font-medium">
                            {w.ward_name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {w.population.toLocaleString()}
                          </TableCell>
                          <TableCell>{w.grievances}</TableCell>
                          <TableCell>{w.projects}</TableCell>
                          <TableCell>{w.institutions}</TableCell>
                          <TableCell>{w.schemes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
          Report generated on {format(today, "dd MMMM yyyy, hh:mm a")} •
          Constituency Management Portal • Powered by Vibrantick Infotech
          Solutions
        </div>
      </div>
    </MainLayout>
  );
}
