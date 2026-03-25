import { useState } from "react";
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Landmark className="h-7 w-7 text-primary" /> Departments
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage government departments for grievances & projects
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end w-full sm:w-auto">
            <PermissionGate module="departments" action="read">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto justify-center"
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
                className="gap-2 w-full sm:w-auto justify-center"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                Bulk Upload
              </Button>
            </PermissionGate>

            <PermissionGate module="departments" action="create">
              <Button
                className="gap-2 w-full sm:w-auto justify-center"
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
              <p>
                Upload an Excel or CSV file to import multiple departments.
                Records are upserted by Department Code.
              </p>
            </div>
          }
          onDownloadSample={downloadSampleTemplate}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              label: "Total",
              value: stats?.total || 0,
              icon: Landmark,
              color: "#6366f1",
            },
            {
              label: "Active",
              value: stats?.active || 0,
              icon: Landmark,
              color: "#22c55e",
            },
            {
              label: "Inactive",
              value: stats?.inactive || 0,
              icon: Landmark,
              color: "#ef4444",
            },
            {
              label: "Total Grievances",
              value: stats?.totalGrievances || 0,
              icon: MessageSquare,
              color: "#f59e0b",
            },
            {
              label: "Total Projects",
              value: stats?.totalProjects || 0,
              icon: FolderKanban,
              color: "#3b82f6",
            },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${s.color}20` }}
                >
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
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
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead className="text-center">Grievances</TableHead>
                  <TableHead className="text-center">Projects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : departments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Landmark className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>No departments found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((d: any) => (
                    <TableRow
                      key={d.id}
                      className={!d.isActive ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <Link to={`/departments/${d.id}`}>
                          <p className="font-medium text-primary hover:underline cursor-pointer">
                            {d.name}
                          </p>
                        </Link>
                        {d.description && (
                          <p className="text-[10px] text-muted-foreground max-w-[200px] truncate">
                            {d.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {d.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.headName ? (
                          <div>
                            <p className="text-sm">{d.headName}</p>
                            {d.headPhone && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {d.headPhone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Not assigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {d.activeGrievances > 0 ? (
                          <Badge variant="secondary" className="font-mono">
                            {d.activeGrievances}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {d.activeProjects > 0 ? (
                          <Badge variant="secondary" className="font-mono">
                            {d.activeProjects}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${d.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600"}`}
                        >
                          {d.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <PermissionGate module="departments" action="update">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={toggleMut.isPending}
                              onClick={() => toggleMut.mutate(d.id)}
                            >
                              {d.isActive ? (
                                <ToggleRight className="h-3.5 w-3.5" />
                              ) : (
                                <ToggleLeft className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(d)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate module="departments" action="delete">
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
                                    Delete "{d.name}"?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Only possible if no grievances or projects
                                    reference it.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive"
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
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Department" : "Add Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Public Works"
                />
              </div>
              <div className="space-y-2">
                <Label>
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
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="About this department..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Head Name</Label>
                <Input
                  value={form.headName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, headName: e.target.value }))
                  }
                  placeholder="Officer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Head Phone</Label>
                <Input
                  value={form.headPhone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, headPhone: e.target.value }))
                  }
                  placeholder="9876543210"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Head Email</Label>
              <Input
                value={form.headEmail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, headEmail: e.target.value }))
                }
                placeholder="head@dept.gov.in"
              />
            </div>
            {editing && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, isActive: v }))
                  }
                />
                <Label>Active</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(false)}>
              Cancel
            </Button>
            <Button
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
