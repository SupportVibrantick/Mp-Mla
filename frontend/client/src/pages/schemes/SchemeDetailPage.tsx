import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useScheme,
  useDeleteScheme,
  useUpsertBeneficiary,
  useDeleteBeneficiary,
  getSchemeStatusInfo,
} from "@/hooks/useSchemes";
import { useWards } from "@/hooks/useWards";
import { formatCurrency } from "@/hooks/useFunds";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Users,
  Target,
  MapPin,
  Calendar,
  Globe,
  Plus,
  Loader2,
  IndianRupee,
} from "lucide-react";
import { format } from "date-fns";

export default function SchemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useScheme(id);
  const { data: wardsRes } = useWards({ limit: 100 });
  const deleteMut = useDeleteScheme();
  const upsertBMut = useUpsertBeneficiary();
  const delBMut = useDeleteBeneficiary();

  const [bDlg, setBDlg] = useState(false);
  const [bForm, setBForm] = useState({
    wardId: "",
    beneficiaryCount: 0,
    targetCount: 0,
    amountDisbursed: 0,
  });

  const s = res?.data;
  const wards = wardsRes?.data?.wards || [];
  if (isLoading)
    return (
      <MainLayout title="Scheme">
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  if (!s)
    return (
      <MainLayout title="Scheme">
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p>Not found</p>
        </div>
      </MainLayout>
    );

  const stInfo = getSchemeStatusInfo(s.status);

  const openAddWard = () => {
    setBForm({
      wardId: "",
      beneficiaryCount: 0,
      targetCount: 0,
      amountDisbursed: 0,
    });
    setBDlg(true);
  };
  const openEditWard = (b: any) => {
    setBForm({
      wardId: b.wardId,
      beneficiaryCount: b.beneficiaryCount,
      targetCount: b.targetCount,
      amountDisbursed: b.amountDisbursed,
    });
    setBDlg(true);
  };
  const saveWard = async () => {
    if (!id || !bForm.wardId) return;
    await upsertBMut.mutateAsync({ id, data: bForm });
    setBDlg(false);
  };

  // Wards not yet covered
  const coveredWardIds = (s.beneficiaries || []).map((b: any) => b.wardId);
  const uncoveredWards = wards.filter(
    (w: any) => !coveredWardIds.includes(w.id),
  );

  return (
    <MainLayout title="Scheme">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/schemes">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{s.name}</h1>
                <Badge className={`text-[10px] ${stInfo.color}`}>
                  {stInfo.label}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {s.level}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {s.departmentName}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <PermissionGate module="schemes" action="update">
              <Link to={`/schemes/${s.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="schemes" action="delete">
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
                    <AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive"
                      onClick={async () => {
                        await deleteMut.mutateAsync(s.id);
                        navigate("/schemes");
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

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Budget",
              value: formatCurrency(s.budget),
              icon: IndianRupee,
              color: "#6366f1",
            },
            {
              label: "Beneficiaries",
              value: s.totalBeneficiaries.toLocaleString(),
              icon: Users,
              color: "#3b82f6",
            },
            {
              label: "Target",
              value: s.totalTarget.toLocaleString(),
              icon: Target,
              color: "#f59e0b",
            },
            {
              label: "Coverage",
              value: `${s.coverage}%`,
              icon: Target,
              color: "#22c55e",
            },
          ].map((c, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <c.icon
                  className="h-5 w-5 mx-auto mb-1"
                  style={{ color: c.color }}
                />
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scheme Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {s.description && (
                <div>
                  <p className="text-muted-foreground text-xs">Description</p>
                  <p className="mt-0.5">{s.description}</p>
                </div>
              )}
              {s.eligibility && (
                <div>
                  <p className="text-muted-foreground text-xs">Eligibility</p>
                  <p className="mt-0.5">{s.eligibility}</p>
                </div>
              )}
              {s.benefits && (
                <div>
                  <p className="text-muted-foreground text-xs">Benefits</p>
                  <p className="mt-0.5">{s.benefits}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {s.startDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span>{format(new Date(s.startDate), "dd MMM yyyy")}</span>
                </div>
              )}
              {s.endDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date</span>
                  <span>{format(new Date(s.endDate), "dd MMM yyyy")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disbursed</span>
                <span className="font-mono font-bold">
                  {formatCurrency(s.totalDisbursed)}
                </span>
              </div>
              {s.applicationUrl && (
                <a
                  href={s.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Apply Online
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ward-wise Beneficiaries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Ward-wise Beneficiaries ({s.beneficiaries?.length || 0})
            </CardTitle>
            <PermissionGate module="schemes" action="update">
              <Button size="sm" className="gap-1" onClick={openAddWard}>
                <Plus className="h-3.5 w-3.5" />
                Add Ward
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ward</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-center">Coverage</TableHead>
                  <TableHead className="text-right">Disbursed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(s.beneficiaries || []).length > 0 ? (
                  s.beneficiaries.map((b: any) => {
                    const cov =
                      b.targetCount > 0
                        ? Math.round((b.beneficiaryCount / b.targetCount) * 100)
                        : 0;
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          #{b.ward?.wardNumber} {b.ward?.name}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {b.targetCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {b.beneficiaryCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress
                              value={cov}
                              className={`h-1.5 w-16 ${cov >= 100 ? "[&>div]:bg-green-500" : cov < 50 ? "[&>div]:bg-red-500" : ""}`}
                            />
                            <span
                              className={`text-xs font-mono ${cov >= 100 ? "text-green-600" : cov < 50 ? "text-red-600" : ""}`}
                            >
                              {cov}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(b.amountDisbursed)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditWard(b)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <PermissionGate module="schemes" action="delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() =>
                                  delBMut.mutate({ id: s.id, bId: b.id })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No ward data yet. Add ward beneficiaries above.
                    </TableCell>
                  </TableRow>
                )}
                {/* Totals row */}
                {(s.beneficiaries || []).length > 0 && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>
                      Total ({s.beneficiaries.length} wards)
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {s.totalTarget.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {s.totalBeneficiaries.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {s.coverage}%
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(s.totalDisbursed)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Beneficiary Dialog */}
      <Dialog open={bDlg} onOpenChange={setBDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ward Beneficiary Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Ward <span className="text-destructive">*</span>
              </Label>
              <Select
                value={bForm.wardId}
                onValueChange={(v) => setBForm((p) => ({ ...p, wardId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ward" />
                </SelectTrigger>
                <SelectContent>
                  {(bForm.wardId ? wards : uncoveredWards).map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      #{w.wardNumber} {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Count</Label>
                <Input
                  type="number"
                  value={bForm.targetCount}
                  onChange={(e) =>
                    setBForm((p) => ({
                      ...p,
                      targetCount: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Beneficiaries</Label>
                <Input
                  type="number"
                  value={bForm.beneficiaryCount}
                  onChange={(e) =>
                    setBForm((p) => ({
                      ...p,
                      beneficiaryCount: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount Disbursed (₹)</Label>
              <Input
                type="number"
                value={bForm.amountDisbursed}
                onChange={(e) =>
                  setBForm((p) => ({
                    ...p,
                    amountDisbursed: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBDlg(false)}>
              Cancel
            </Button>
            <Button
              disabled={upsertBMut.isPending || !bForm.wardId}
              onClick={saveWard}
            >
              {upsertBMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
