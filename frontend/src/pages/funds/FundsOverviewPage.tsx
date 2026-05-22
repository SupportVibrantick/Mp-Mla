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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IndianRupee className="h-7 w-7 text-primary" />
              Fund Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              MPLAD, MLALAD & other fund tracking
            </p>
          </div>
          <div className="flex gap-2">
            {o?.financialYears?.length > 0 && (
              <Select value={fy || o.financialYear} onValueChange={setFy}>
                <SelectTrigger className="w-32">
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
                className="gap-2"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                Export All
              </Button>
            </PermissionGate>
            <PermissionGate module="funds" action="create">
              <Button
                className="gap-2"
                onClick={() => {
                  setForm({
                    fundType: "MPLAD",
                    financialYear: o?.financialYear || "",
                    totalAllocated: 0,
                  });
                  setFundDlg(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Fund
              </Button>
            </PermissionGate>
          </div>
        </div>

        {!o || o.fundCount === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <IndianRupee className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">
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
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <s.Icon className="h-4 w-4" style={{ color: s.color }} />
                      <span className="text-xs text-muted-foreground">
                        {s.label}
                      </span>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(s.value)}
                    </p>
                    {s.sub && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {s.sub}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Flow Bars */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">
                  Fund Flow: Allocated → Released → Utilized
                </p>
                <div className="space-y-2">
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
                    <div key={b.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{b.label}</span>
                        <span className="font-mono">
                          {formatCurrency(b.value)}
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
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
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              {pieData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">By Fund Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
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
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
              {barData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Allocated vs Released vs Utilized
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="name" fontSize={10} />
                          <YAxis
                            fontSize={10}
                            tickFormatter={(v) => formatCurrency(v)}
                          />
                          <Tooltip
                            formatter={(v: number) => formatCurrency(v)}
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Monthly Utilization Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={o.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="month" fontSize={10} />
                        <YAxis
                          fontSize={10}
                          tickFormatter={(v) => formatCurrency(v)}
                        />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Fund-wise Breakdown (FY {o.financialYear})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund</TableHead>
                      <TableHead className="text-right">Allocated</TableHead>
                      <TableHead className="text-right">Released</TableHead>
                      <TableHead className="text-right">Utilized</TableHead>
                      <TableHead className="text-center">Release %</TableHead>
                      <TableHead className="text-center">Util %</TableHead>
                      <TableHead className="text-center">Txns</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {o.byType.map((f: any) => {
                      const info = getFundTypeInfo(f.fundType);
                      return (
                        <TableRow key={f.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: info.color }}
                              />
                              <div>
                                <p className="font-medium">{info.label}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {info.desc}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(f.allocated)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(f.released)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(f.utilized)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Progress
                                value={f.releasePct}
                                className="h-1.5 w-12"
                              />
                              <span className="text-xs font-mono">
                                {f.releasePct}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Progress
                                value={f.utilizationPct}
                                className="h-1.5 w-12 [&>div]:bg-green-500"
                              />
                              <span className="text-xs font-mono">
                                {f.utilizationPct}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {f.transactionCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/funds/${f.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-xs"
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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Fund</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Project</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {o.recentTransactions.map((t: any) => {
                        const txnInfo = getTxnTypeInfo(t.type);
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {format(new Date(t.date), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-[10px]"
                                style={{
                                  borderColor: getFundTypeInfo(t.fund?.fundType)
                                    .color,
                                }}
                              >
                                {t.fund?.fundType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${txnInfo.bg}`}>
                                {txnInfo.icon} {txnInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-sm">
                              {formatCurrency(t.amount)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {t.description}
                            </TableCell>
                            <TableCell>
                              {t.project ? (
                                <Link to={`/projects/${t.project.id}`}>
                                  <span className="text-xs text-primary hover:underline cursor-pointer">
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
