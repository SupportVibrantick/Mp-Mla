import { useState } from "react";
import { Link } from "wouter";
import * as xlsx from "xlsx";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  useFundOverview,
  useCreateFund,
  FUND_TYPES,
  TXN_TYPES,
  getFundTypeInfo,
  getTxnTypeInfo,
  formatCurrency,
} from "@/hooks/useFunds";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MainLayout } from "@/components/layout/MainLayout";
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
  LineChart,
  Line,
} from "recharts";
import {
  IndianRupee,
  Plus,
  Eye,
  Loader2,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  Download,

} from "lucide-react";
import { format } from "date-fns";

export default function FundsOverviewPage() {
  const [fy, setFy] = useState<string | undefined>(undefined);
  const { data: res, isLoading } = useFundOverview(fy);
  const createMut = useCreateFund();

  const [fundDlg, setFundDlg] = useState(false);
  const [form, setForm] = useState({
    fundType: "MPLAD" as string,
    financialYear: "",
    totalAllocated: 0,
  });

  const o = res?.data;

  const pieData =
    o?.byType
      ?.filter((t: any) => t.allocated > 0)
      .map((t: any) => ({
        name: getFundTypeInfo(t.fundType).label,
        value: t.allocated,
        color: getFundTypeInfo(t.fundType).color,
      })) || [];

  const barData =
    o?.byType
      ?.filter((t: any) => t.allocated > 0)
      .map((t: any) => ({
        name: getFundTypeInfo(t.fundType).label,
        allocated: t.allocated,
        released: t.released,
        utilized: t.utilized,
      })) || [];

  const saveFund = async () => {
    if (!form.financialYear || !form.fundType) return;
    await createMut.mutateAsync(form);
    setFundDlg(false);
    setForm({
      fundType: "MPLAD",
      financialYear: o?.financialYear || "",
      totalAllocated: 0,
    });
  };


  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/admin/funds/export");
      const data = response.data?.data;

      if (data && data.length > 0) {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Funds");
        xlsx.writeFile(wb, "funds_transactions_export.xlsx");
        toast.success("Fund records exported successfully.");
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export funds data.");
    } finally {
      setIsExporting(false);
    }
  };


  if (isLoading)
    return (
      <MainLayout title="Funds">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );

  return (
    <MainLayout title="Fund Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <IndianRupee className="h-7 w-7 text-primary" />
              Fund Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              MPLAD, MLALAD & other fund tracking
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {o?.financialYears?.length > 0 && (
              <Select value={fy || o.financialYear} onValueChange={setFy}>
                <SelectTrigger className="w-32 bg-muted/20 border-border/60 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {o.financialYears.map((y: string) => (
                    <SelectItem key={y} value={y}>
                      FY {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <PermissionGate module="funds" action="read">
              <Button
                variant="outline"
                className="gap-2 text-xs border-border/60 bg-card"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-3.5 w-3.5" />
                Export All
              </Button>
            </PermissionGate>
            <PermissionGate module="funds" action="create">
              <Button
                className="gap-2 text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90"
                onClick={() => {
                  setForm({
                    fundType: "MPLAD",
                    financialYear: o?.financialYear || "",
                    totalAllocated: 0,
                  });
                  setFundDlg(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Fund
              </Button>
            </PermissionGate>
          </div>
        </div>

        {!o || o.fundCount === 0 ? (
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="py-16 text-center">
              <IndianRupee className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-xs font-semibold">
                No funds for this financial year. Create one to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Allocated",
                  value: o.totalAllocated,
                  color: "#3b82f6",
                  Icon: IndianRupee,
                },
                {
                  label: "Released",
                  value: o.totalReleased,
                  color: "#f59e0b",
                  Icon: ArrowDownRight,
                  sub: `${o.releasePct}% of allocated`,
                },
                {
                  label: "Utilized",
                  value: o.totalUtilized,
                  color: "#22c55e",
                  Icon: ArrowUpRight,
                  sub: `${o.utilizationPct}% of allocated`,
                },
                {
                  label: "Available to Spend",
                  value: o.unusedAmount,
                  color: o.unusedAmount > 0 ? "#8b5cf6" : "#ef4444",
                  Icon: AlertCircle,
                  sub: `Released but unspent`,
                },
              ].map((s, i) => (
                <Card key={i} className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border border-border/50 bg-card hover:border-primary/25 rounded-2xl">
                  <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                    <div className="flex justify-between items-center">
                      <div
                        className="p-2 rounded-xl border flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${s.color}15`, borderColor: `${s.color}25` }}
                      >
                        <s.Icon className="h-4 w-4" style={{ color: s.color }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                        {s.label}
                      </p>
                      <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-0.5 font-mono">
                        {formatCurrency(s.value)}
                      </h3>
                      {s.sub && (
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium truncate">
                          {s.sub}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Flow Bars */}
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Fund Flow: Allocated → Released → Utilized
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pt-4 space-y-4">
                {[
                  {
                    label: "Allocated",
                    value: o.totalAllocated,
                    max: o.totalAllocated,
                    color: "#3b82f6",
                  },
                  {
                    label: "Released",
                    value: o.totalReleased,
                    max: o.totalAllocated,
                    color: "#f59e0b",
                  },
                  {
                    label: "Utilized",
                    value: o.totalUtilized,
                    max: o.totalAllocated,
                    color: "#22c55e",
                  },
                ].map((b) => (
                  <div key={b.label} className="space-y-1">
                    <div className="flex justify-between text-xs sm:text-sm font-semibold">
                      <span className="text-foreground">{b.label}</span>
                      <span className="font-mono text-muted-foreground">
                        {formatCurrency(b.value)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${b.max > 0 ? (b.value / b.max) * 100 : 0}%`,
                          backgroundColor: b.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              {pieData.length > 0 && (
                <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                  <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">By Fund Type</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pt-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {pieData.map((e: any, i: number) => (
                              <Cell key={i} fill={e.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => formatCurrency(v)}
                            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                          />
                          <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={10} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
              {barData.length > 0 && (
                <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                  <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Allocated vs Released vs Utilized
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pt-4">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" fontSize={10} tickLine={false} />
                          <YAxis
                            fontSize={10}
                            tickLine={false}
                            width={45}
                            tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
                          />
                          <Tooltip
                            formatter={(v: number) => formatCurrency(v)}
                            contentStyle={{ borderRadius: "12px", border: "none" }}
                          />
                          <Bar
                            dataKey="allocated"
                            fill="#3b82f6"
                            name="Allocated"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="released"
                            fill="#f59e0b"
                            name="Released"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="utilized"
                            fill="#22c55e"
                            name="Utilized"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Monthly Trend */}
            {o.monthlyTrend?.length > 0 && (
              <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Monthly Utilization Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pt-4">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={o.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="month" fontSize={10} tickLine={false} />
                        <YAxis
                          fontSize={10}
                          tickLine={false}
                          width={45}
                          tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`}
                        />
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{ borderRadius: "12px", border: "none" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fund-wise Table */}
            <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
              <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Fund-wise Breakdown (FY {o.financialYear})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Fund</TableHead>
                      <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Allocated</TableHead>
                      <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Released</TableHead>
                      <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Utilized</TableHead>
                      <TableHead className="h-12 px-4 text-center text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Release %</TableHead>
                      <TableHead className="h-12 px-4 text-center text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Util %</TableHead>
                      <TableHead className="h-12 px-4 text-center text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Txns</TableHead>
                      <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {o.byType.map((f: any) => {
                      const info = getFundTypeInfo(f.fundType);
                      return (
                        <TableRow key={f.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                          <TableCell className="py-4 px-4 align-middle">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: info.color }}
                              />
                              <div>
                                <p className="font-bold text-xs sm:text-sm text-foreground">{info.label}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold">
                                  {info.desc}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                            {formatCurrency(f.allocated)}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                            {formatCurrency(f.released)}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                            {formatCurrency(f.utilized)}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <div className="flex items-center justify-center gap-1.5">
                              <Progress
                                value={f.releasePct}
                                className="h-1.5 w-12"
                              />
                              <span className="text-xs font-mono font-bold text-muted-foreground">
                                {f.releasePct}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <div className="flex items-center justify-center gap-1.5">
                              <Progress
                                value={f.utilizationPct}
                                className="h-1.5 w-12"
                              />
                              <span className="text-xs font-mono font-bold text-muted-foreground">
                                {f.utilizationPct}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-center">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-bold"
                            >
                              {f.transactionCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-4 px-4 align-middle">
                            <Link to={`/funds/${f.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs h-8 rounded-lg font-bold border-border/60"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            {o.recentTransactions?.length > 0 && (
              <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Date</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Fund</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Type</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Amount</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Description</TableHead>
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Project</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {o.recentTransactions.map((t: any) => {
                        const txnInfo = getTxnTypeInfo(t.type);
                        return (
                          <TableRow key={t.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                            <TableCell className="text-xs py-4 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                              {format(new Date(t.date), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell className="py-4 px-4 align-middle">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold"
                                style={{
                                  borderColor: getFundTypeInfo(t.fund?.fundType).color,
                                }}
                              >
                                {t.fund?.fundType}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 px-4 align-middle">
                              <Badge className={`text-[10px] font-bold border-none ${txnInfo.bg}`}>
                                {txnInfo.icon} {txnInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {formatCurrency(t.amount)}
                            </TableCell>
                            <TableCell className="text-xs py-4 px-4 text-muted-foreground max-w-[200px] truncate">
                              {t.description}
                            </TableCell>
                            <TableCell className="py-4 px-4 align-middle">
                              {t.project ? (
                                <Link to={`/projects/${t.project.id}`}>
                                  <span className="text-xs text-primary font-bold hover:underline cursor-pointer">
                                    {t.project.projectCode}
                                  </span>
                                </Link>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Create Fund Dialog */}
      <Dialog open={fundDlg} onOpenChange={setFundDlg}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Fund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Fund Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.fundType}
                onValueChange={(v) => setForm((p) => ({ ...p, fundType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUND_TYPES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: f.color }}
                        />
                        {f.label}
                        <span className="text-[10px] text-muted-foreground ml-1">
                          — {f.desc}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Financial Year <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.financialYear}
                onChange={(e) =>
                  setForm((p) => ({ ...p, financialYear: e.target.value }))
                }
                placeholder="2024-25"
              />
            </div>
            <div className="space-y-2">
              <Label>Initial Allocation (₹)</Label>
              <Input
                type="number"
                value={form.totalAllocated || ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    totalAllocated: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="50000000"
              />
              <p className="text-[10px] text-muted-foreground">
                {form.totalAllocated > 0 && formatCurrency(form.totalAllocated)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundDlg(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMut.isPending || !form.financialYear}
              onClick={saveFund}
            >
              {createMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Create Fund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
