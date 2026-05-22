import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useFund,
  useUpdateFund,
  useDeleteFund,
  useAddTransaction,
  useDeleteTransaction,
  getFundTypeInfo,
  getTxnTypeInfo,
  formatCurrency,
  TXN_TYPES,
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
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
  Legend,
} from "recharts";
import {
  ArrowLeft,
  IndianRupee,
  Plus,
  Trash2,
  Edit,
  Loader2,
  FolderKanban,
} from "lucide-react";
import { format } from "date-fns";

export default function FundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useFund(id);
  const { data: projRes } = useProjects({ limit: 200 });
  const updateMut = useUpdateFund();
  const deleteMut = useDeleteFund();
  const addTxnMut = useAddTransaction();
  const delTxnMut = useDeleteTransaction();

  const [editDlg, setEditDlg] = useState(false);
  const [editForm, setEditForm] = useState({
    totalAllocated: 0,
    totalReleased: 0,
    totalUtilized: 0,
  });
  const [txnDlg, setTxnDlg] = useState(false);
  const [txnType, setTxnType] = useState("ALLOCATION");
  const [txnForm, setTxnForm] = useState({
    amount: 0,
    description: "",
    projectId: "",
    date: "",
  });

  const f = res?.data;
  const projects = projRes?.data || [];

  if (isLoading)
    return (
      <MainLayout title="Fund Detail">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  if (!f)
    return (
      <MainLayout title="Fund Detail">
        <div className="flex flex-col items-center justify-center h-64">
          <IndianRupee className="h-12 w-12 text-muted-foreground" />
          <p>Fund not found</p>
        </div>
      </MainLayout>
    );

  const info = getFundTypeInfo(f.fundType);

  const openEdit = () => {
    setEditForm({
      totalAllocated: f.totalAllocated,
      totalReleased: f.totalReleased,
      totalUtilized: f.totalUtilized,
    });
    setEditDlg(true);
  };
  const saveEdit = async () => {
    if (!id) return;
    await updateMut.mutateAsync({ id, data: editForm });
    setEditDlg(false);
  };

  const openTxn = (type: string) => {
    setTxnType(type);
    setTxnForm({
      amount: 0,
      description: "",
      projectId: "",
      date: new Date().toISOString().split("T")[0],
    });
    setTxnDlg(true);
  };
  const saveTxn = async () => {
    if (!id || txnForm.amount <= 0 || !txnForm.description) return;
    await addTxnMut.mutateAsync({
      fundId: id,
      data: {
        amount: txnForm.amount,
        type: txnType,
        description: txnForm.description,
        projectId: txnForm.projectId || null,
        date: txnForm.date ? new Date(txnForm.date).toISOString() : undefined,
      },
    });
    setTxnDlg(false);
  };

  const txnTypeInfo = getTxnTypeInfo(txnType);

  return (
    <MainLayout title="Fund Detail">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/funds">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: info.color }}
                />
                <h1 className="text-2xl font-bold">{info.label}</h1>
                <Badge variant="outline" className="text-xs">
                  FY {f.financialYear}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {info.desc} • {f.transactions?.length || 0} transactions
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="funds" action="update">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-blue-600"
                onClick={() => openTxn("ALLOCATION")}
              >
                📥 Add Allocation
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-amber-600"
                onClick={() => openTxn("RELEASE")}
              >
                💰 Add Release
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-green-600"
                onClick={() => openTxn("UTILIZATION")}
              >
                📤 Add Utilization
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={openEdit}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Totals
              </Button> */}
            </PermissionGate>
            <PermissionGate module="funds" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this fund?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All transactions will be deleted permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive"
                      onClick={async () => {
                        await deleteMut.mutateAsync(id!);
                        navigate("/funds");
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        </div>

        {/* Budget Flow */}
        <Card>
          <CardContent className="p-5">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  label: "Allocated",
                  value: f.totalAllocated,
                  color: "#3b82f6",
                  pct: 100,
                },
                {
                  label: "Released",
                  value: f.totalReleased,
                  color: "#f59e0b",
                  pct: f.releasePct,
                },
                {
                  label: "Utilized",
                  value: f.totalUtilized,
                  color: "#22c55e",
                  pct: f.utilizationPct,
                },
              ].map((b) => (
                <div key={b.label} className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    {b.label}
                  </p>
                  <p
                    className="text-3xl font-bold max-w-full break-all leading-tight"
                    style={{ color: b.color }}
                  >
                    {formatCurrency(b.value)}
                  </p>
                  <Progress value={b.pct} className="h-2 mt-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {b.pct}% of allocated
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Unreleased</p>
                <p className="font-mono font-bold text-red-600">
                  {formatCurrency(
                    Math.max(0, f.totalAllocated - f.totalReleased),
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">
                  Available to Spend
                </p>
                <p className="font-mono font-bold text-purple-600">
                  {formatCurrency(f.unusedAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Chart */}
        {f.monthlyBreakdown?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={f.monthlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis
                      fontSize={10}
                      tickFormatter={(v) => formatCurrency(v)}
                    />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar
                      dataKey="allocation"
                      fill="#3b82f6"
                      name="Allocation"
                      radius={[2, 2, 0, 0]}
                      stackId="a"
                    />
                    <Bar
                      dataKey="release"
                      fill="#f59e0b"
                      name="Release"
                      radius={[2, 2, 0, 0]}
                      stackId="b"
                    />
                    <Bar
                      dataKey="utilization"
                      fill="#22c55e"
                      name="Utilization"
                      radius={[2, 2, 0, 0]}
                      stackId="c"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Usage */}
        {f.projectUsage?.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                Project-wise Utilization
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Amount Used</TableHead>
                    <TableHead className="text-center">
                      % of Total Utilized
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {f.projectUsage.map((pu: any) => (
                    <TableRow key={pu.project?.id || "unknown"}>
                      <TableCell>
                        {pu.project ? (
                          <Link to={`/projects/${pu.project.id}`}>
                            <div className="cursor-pointer">
                              <p className="font-medium text-primary hover:underline">
                                {pu.project.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {pu.project.projectCode}
                              </p>
                            </div>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Unknown project
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(pu.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress
                            value={
                              f.totalUtilized > 0
                                ? (pu.total / f.totalUtilized) * 100
                                : 0
                            }
                            className="h-1.5 w-16 [&>div]:bg-green-500"
                          />
                          <span className="text-xs font-mono">
                            {f.totalUtilized > 0
                              ? Math.round((pu.total / f.totalUtilized) * 100)
                              : 0}
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
        )}

        {/* All Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              All Transactions ({f.transactions?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(f.transactions || []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No transactions. Use the buttons above to record
                      allocations, releases, or utilizations.
                    </TableCell>
                  </TableRow>
                ) : (
                  f.transactions.map((t: any) => {
                    const tInfo = getTxnTypeInfo(t.type);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(t.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${tInfo.bg}`}>
                            {tInfo.icon} {tInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(t.amount)}
                        </TableCell>
                        <TableCell className="text-sm max-w-[250px]">
                          {t.description}
                        </TableCell>
                        <TableCell>
                          {t.project ? (
                            <Link to={`/projects/${t.project.id}`}>
                              <Badge
                                variant="outline"
                                className="text-[10px] cursor-pointer hover:bg-muted"
                              >
                                {t.project.projectCode} — {t.project.name}
                              </Badge>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <PermissionGate module="funds" action="delete">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Reverse this transaction?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will subtract{" "}
                                    {formatCurrency(t.amount)} from the{" "}
                                    {t.type.toLowerCase()} total
                                    {t.project
                                      ? ` and update project ${t.project.projectCode}`
                                      : ""}
                                    .
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive"
                                    onClick={() =>
                                      delTxnMut.mutate({
                                        fundId: f.id,
                                        txnId: t.id,
                                      })
                                    }
                                  >
                                    Reverse
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </PermissionGate>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Totals Dialog */}
      <Dialog open={editDlg} onOpenChange={setEditDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Fund Totals</DialogTitle>
            <DialogDescription>
              Directly adjust totals (use transactions for tracked changes)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Allocated (₹)</Label>
              <Input
                type="number"
                value={editForm.totalAllocated}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    totalAllocated: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Released (₹)</Label>
              <Input
                type="number"
                value={editForm.totalReleased}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    totalReleased: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Utilized (₹)</Label>
              <Input
                type="number"
                value={editForm.totalUtilized}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    totalUtilized: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDlg(false)}>
              Cancel
            </Button>
            <Button disabled={updateMut.isPending} onClick={saveEdit}>
              {updateMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={txnDlg} onOpenChange={setTxnDlg}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge className={`${txnTypeInfo.bg}`}>
                {txnTypeInfo.icon} {txnTypeInfo.label}
              </Badge>
              Record {txnTypeInfo.label}
            </DialogTitle>
            <DialogDescription>{txnTypeInfo.desc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                value={txnForm.amount || ""}
                onChange={(e) =>
                  setTxnForm((p) => ({
                    ...p,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Enter amount"
              />
              {txnForm.amount > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {formatCurrency(txnForm.amount)}
                </p>
              )}
              {/* Show remaining capacity */}
              {txnType === "RELEASE" && (
                <p className="text-[10px] text-amber-600">
                  Max releasable:{" "}
                  {formatCurrency(
                    Math.max(0, f.totalAllocated - f.totalReleased),
                  )}
                </p>
              )}
              {txnType === "UTILIZATION" && (
                <p className="text-[10px] text-green-600">
                  Max spendable:{" "}
                  {formatCurrency(
                    Math.max(0, f.totalReleased - f.totalUtilized),
                  )}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={txnForm.description}
                onChange={(e) =>
                  setTxnForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder={
                  txnType === "ALLOCATION"
                    ? "e.g. Q3 budget allocation approved"
                    : txnType === "RELEASE"
                      ? "e.g. 2nd installment released by govt"
                      : "e.g. Payment for road construction Phase 1"
                }
                rows={2}
              />
            </div>
            {txnType === "UTILIZATION" && (
              <div className="space-y-2">
                <Label>
                  Link to Project{" "}
                  <span className="text-muted-foreground text-[10px]">
                    (optional)
                  </span>
                </Label>
                <Select
                  value={txnForm.projectId || "none"}
                  onValueChange={(v) =>
                    setTxnForm((p) => ({
                      ...p,
                      projectId: v === "none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">— No project —</SelectItem>

                    {projects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-mono text-[10px] mr-1">
                          {p.projectCode}
                        </span>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-[10px] text-muted-foreground">
                  Linking updates the project's budget utilized automatically
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Transaction Date</Label>
              <Input
                type="date"
                value={txnForm.date}
                onChange={(e) =>
                  setTxnForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxnDlg(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                addTxnMut.isPending ||
                txnForm.amount <= 0 ||
                !txnForm.description
              }
              onClick={saveTxn}
              style={{ backgroundColor: txnTypeInfo.color }}
            >
              {addTxnMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Record {txnTypeInfo.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
