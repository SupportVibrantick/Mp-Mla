import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useDepartments,
  useDepartmentStats,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useToggleDepartment,
  useBulkCreateDepartments,
} from "@/hooks/useDepartments";
import { toast } from "sonner";
import * as xlsx from "xlsx";
import ExcelJS from "exceljs";
import api from "@/lib/api";
import { BulkUploadModal } from "@/components/shared/BulkUploadModal";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Landmark,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  User,
  ToggleLeft,
  ToggleRight,
  Loader2,
  MessageSquare,
  FolderKanban,
  FileUp,
  Download,
} from "lucide-react";
import { Link } from "wouter";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  headName: "",
  headPhone: "",
  headEmail: "",
  isActive: true,
};

export default function DepartmentListPage() {
  const [search, setSearch] = useState("");
  const { data: res, isLoading } = useDepartments({
    search: search || undefined,
  });
  const { data: statsRes } = useDepartmentStats();
  const createMut = useCreateDepartment();
  const updateMut = useUpdateDepartment();
  const deleteMut = useDeleteDepartment();
  const toggleMut = useToggleDepartment();

  const [dlg, setDlg] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { mutateAsync: bulkCreateDepartments } = useBulkCreateDepartments();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/admin/departments/export");
      const data = response.data?.data;
      if (data && data.length > 0) {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Departments");
        xlsx.writeFile(wb, "departments_export.xlsx");
        toast.success("Departments exported successfully.");
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export departments.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSampleTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Departments");

    const columns = [
      { header: "name", key: "name", width: 30 },
      { header: "code", key: "code", width: 15 },
      { header: "description", key: "description", width: 40 },
      { header: "headName", key: "headName", width: 20 },
      { header: "headPhone", key: "headPhone", width: 15 },
      { header: "headEmail", key: "headEmail", width: 25 },
      { header: "isActive", key: "isActive", width: 15 },
    ];

    worksheet.columns = columns;

    worksheet.addRow({
      name: "Public Works Department",
      code: "PWD",
      description: "Main infrastructure maintenance",
      headName: "John Smith",
      headPhone: "9876543210",
      headEmail: "head@pwd.gov.in",
      isActive: "TRUE",
    });

    for (let i = 2; i <= 51; i++) {
      worksheet.getCell(`G${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"TRUE,FALSE"'],
      };
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "departments_template.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const departments = res?.data || [];
  const stats = statsRes?.data;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDlg(true);
  };
  const openEdit = (d: any) => {
    setEditing(d);
    setForm({
      name: d.name,
      code: d.code,
      description: d.description || "",
      headName: d.headName || "",
      headPhone: d.headPhone || "",
      headEmail: d.headEmail || "",
      isActive: d.isActive,
    });
    setDlg(true);
  };

  const save = async () => {
    if (!form.name || !form.code) return;
    const payload = { ...form, headEmail: form.headEmail || undefined };
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setDlg(false);
  };

  return (
    <MainLayout title="Departments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Landmark className="h-7 w-7 text-primary" /> Departments
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Manage government departments for grievances & projects
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end w-full sm:w-auto">
            <PermissionGate module="departments" action="read">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto h-9 text-xs font-semibold hover:bg-muted border-border/60 justify-center"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                Export All
              </Button>
            </PermissionGate>

            <PermissionGate module="departments" action="create">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto h-9 text-xs font-semibold hover:bg-muted border-border/60 justify-center"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                Bulk Upload
              </Button>
            </PermissionGate>

            <PermissionGate module="departments" action="create">
              <Button
                className="gap-2 w-full sm:w-auto justify-center bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none"
                onClick={openAdd}
              >
                <Plus className="h-4 w-4" />
                Add Department
              </Button>
            </PermissionGate>
          </div>
        </div>

        <BulkUploadModal
          open={isBulkImportOpen}
          onOpenChange={setIsBulkImportOpen}
          onUpload={bulkCreateDepartments}
          title="Import Departments"
          description={
            <div>
              <p className="text-xs text-muted-foreground">
                Upload an Excel or CSV file to import multiple departments.
                Records are upserted by Department Code.
              </p>
            </div>
          }
          onDownloadSample={downloadSampleTemplate}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Total Departments",
              value: stats?.total || 0,
              Icon: Landmark,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
              borderColor: "border-indigo-100 dark:border-indigo-950/50",
            },
            {
              label: "Active Departments",
              value: stats?.active || 0,
              Icon: Landmark,
              color: "text-emerald-500",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
              borderColor: "border-emerald-100 dark:border-emerald-950/50",
            },
            {
              label: "Inactive Departments",
              value: stats?.inactive || 0,
              Icon: Landmark,
              color: "text-rose-500",
              bgColor: "bg-rose-50 dark:bg-rose-950/30",
              borderColor: "border-rose-100 dark:border-rose-950/50",
            },
            {
              label: "Public Requests",
              value: stats?.totalGrievances || 0,
              Icon: MessageSquare,
              color: "text-amber-500",
              bgColor: "bg-amber-50 dark:bg-amber-950/30",
              borderColor: "border-amber-100 dark:border-amber-950/50",
            },
            {
              label: "Total Projects",
              value: stats?.totalProjects || 0,
              Icon: FolderKanban,
              color: "text-blue-500",
              bgColor: "bg-blue-50 dark:bg-blue-950/30",
              borderColor: "border-blue-100 dark:border-blue-950/50",
            },
          ].map((s, i) => (
            <Card key={i} className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                <div className="flex justify-between items-center">
                  <div className={cn("p-2 rounded-xl border", s.bgColor, s.borderColor)}>
                    <s.Icon className={cn("h-4 w-4", s.color)} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                    {s.label}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                    {s.value}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/30 border-border/60 focus-visible:ring-primary/20 rounded-xl"
          />
        </div>

        {/* Table */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Department</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Code</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Head</TableHead>
                    <TableHead className="h-12 px-4 text-center text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Public Requests</TableHead>
                    <TableHead className="h-12 px-4 text-center text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Projects</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j} className="py-4 px-4">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : departments.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={7}
                        className="text-center py-16 text-muted-foreground text-xs"
                      >
                        <Landmark className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                        <p className="font-medium text-sm">No departments found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    departments.map((d: any) => (
                      <TableRow
                        key={d.id}
                        className={cn(
                          "hover:bg-muted/10 transition-colors border-b border-border/40",
                          !d.isActive && "opacity-50"
                        )}
                      >
                        <TableCell className="py-4 px-4 align-middle">
                          <Link to={`/departments/${d.id}`}>
                            <div className="cursor-pointer space-y-1">
                              <p className="font-semibold text-primary hover:underline text-sm">
                                {d.name}
                              </p>
                              {d.description && (
                                <p className="text-[10px] text-muted-foreground max-w-[200px] truncate font-medium">
                                  {d.description}
                                </p>
                              )}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <Badge variant="outline" className="font-mono text-[10px] font-bold px-2 py-0.5 border-border/80">
                            {d.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-foreground">
                          {d.headName ? (
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-foreground">{d.headName}</p>
                              {d.headPhone && (
                                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5">
                                  <Phone className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                  {d.headPhone}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground font-normal italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle text-center">
                          {d.activeGrievances > 0 ? (
                            <Badge variant="secondary" className="font-mono text-[10px] font-bold px-2 py-0.5 border">
                              {d.activeGrievances}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">0</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle text-center">
                          {d.activeProjects > 0 ? (
                            <Badge variant="secondary" className="font-mono text-[10px] font-bold px-2 py-0.5 border">
                              {d.activeProjects}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">0</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <Badge
                            className={cn(
                              "text-[9px] sm:text-[10px] font-semibold border shadow-none",
                              d.isActive
                                ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground border-border/50"
                            )}
                          >
                            {d.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <PermissionGate module="departments" action="update">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                disabled={toggleMut.isPending}
                                onClick={() => toggleMut.mutate(d.id)}
                              >
                                {d.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                onClick={() => openEdit(d)}
                              >
                                <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate module="departments" action="delete">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-extrabold text-foreground">
                                      Delete "{d.name}"?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs text-muted-foreground font-medium">
                                      Only possible if no grievances or projects reference it.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2 sm:gap-0">
                                    <AlertDialogCancel className="border-border/60 hover:bg-muted">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                                      onClick={() => deleteMut.mutate(d.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editing ? "Edit Department Details" : "Add New Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Public Works"
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="PWD"
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="About this department..."
                className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Head Name</Label>
                <Input
                  value={form.headName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, headName: e.target.value }))
                  }
                  placeholder="Officer name"
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Head Phone</Label>
                <Input
                  value={form.headPhone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, headPhone: e.target.value }))
                  }
                  placeholder="9876543210"
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Head Email</Label>
              <Input
                value={form.headEmail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, headEmail: e.target.value }))
                }
                placeholder="head@dept.gov.in"
                className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
              />
            </div>
            {editing && (
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, isActive: v }))
                  }
                />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Status</Label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60 hover:bg-muted" onClick={() => setDlg(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-white"
              onClick={save}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
