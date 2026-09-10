import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useBackups,
  useCreateBackup,
  useRestoreBackup,
  useDeleteBackup,
} from "@/hooks/useBackups";
import { useTenants } from "@/hooks/useTenants";
import { backupsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  FileJson,
  Layers,
  HardDrive,
  RefreshCw,
  Eye,
} from "lucide-react";

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function BackupsPage() {
  const { toast } = useToast();

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTenantId, setCreateTenantId] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  const [restoreModalData, setRestoreModalData] = useState<any | null>(null);
  const [confirmRestoreChecked, setConfirmRestoreChecked] = useState(false);

  const [deleteModalData, setDeleteModalData] = useState<any | null>(null);
  const [viewDetailsData, setViewDetailsData] = useState<any | null>(null);

  // Queries & Mutations
  const queryParams = useMemo(
    () => ({
      tenantId: selectedTenantId === "ALL" ? undefined : selectedTenantId,
      status: selectedStatus === "ALL" ? undefined : selectedStatus,
      search: search || undefined,
      page,
      limit,
    }),
    [selectedTenantId, selectedStatus, search, page]
  );

  const { data: backupsResponse, isLoading, refetch, isFetching } = useBackups(queryParams);
  const { data: tenantsResponse } = useTenants({ limit: 100 });

  const createMutation = useCreateBackup();
  const restoreMutation = useRestoreBackup();
  const deleteMutation = useDeleteBackup();

  const backupsData = backupsResponse?.data?.data;
  const backupsList = backupsData?.items || [];
  const pagination = backupsData?.pagination;
  const tenantsList = tenantsResponse?.data?.data?.tenants || [];

  // Summary Metrics
  const totalBackups = pagination?.total || 0;
  const completedBackups = backupsList.filter((b: any) => b.status === "COMPLETED").length;
  const inProgressBackups = backupsList.filter((b: any) => b.status === "IN_PROGRESS").length;

  const handleCreateSubmit = async () => {
    if (!createTenantId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a tenant to backup.",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        tenantId: createTenantId,
        notes: createNotes.trim() || undefined,
      });
      setIsCreateOpen(false);
      setCreateTenantId("");
      setCreateNotes("");
    } catch (e) {
      // Error handled by hook toast
    }
  };

  const handleRestoreSubmit = async () => {
    if (!restoreModalData || !confirmRestoreChecked) return;

    try {
      await restoreMutation.mutateAsync({
        id: restoreModalData.id,
        confirmRestore: true,
      });
      setRestoreModalData(null);
      setConfirmRestoreChecked(false);
    } catch (e) {
      // Error handled by hook toast
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteModalData) return;

    try {
      await deleteMutation.mutateAsync(deleteModalData.id);
      setDeleteModalData(null);
    } catch (e) {
      // Error handled by hook toast
    }
  };

  const handleDownload = async (backup: any) => {
    try {
      toast({
        title: "Preparing Download",
        description: `Downloading ${backup.fileName}...`,
      });

      const res = await backupsApi.download(backup.id);
      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", backup.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: err?.response?.data?.message || "Could not download backup file.",
      });
    }
  };

  return (
    <MainLayout title="Tenant Backups">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight font-heading">
                  Tenant Backups & Recovery
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create isolated tenant snapshots, download JSON packages, and perform atomic data recovery.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-xl border-border/60"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl bg-primary shadow-sm hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Backup
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border border-border/60 p-5 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Backups</span>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                <FileJson className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">{totalBackups}</div>
              <p className="text-xs text-muted-foreground mt-1">Tenant snapshot archives</p>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/60 p-5 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Completed</span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-emerald-600">{completedBackups}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for recovery</p>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/60 p-5 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">In Progress</span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-amber-600">{inProgressBackups}</div>
              <p className="text-xs text-muted-foreground mt-1">Processing archives</p>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/60 p-5 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Available Tenants</span>
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">{tenantsList.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Configured for backup</p>
            </div>
          </Card>
        </div>

        {/* Filters & Table Card */}
        <Card className="rounded-[28px] border border-border/60 p-6 shadow-sm bg-card/60 backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by file name, tenant or author..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 rounded-xl border-border/60"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={selectedTenantId}
                onValueChange={(val) => {
                  setSelectedTenantId(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[200px] rounded-xl border-border/60">
                  <SelectValue placeholder="All Tenants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Tenants</SelectItem>
                  {tenantsList.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  setSelectedStatus(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px] rounded-xl border-border/60">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="px-5 py-4">Tenant</th>
                  <th className="px-5 py-4">Backup Details</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Records & Tables</th>
                  <th className="px-5 py-4">Size</th>
                  <th className="px-5 py-4">Triggered By</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-5 py-4">
                        <Skeleton className="h-8 w-full rounded-lg" />
                      </td>
                    </tr>
                  ))
                ) : backupsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                      <Database className="mx-auto h-10 w-10 opacity-30 mb-2" />
                      <p className="text-base font-medium">No backups found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try adjusting filters or create a new backup.
                      </p>
                    </td>
                  </tr>
                ) : (
                  backupsList.map((backup: any) => {
                    const totalRecords = backup.recordCounts
                      ? Object.values(backup.recordCounts as Record<string, number>).reduce(
                          (a: number, b: number) => a + b,
                          0
                        )
                      : 0;
                    const totalTables = Array.isArray(backup.tablesIncluded)
                      ? backup.tablesIncluded.length
                      : 0;

                    return (
                      <tr key={backup.id} className="hover:bg-muted/20 transition-colors">
                        {/* Tenant */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold text-xs">
                              {backup.tenant?.name?.slice(0, 2).toUpperCase() || "TN"}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {backup.tenant?.name || "Unknown Tenant"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {backup.tenant?.constituencyName} ({backup.tenant?.state})
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Backup Details */}
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs text-foreground truncate max-w-[200px]" title={backup.fileName}>
                            {backup.fileName}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(backup.startedAt)}
                          </div>
                          {backup.notes && (
                            <div className="text-xs text-muted-foreground/80 italic mt-0.5 truncate max-w-[220px]">
                              {backup.notes}
                            </div>
                          )}
                          {backup.restoredAt && (
                            <div className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                              <RotateCcw className="h-3 w-3" /> Restored: {formatDate(backup.restoredAt)}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {backup.status === "COMPLETED" && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-emerald-500/20 font-medium">
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Completed
                            </Badge>
                          )}
                          {backup.status === "IN_PROGRESS" && (
                            <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 border-amber-500/20 font-medium animate-pulse">
                              <Clock className="mr-1 h-3.5 w-3.5 animate-spin" /> In Progress
                            </Badge>
                          )}
                          {backup.status === "FAILED" && (
                            <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 border-rose-500/20 font-medium">
                              <XCircle className="mr-1 h-3.5 w-3.5" /> Failed
                            </Badge>
                          )}
                          {backup.errorMessage && (
                            <div className="text-xs text-rose-500 mt-1 max-w-[180px] truncate" title={backup.errorMessage}>
                              {backup.errorMessage}
                            </div>
                          )}
                        </td>

                        {/* Records & Tables */}
                        <td className="px-5 py-4">
                          {backup.status === "COMPLETED" ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="rounded-lg text-xs font-normal border-border/60">
                                <Layers className="mr-1 h-3 w-3 text-muted-foreground" />
                                {totalTables} tables
                              </Badge>
                              <Badge variant="outline" className="rounded-lg text-xs font-normal border-border/60">
                                <HardDrive className="mr-1 h-3 w-3 text-muted-foreground" />
                                {totalRecords.toLocaleString()} rows
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => setViewDetailsData(backup)}
                                title="View Record Breakdown"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Size */}
                        <td className="px-5 py-4 font-mono text-xs">
                          {formatFileSize(backup.fileSize)}
                        </td>

                        {/* Triggered By */}
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          {backup.triggeredBy || "System"}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {backup.status === "COMPLETED" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-border/60 text-xs gap-1.5"
                                  onClick={() => handleDownload(backup)}
                                  title="Download JSON"
                                >
                                  <Download className="h-3.5 w-3.5 text-blue-600" />
                                  Download
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-lg border-amber-500/30 text-amber-600 hover:bg-amber-500/10 text-xs gap-1.5"
                                  onClick={() => {
                                    setRestoreModalData(backup);
                                    setConfirmRestoreChecked(false);
                                  }}
                                  title="Restore Tenant Data"
                                >
                                  <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
                                  Restore
                                </Button>
                              </>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                              onClick={() => setDeleteModalData(backup)}
                              title="Delete Backup"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <div className="text-xs text-muted-foreground">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border-border/60"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border-border/60"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── CREATE BACKUP MODAL ── */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="rounded-3xl sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                <Database className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold font-heading">
                Create Tenant Backup
              </DialogTitle>
              <DialogDescription>
                This will create a complete snapshot of the selected tenant's database records and uploaded files.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="tenant-select">Select Tenant *</Label>
                <Select value={createTenantId} onValueChange={setCreateTenantId}>
                  <SelectTrigger id="tenant-select" className="rounded-xl">
                    <SelectValue placeholder="Select a tenant..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {tenantsList.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.constituencyName} - {t.state})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Backup Notes / Reason (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Routine monthly snapshot, before bulk update..."
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  className="rounded-xl min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border-border/60"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={!createTenantId || createMutation.isPending}
                className="rounded-xl bg-primary"
              >
                {createMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating Snapshot...
                  </>
                ) : (
                  "Create Backup Now"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── RESTORE CONFIRMATION MODAL ── */}
        <Dialog
          open={!!restoreModalData}
          onOpenChange={(open) => {
            if (!open) {
              setRestoreModalData(null);
              setConfirmRestoreChecked(false);
            }
          }}
        >
          <DialogContent className="rounded-3xl sm:max-w-[550px] border-amber-500/30">
            <DialogHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-2">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold font-heading text-amber-600">
                Confirm Tenant Data Restoration
              </DialogTitle>
              <DialogDescription>
                You are about to restore data for{" "}
                <span className="font-semibold text-foreground">
                  {restoreModalData?.tenant?.name}
                </span>{" "}
                from backup archive{" "}
                <span className="font-mono text-xs font-semibold text-foreground">
                  {restoreModalData?.fileName}
                </span>
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <p className="font-bold mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  CRITICAL WARNING: This action is destructive and irreversible.
                </p>
                All existing data for <strong>{restoreModalData?.tenant?.name}</strong> will be
                completely erased and replaced with the snapshot captured on{" "}
                <strong>{formatDate(restoreModalData?.startedAt)}</strong>.
              </div>

              <div className="rounded-2xl border border-border/60 p-4 bg-muted/20 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant Name:</span>
                  <span className="font-semibold">{restoreModalData?.tenant?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Archive Size:</span>
                  <span className="font-mono">{formatFileSize(restoreModalData?.fileSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Backup Date:</span>
                  <span>{formatDate(restoreModalData?.startedAt)}</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="confirm-restore"
                  checked={confirmRestoreChecked}
                  onCheckedChange={(c) => setConfirmRestoreChecked(!!c)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="confirm-restore"
                  className="text-xs leading-normal cursor-pointer text-muted-foreground font-normal"
                >
                  I understand that this action will completely overwrite all live data for this tenant
                  and cannot be undone.
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setRestoreModalData(null);
                  setConfirmRestoreChecked(false);
                }}
                className="rounded-xl border-border/60"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRestoreSubmit}
                disabled={!confirmRestoreChecked || restoreMutation.isPending}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 font-semibold"
              >
                {restoreMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Restoring Data...
                  </>
                ) : (
                  "Confirm & Restore All Data"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── DELETE CONFIRMATION MODAL ── */}
        <Dialog open={!!deleteModalData} onOpenChange={(open) => !open && setDeleteModalData(null)}>
          <DialogContent className="rounded-3xl sm:max-w-[420px]">
            <DialogHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mb-2">
                <Trash2 className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold font-heading">
                Delete Backup Archive
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete this backup file? This will remove the file from storage.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteModalData(null)}
                className="rounded-xl border-border/60"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSubmit}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-rose-600 hover:bg-rose-700"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Archive"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── VIEW DETAILS MODAL ── */}
        <Dialog open={!!viewDetailsData} onOpenChange={(open) => !open && setViewDetailsData(null)}>
          <DialogContent className="rounded-3xl sm:max-w-[650px] max-h-[85vh] flex flex-col">
            <DialogHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                <Layers className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold font-heading">
                Backup Archive Breakdown
              </DialogTitle>
              <DialogDescription>
                Detailed count of database records included in this backup snapshot.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-3 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {viewDetailsData?.recordCounts &&
                  Object.entries(viewDetailsData.recordCounts as Record<string, number>).map(
                    ([table, count]) => (
                      <div
                        key={table}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-muted/20"
                      >
                        <span className="font-mono text-muted-foreground capitalize">
                          {table.replace(/([A-Z])/g, " $1")}
                        </span>
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs font-semibold"
                        >
                          {count.toLocaleString()}
                        </Badge>
                      </div>
                    )
                  )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setViewDetailsData(null)}
                className="rounded-xl border-border/60 w-full"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
