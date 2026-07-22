import { useState } from "react";
import * as xlsx from "xlsx";
import api from "@/lib/api";
import { toast } from "sonner";

import {
  useFundOverview,
  useFund,
  useCreateFund,
  useAddTransaction,
  useDeleteTransaction,
  useDeleteFund,
  FUND_TYPES,
  TXN_TYPES,
  getFundTypeInfo,
  formatCurrency,
} from "@/hooks/useFunds";
import { useProjects } from "@/hooks/useProjects";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "recharts";
import {
  IndianRupee,
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Download,
} from "lucide-react";


import { format } from "date-fns";

export default function FundsPage() {
  const [fy, setFy] = useState<string | undefined>(undefined);
  const { data: res, isLoading } = useFundOverview(fy);
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const { data: fundRes } = useFund(selectedFundId || undefined);
  const { data: projectsRes } = useProjects({ limit: 100 });
  const createMut = useCreateFund();
  const addTxnMut = useAddTransaction();
  const delTxnMut = useDeleteTransaction();
  const delFundMut = useDeleteFund();

  const [fundDlg, setFundDlg] = useState(false);
  const [fundForm, setFundForm] = useState({
    fundType: "MPLAD" as string,
    financialYear: "",
    totalAllocated: 0,
  });
  const [txnDlg, setTxnDlg] = useState(false);
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

  const [txnForm, setTxnForm] = useState({
    amount: 0,
    type: "ALLOCATION" as string,
    description: "",
    projectId: "",
    date: "",
  });

  const o = res?.data;
  const fund = fundRes?.data;
  const projects = projectsRes?.data || [];

  const piData =
    o?.byType
      ?.map((t: any) => ({
        name: t.fundType,
        value: t.allocated,
        color: getFundTypeInfo(t.fundType).color,
      }))
      .filter((d: any) => d.value > 0) || [];

  const saveFund = async () => {
    if (!fundForm.financialYear) return;
    await createMut.mutateAsync(fundForm);
    setFundDlg(false);
  };

  const saveTxn = async () => {
    if (!selectedFundId || txnForm.amount <= 0) return;
    await addTxnMut.mutateAsync({
      id: selectedFundId,
      data: {
        ...txnForm,
        date: txnForm.date ? new Date(txnForm.date).toISOString() : undefined,
        projectId: txnForm.projectId || undefined,
      },
    });
    setTxnDlg(false);
  };

  return (
    <MainLayout title="Fund Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <IndianRupee className="h-7 w-7 text-primary" />
              Fund Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Track MPLAD, MLALAD & other fund allocations
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {o?.financialYears && (
              <Select value={fy || o.financialYear} onValueChange={setFy}>
                <SelectTrigger className="w-32 bg-muted/20 border-border/60 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {o.financialYears.map((y: string) => (
                    <SelectItem key={y} value={y}>
                      {y}
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
                  setFundForm({
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

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          o && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Allocated",
                    value: o.totalAllocated,
                    color: "#3b82f6",
                    icon: IndianRupee,
                  },
                  {
                    label: "Released",
                    value: o.totalReleased,
                    color: "#f59e0b",
                    icon: ArrowDownRight,
                    sub: `${o.releasePct}% of allocated`,
                  },
                  {
                    label: "Utilized",
                    value: o.totalUtilized,
                    color: "#22c55e",
                    icon: ArrowUpRight,
                    sub: `${o.utilizationPct}% of allocated`,
                  },
                  {
                    label: "Unreleased",
                    value: o.unreleasedAmount,
                    color: "#ef4444",
                    icon: TrendingUp,
                    sub: `${100 - o.releasePct}% pending`,
                  },
                ].map((s, i) => (
                  <Card key={i} className="transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border border-border/50 bg-card hover:border-primary/25 rounded-2xl">
                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                      <div className="flex justify-between items-center">
                        <div
                          className="p-2 rounded-xl border flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${s.color}15`, borderColor: `${s.color}25` }}
                        >
                          <s.icon className="h-4 w-4" style={{ color: s.color }} />
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

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-4">
                {piData.length > 0 && (
                  <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                    <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Allocation by Fund Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pt-4">
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={piData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                              nameKey="name"
                            >
                              {piData.map((e: any, i: number) => (
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
                {o.byType?.length > 0 && (
                  <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                    <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Utilization by Fund Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pt-4">
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={o.byType}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="fundType" fontSize={10} tickLine={false} />
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

              {/* Fund-wise breakdown */}
              <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Fund-wise Breakdown ({o.financialYear})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-border/50">
                        <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Fund Type</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Allocated</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Released</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Utilized</TableHead>
                        <TableHead className="h-12 px-4 text-center text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Utilization</TableHead>
                        <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {o.byType?.map((f: any) => {
                        const info = getFundTypeInfo(f.fundType);
                        return (
                          <TableRow key={f.fundType} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                            <TableCell className="py-4 px-4 align-middle">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
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
                              <div className="flex items-center justify-center gap-2">
                                <Progress
                                  value={f.utilizationPct}
                                  className="h-1.5 w-16"
                                />
                                <span className="text-xs font-mono font-bold text-muted-foreground">
                                  {f.utilizationPct}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-4 px-4 align-middle">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs gap-1 h-8 rounded-lg font-bold"
                                onClick={() => {
                                  // detail link or fallback
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recent Transactions */}
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {o.recentTransactions?.map((t: any) => {
                        const txnInfo = TXN_TYPES.find(
                          (x) => x.value === t.type,
                        );
                        return (
                          <TableRow key={t.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                            <TableCell className="text-xs py-4 px-4 font-semibold text-muted-foreground">
                              {format(new Date(t.date), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell className="py-4 px-4 align-middle">
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {t.fund?.fundType}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4 px-4 align-middle">
                              <Badge
                                className="text-[10px] font-bold border-none"
                                style={{
                                  backgroundColor: `${txnInfo?.color}15`,
                                  color: txnInfo?.color,
                                }}
                              >
                                {txnInfo?.icon} {txnInfo?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {formatCurrency(t.amount)}
                            </TableCell>
                            <TableCell className="text-xs py-4 px-4 text-muted-foreground max-w-[200px] truncate">
                              {t.description || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!o.recentTransactions ||
                        o.recentTransactions.length === 0) && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell
                              colSpan={5}
                              className="text-center py-16 text-muted-foreground text-xs font-semibold"
                            >
                              No transactions yet
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )
        )}
      </div>

      {/* Create Fund Dialog */}
      <Dialog open={fundDlg} onOpenChange={setFundDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Fund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fund Type</Label>
                <Select
                  value={fundForm.fundType}
                  onValueChange={(v) =>
                    setFundForm((p) => ({ ...p, fundType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUND_TYPES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Financial Year</Label>
                <Input
                  value={fundForm.financialYear}
                  onChange={(e) =>
                    setFundForm((p) => ({
                      ...p,
                      financialYear: e.target.value,
                    }))
                  }
                  placeholder="2024-25"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Initial Allocation (₹)</Label>
              <Input
                type="number"
                value={fundForm.totalAllocated}
                onChange={(e) =>
                  setFundForm((p) => ({
                    ...p,
                    totalAllocated: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFundDlg(false)}>
              Cancel
            </Button>
            <Button disabled={createMut.isPending} onClick={saveFund}>
              {createMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
