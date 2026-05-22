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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IndianRupee className="h-7 w-7 text-primary" />
              Fund Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track MPLAD, MLALAD & other fund allocations
            </p>
          </div>
          <div className="flex gap-2">
            {o?.financialYears && (
              <Select value={fy || o.financialYear} onValueChange={setFy}>
                <SelectTrigger className="w-32">
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
                  setFundForm({
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

        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          o && (
            <>
              {/* Summary */}
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
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <s.icon
                          className="h-4 w-4"
                          style={{ color: s.color }}
                        />
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

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-4">
                {piData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Allocation by Fund Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={piData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
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
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {o.byType?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Utilization by Fund Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={o.byType}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.1}
                            />
                            <XAxis dataKey="fundType" fontSize={10} />
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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Fund-wise Breakdown ({o.financialYear})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fund Type</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                        <TableHead className="text-right">Released</TableHead>
                        <TableHead className="text-right">Utilized</TableHead>
                        <TableHead className="text-center">
                          Utilization
                        </TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {o.byType?.map((f: any) => {
                        const info = getFundTypeInfo(f.fundType);
                        const matchingFund = (
                          res?.data as any
                        )?.recentTransactions?.find(
                          (t: any) => t.fund?.fundType === f.fundType,
                        );
                        return (
                          <TableRow key={f.fundType}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
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
                            <TableCell className="text-right font-mono">
                              {formatCurrency(f.allocated)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(f.released)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(f.utilized)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Progress
                                  value={f.utilizationPct}
                                  className="h-1.5 w-16"
                                />
                                <span className="text-xs font-mono">
                                  {f.utilizationPct}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs gap-1"
                                onClick={() => {
                                  // Find the fund ID for this type and year
                                  const allFunds = res?.data?.byType;
                                  // We need the fund ID — fetch from the funds list
                                  // For simplicity, navigate to fund detail
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {o.recentTransactions?.map((t: any) => {
                        const txnInfo = TXN_TYPES.find(
                          (x) => x.value === t.type,
                        );
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-sm">
                              {format(new Date(t.date), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {t.fund?.fundType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className="text-[10px]"
                                style={{
                                  backgroundColor: `${txnInfo?.color}20`,
                                  color: txnInfo?.color,
                                }}
                              >
                                {txnInfo?.icon} {txnInfo?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {formatCurrency(t.amount)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {t.description || "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!o.recentTransactions ||
                        o.recentTransactions.length === 0) && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center py-8 text-muted-foreground"
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
