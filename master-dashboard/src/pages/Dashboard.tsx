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
        {/* ═══ Header Section with Micro-interaction ═══ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-indigo-50/50 to-blue-50/20 dark:from-slate-900/40 dark:to-slate-900/10 p-4 rounded-xl border border-indigo-100/50 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
              System Overview & Revenue
            </h2>
            <p className="text-xs text-muted-foreground">
              Monitor tenant growth, module subscriptions, and billing metrics in real time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 font-mono text-xs py-1">
              Active Tenants: {s.tenants.active} / {s.tenants.total}
            </Badge>
          </div>
        </div>

        {/* ═══ Row 1: Key Premium Cards ══════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/tenants">
            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-l-4 border-l-indigo-500 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Tenants</span>
                  <Users className="h-5 w-5 text-indigo-500 group-hover:animate-pulse" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight">{s.tenants.total}</span>
                  <span className="text-xs text-emerald-600 font-medium flex items-center">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Active: {s.tenants.active}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Constituencies & MP/MLA Portals
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-emerald-500 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Recurring Revenue</span>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{fmt(s.monthlyRecurringRevenue)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Calculated based on active subscriptions
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-blue-500 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</span>
                <IndianRupee className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">{fmt(s.totalRevenue)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Total payments processed successfully
              </p>
            </CardContent>
          </Card>

          <Link href="/subscriptions">
            <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-l-4 border-l-amber-500 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Subscriptions</span>
                  <CreditCard className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight">{s.subscriptions.active}</span>
                  <span className="text-xs text-amber-600 font-medium flex items-center">
                    Trial: {s.subscriptions.trialing}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Past due: {s.subscriptions.pastDue} • Cancelled: {s.subscriptions.cancelled}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* ═══ Row 1b: Secondary Stat Cards ══════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/modules">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-slate-50/50 dark:bg-slate-900/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400 rounded-lg">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.totalModules}</p>
                  <p className="text-[10px] text-muted-foreground">Modules Available</p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Active: {s.activeModules}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/subscriptions">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-slate-50/50 dark:bg-slate-900/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 rounded-lg">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.totalPlans}</p>
                  <p className="text-[10px] text-muted-foreground">Subscription Plans</p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Active: {s.activePlans}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/payments">
            <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-slate-50/50 dark:bg-slate-900/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-lg">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.payments.success}</p>
                  <p className="text-[10px] text-muted-foreground">Successful Invoices</p>
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">Pending: {s.payments.pending}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-slate-50/50 dark:bg-slate-900/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 rounded-lg">
                <Activity className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold">100.0%</p>
                <p className="text-[10px] text-muted-foreground">API System Health</p>
                <p className="text-[9px] text-emerald-600 font-medium">All systems operational</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Row 2: Charts (Revenue Trend & Tenant Plan Distribution) ═════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Revenue Trend Area Chart */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Revenue Trend</CardTitle>
                  <CardDescription className="text-xs">
                    Monthly income generated over the last 6 months
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  Success Status
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-[260px]">
                {d.charts?.revenueTrend && d.charts.revenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={d.charts.revenueTrend}>
                      <defs>
                        <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        dataKey="month"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => fmt(v)}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          fontSize: "11px",
                        }}
                        formatter={(value: any) => [fmt(value), "Revenue"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        fill="url(#gradRevenue)"
                        name="Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No billing data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tenant Plan Distribution Pie Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Plan Distribution</CardTitle>
              <CardDescription className="text-xs">
                Active tenants grouped by subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2">
              <div className="h-[260px] flex items-center justify-center">
                {planPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {planPieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          fontSize: "11px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No plan distribution data
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Row 3: Tables (Recent Tenants & Recent Payments) ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tenants */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50/50 dark:bg-slate-900/30 border-b">
              <div>
                <CardTitle className="text-base font-bold">Recent Tenants</CardTitle>
                <CardDescription className="text-xs">
                  Latest constituencies onboarded
                </CardDescription>
              </div>
              <Link href="/tenants">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  Manage Tenants
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] text-muted-foreground uppercase bg-slate-50/30 dark:bg-slate-900/10">
                    <tr>
                      <th className="px-4 py-2 text-left">Tenant / MLA</th>
                      <th className="px-4 py-2 text-left">Constituency</th>
                      <th className="px-4 py-2 text-left">Plan</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {d.recentTenants && d.recentTenants.map((t: any) => {
                      const st = TENANT_STATUS_STYLES[t.status] || { bg: "bg-slate-100", dot: "bg-slate-500" };
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{t.name}</div>
                            <div className="text-[10px] text-muted-foreground">{t.representativeName}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                            {t.constituencyName}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <Badge variant="secondary" className="font-medium">
                              {t.subscription?.plan?.name || "No Plan"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {(!d.recentTenants || d.recentTenants.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No tenants onboarded yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50/50 dark:bg-slate-900/30 border-b">
              <div>
                <CardTitle className="text-base font-bold">Recent Payments</CardTitle>
                <CardDescription className="text-xs">
                  Latest invoices and billing receipts
                </CardDescription>
              </div>
              <Link href="/payments">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  All Payments
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] text-muted-foreground uppercase bg-slate-50/30 dark:bg-slate-900/10">
                    <tr>
                      <th className="px-4 py-2 text-left">Tenant</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {d.recentPayments && d.recentPayments.map((p: any) => {
                      const st = PAYMENT_STATUS_STYLES[p.status] || { bg: "bg-slate-50", text: "text-slate-700" };
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                            {p.subscription?.tenant?.name || "System Billing"}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-xs text-slate-700 dark:text-slate-350">
                            {fmt(p.amount)}
                          </td>
                          <td className="px-4 py-3 text-[10px] text-muted-foreground">
                            {p.paidAt ? formatDistanceToNow(new Date(p.paidAt), { addSuffix: true }) : formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {(!d.recentPayments || d.recentPayments.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No payments processed yet
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
