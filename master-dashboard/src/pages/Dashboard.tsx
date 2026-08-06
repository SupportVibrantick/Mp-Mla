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
  Area,
  AreaChart,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Building2,
  Users,
  IndianRupee,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Eye,
  CreditCard,
  Shield,
  Activity,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Helpers ────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const TENANT_STATUS_STYLES: Record<string, { bg: string; dot: string }> = {
  ACTIVE: {
    bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  SUSPENDED: {
    bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  DEACTIVATED: {
    bg: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

const PAYMENT_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  SUCCESS: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  PENDING: {
    bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
    text: "text-amber-700 dark:text-amber-400",
  },
  FAILED: {
    bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
    text: "text-rose-700 dark:text-rose-400",
  },
  REFUNDED: {
    bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
    text: "text-blue-700 dark:text-blue-400",
  },
};

const CHART_COLORS = [
  "#6366f1", // Indigo
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#14b8a6", // Teal
];

// ─── Loading Skeleton ───────────────────────────────────

function DashboardSkeleton() {
  return (
    <MainLayout title="Platform Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-[350px] lg:col-span-2 rounded-xl" />
          <Skeleton className="h-[350px] rounded-xl" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    </MainLayout>
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
      <MainLayout title="Platform Dashboard">
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <p className="text-muted-foreground text-center">
            No platform dashboard statistics available.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </MainLayout>
    );

  const s = d.summary;

  const planPieData = (d.charts?.planDistribution || []).map(
    (item: any, i: number) => ({
      name: item.name,
      value: item.value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }),
  );

  return (
    <MainLayout title="Platform Dashboard">
      <div className="space-y-6">
        {/* ═══ Platform Administration Overview Banner ═══ */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#13538A] via-[#1a6aad] to-[#5D28A8] text-white p-6 sm:p-8 shadow-lg border border-white/10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <Badge
                variant="secondary"
                className="bg-white/15 hover:bg-white/25 text-white border-none backdrop-blur-md px-3 py-1 text-xs font-semibold"
              >
                SaaS Platform Control
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Master Administration Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Monitor global tenant metrics, subscription tiers, platform-wide modules, 
                and recurring system-wide revenues in real time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 xl:gap-8 bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 shadow-inner">
              <div className="space-y-1 pr-6 border-r border-white/10">
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                  Active Tenants
                </p>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {s.tenants.active} / {s.tenants.total}
                </p>
              </div>
              <div className="space-y-1 pr-6 border-r border-white/10">
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                  MRR
                </p>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {fmt(s.monthlyRecurringRevenue)}
                </p>
              </div>
              <div className="space-y-1 pr-6 border-r border-white/10">
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                  Modules
                </p>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {s.activeModules} / {s.totalModules}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">
                  System Health
                </p>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  100%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Row 1: Unified Stat Cards Grid ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Tenants */}
          <Link href="/tenants" className="block group">
            <Card className={cn(
              "h-full cursor-pointer transition-all duration-300 ease-out",
              "bg-white dark:bg-slate-900",
              "border border-slate-200/60 dark:border-slate-800/80",
              "border-t-[3px] sm:border-t-4",
              "border-t-[#13538A] dark:border-t-blue-500",
              "shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
              "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
              "hover:border-slate-300 dark:hover:border-slate-700",
            )}>
              <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                    Total Tenants
                  </p>
                  <div className="p-2.5 rounded-xl bg-[#13538A]/10 dark:bg-blue-950/40 flex items-center justify-center shrink-0 shadow-sm">
                    <Users className="h-5 w-5 text-[#13538A] dark:text-blue-400" />
                  </div>
                </div>
                <div className="w-full flex-1 flex flex-col justify-end">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white leading-none">
                    {s.tenants.total}
                  </h3>
                  <div className="flex items-end justify-between w-full mt-2 gap-2">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground/75 font-medium">
                      {s.tenants.active} Active • Constituencies
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Monthly Revenue (MRR) */}
          <Card className={cn(
            "h-full cursor-pointer transition-all duration-300 ease-out",
            "bg-white dark:bg-slate-900",
            "border border-slate-200/60 dark:border-slate-800/80",
            "border-t-[3px] sm:border-t-4",
            "border-t-emerald-600 dark:border-t-emerald-500",
            "shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
            "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
            "hover:border-slate-300 dark:hover:border-slate-700",
          )}>
            <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
              <div className="flex items-start justify-between w-full gap-2">
                <p className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                  Monthly Revenue
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 shadow-sm">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="w-full flex-1 flex flex-col justify-end">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white leading-none">
                  {fmt(s.monthlyRecurringRevenue)}
                </h3>
                <div className="flex items-end justify-between w-full mt-2 gap-2">
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground/75 font-medium">
                    Based on active subscriptions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className={cn(
            "h-full cursor-pointer transition-all duration-300 ease-out",
            "bg-white dark:bg-slate-900",
            "border border-slate-200/60 dark:border-slate-800/80",
            "border-t-[3px] sm:border-t-4",
            "border-t-cyan-600 dark:border-t-cyan-500",
            "shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
            "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
            "hover:border-slate-300 dark:hover:border-slate-700",
          )}>
            <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
              <div className="flex items-start justify-between w-full gap-2">
                <p className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                  Total Revenue
                </p>
                <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center shrink-0 shadow-sm">
                  <IndianRupee className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
              <div className="w-full flex-1 flex flex-col justify-end">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white leading-none">
                  {fmt(s.totalRevenue)}
                </h3>
                <div className="flex items-end justify-between w-full mt-2 gap-2">
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground/75 font-medium">
                    Total payments processed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions */}
          <Link href="/subscriptions" className="block group">
            <Card className={cn(
              "h-full cursor-pointer transition-all duration-300 ease-out",
              "bg-white dark:bg-slate-900",
              "border border-slate-200/60 dark:border-slate-800/80",
              "border-t-[3px] sm:border-t-4",
              "border-t-orange-500 dark:border-t-orange-400",
              "shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
              "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
              "hover:border-slate-300 dark:hover:border-slate-700",
            )}>
              <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                    Subscriptions
                  </p>
                  <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center shrink-0 shadow-sm">
                    <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div className="w-full flex-1 flex flex-col justify-end">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white leading-none">
                    {s.subscriptions.active}
                  </h3>
                  <div className="flex items-end justify-between w-full mt-2 gap-2">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground/75 font-medium truncate">
                      Trial: {s.subscriptions.trialing} • Past due: {s.subscriptions.pastDue}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* ═══ Row 1b: Secondary Stat Cards ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Modules */}
          <Link href="/modules" className="block group">
            <Card className={cn(
              "h-full cursor-pointer transition-all duration-300 ease-out",
              "bg-white dark:bg-slate-900",
              "border border-slate-200/60 dark:border-slate-800/80",
              "border-t-[3px] sm:border-t-4",
              "border-t-purple-600 dark:border-t-purple-500",
              "shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
              "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
              "hover:border-slate-300 dark:hover:border-slate-700",
            )}>
              <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                    Modules
                  </p>
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center shrink-0 shadow-sm">
                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="w-full flex-1 flex flex-col justify-end">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white leading-none">
                    {s.totalModules}
                  </h3>
                  <div className="flex items-end justify-between w-full mt-2 gap-2">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground/75 font-medium">
                      Active: {s.activeModules}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Subscription Plans */}
          <Link href="/subscriptions" className="block group">
            <Card className={cn(
              "h-full cursor-pointer transition-all duration-300 ease-out",
              "bg-white dark:bg-slate-900",
              "border border-slate-200/60 dark:border-slate-800/80",
              "border-t-[3px] sm:border-t-4",
              "border-t-violet-600 dark:border-t-violet-500",
              "shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
              "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
              "hover:border-slate-300 dark:hover:border-slate-700",
            )}>
              <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                    Plans
                  </p>
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0 shadow-sm">
                    <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <div className="w-full flex-1 flex flex-col justify-end">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white leading-none">
                    {s.totalPlans}
                  </h3>
                  <div className="flex items-end justify-between w-full mt-2 gap-2">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground/75 font-medium">
                      Active: {s.activePlans}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Successful Invoices */}
          <Link href="/payments" className="block group">
            <Card className={cn(
              "h-full cursor-pointer transition-all duration-300 ease-out",
              "bg-white dark:bg-slate-900",
              "border border-slate-200/60 dark:border-slate-800/80",
              "border-t-[3px] sm:border-t-4",
              "border-t-amber-600 dark:border-t-amber-500",
              "shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
              "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
              "hover:border-slate-300 dark:hover:border-slate-700",
            )}>
              <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                    Invoices
                  </p>
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="w-full flex-1 flex flex-col justify-end">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white leading-none">
                    {s.payments.success}
                  </h3>
                  <div className="flex items-end justify-between w-full mt-2 gap-2">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground/75 font-medium">
                      Pending: {s.payments.pending}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* System Health */}
          <Card className={cn(
            "h-full cursor-pointer transition-all duration-300 ease-out",
            "bg-white dark:bg-slate-900",
            "border border-slate-200/60 dark:border-slate-800/80",
            "border-t-[3px] sm:border-t-4",
            "border-t-rose-600 dark:border-t-rose-500",
            "shadow-[0_4px_12px_rgba(0,0,0,0.02)]",
            "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(15,23,42,0.06)]",
            "hover:border-slate-300 dark:hover:border-slate-700",
          )}>
            <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
              <div className="flex items-start justify-between w-full gap-2">
                <p className="text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold text-slate-400 dark:text-slate-500 leading-tight">
                  System Health
                </p>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0 shadow-sm">
                  <Activity className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div className="w-full flex-1 flex flex-col justify-end">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white leading-none">
                  100.0%
                </h3>
                <div className="flex items-end justify-between w-full mt-2 gap-2">
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground/75 font-medium">
                    All systems operational
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Row 2: Charts (Revenue Trend & Tenant Plan Distribution) ═════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Revenue Trend Area Chart */}
          <Card className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Revenue Trend</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Monthly income generated over the last 6 months
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-none font-bold">
                  Success Status
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[260px]">
                {d.charts?.revenueTrend && d.charts.revenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={d.charts.revenueTrend}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="month"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        stroke="#94a3b8"
                      />
                      <YAxis
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => fmt(v)}
                        width={45}
                        stroke="#94a3b8"
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                          fontSize: "11px",
                          fontWeight: "bold",
                        }}
                        formatter={(value: any) => [fmt(value), "Revenue"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={3}
                        fill="url(#gradRevenue)"
                        name="Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-2">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
                    <span>No billing data available</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tenant Plan Distribution Pie Chart */}
          <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-4">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Plan Distribution</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Active tenants grouped by subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[260px] flex items-center justify-center">
                {planPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                         data={planPieData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={85}
                         paddingAngle={4}
                         dataKey="value"
                      >
                        {planPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                          fontSize: "11px",
                          fontWeight: "bold",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "600" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-2">
                    <Activity className="h-8 w-8 text-muted-foreground/40" />
                    <span>No plan distribution data</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Row 3: Tables (Recent Tenants & Recent Payments) ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tenants */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-4 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Recent Tenants</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Latest constituencies onboarded
                </CardDescription>
              </div>
              <Link href="/tenants">
                <Button variant="outline" size="sm" className="text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 font-bold transition-colors">
                  Manage Tenants
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] text-muted-foreground uppercase bg-slate-50/30 dark:bg-slate-950/10">
                    <tr>
                      <th className="px-6 py-3.5 text-left font-extrabold text-slate-600 dark:text-slate-350 tracking-wider border-b border-border/40">Tenant / MLA</th>
                      <th className="px-6 py-3.5 text-left font-extrabold text-slate-600 dark:text-slate-350 tracking-wider border-b border-border/40">Constituency</th>
                      <th className="px-6 py-3.5 text-left font-extrabold text-slate-600 dark:text-slate-350 tracking-wider border-b border-border/40">Plan</th>
                      <th className="px-6 py-3.5 text-left font-extrabold text-slate-600 dark:text-slate-350 tracking-wider border-b border-border/40">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {d.recentTenants && d.recentTenants.map((t: any) => {
                      const st = TENANT_STATUS_STYLES[t.status] || { bg: "bg-slate-100", dot: "bg-slate-500" };
                      return (
                        <tr key={t.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{t.name}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold">{t.representativeName}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                            {t.constituencyName}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <Badge variant="outline" className="font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-900/30">
                              {t.subscription?.plan?.name || "No Plan"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide ${st.bg}`}>
                              <span className="relative flex h-1.5 w-1.5">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${st.dot} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${st.dot}`}></span>
                              </span>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {(!d.recentTenants || d.recentTenants.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="p-3 bg-muted/40 rounded-full">
                              <Users className="h-6 w-6 text-muted-foreground/60" />
                            </div>
                            <p className="font-bold text-sm">No Tenants Onboarded</p>
                            <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">No constituencies have been onboarded to the platform yet.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-4 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">Recent Payments</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Latest invoices and billing receipts
                </CardDescription>
              </div>
              <Link href="/payments">
                <Button variant="outline" size="sm" className="text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 font-bold transition-colors">
                  All Payments
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] text-muted-foreground uppercase bg-slate-50/30 dark:bg-slate-950/10">
                    <tr>
                      <th className="px-6 py-3.5 text-left font-extrabold text-slate-600 dark:text-slate-350 tracking-wider border-b border-border/40">Tenant</th>
                      <th className="px-6 py-3.5 text-left font-extrabold text-slate-600 dark:text-slate-350 tracking-wider border-b border-border/40">Amount</th>
                      <th className="px-6 py-3.5 text-left font-extrabold text-slate-600 dark:text-slate-350 tracking-wider border-b border-border/40">Date</th>
                      <th className="px-6 py-3.5 text-left font-extrabold text-slate-600 dark:text-slate-350 tracking-wider border-b border-border/40">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {d.recentPayments && d.recentPayments.map((p: any) => {
                      const st = PAYMENT_STATUS_STYLES[p.status] || { bg: "bg-slate-50", text: "text-slate-700" };
                      return (
                        <tr key={p.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                            {p.subscription?.tenant?.name || "System Billing"}
                          </td>
                          <td className="px-6 py-4 font-mono font-extrabold text-xs text-slate-700 dark:text-slate-300">
                            {fmt(p.amount)}
                          </td>
                          <td className="px-6 py-4 text-[10px] text-muted-foreground font-semibold">
                            {p.paidAt ? formatDistanceToNow(new Date(p.paidAt), { addSuffix: true }) : formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${st.bg} ${st.text}`}>
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {(!d.recentPayments || d.recentPayments.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="p-3 bg-muted/40 rounded-full">
                              <CreditCard className="h-6 w-6 text-muted-foreground/60" />
                            </div>
                            <p className="font-bold text-sm">No Payments Yet</p>
                            <p className="text-xs text-muted-foreground max-w-[250px] mx-auto">Latest invoices and billing receipts will show up here once processed.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}