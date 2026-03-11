import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useProjects,
  useProjectStats,
  getStatusInfo,
  getCategoryInfo,
  formatBudget,
  PROJECT_STATUSES,
  PROJECT_CATEGORIES,
  FUND_TYPES,
  useChangeProjectStatus,
  useBulkCreateProjects,
} from "@/hooks/useProjects";
import { useWards } from "@/hooks/useWards";
import { useDepartments } from "@/hooks/useDepartments";
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
import { MainLayout } from "@/components/layout/MainLayout";
import {
  FolderKanban,
  Plus,
  Search,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  Filter,
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  PauseCircle,
  FileUp,
  Download,
} from "lucide-react";

export default function ProjectListPage() {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { mutateAsync: bulkCreateProjects } = useBulkCreateProjects();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/admin/projects/export");
      const data = response.data?.data;
      if (data && data.length > 0) {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Projects");
        xlsx.writeFile(wb, "projects_export.xlsx");
        toast.success("Projects exported successfully.");
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export projects.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSampleTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Projects");

    // Define Columns
    const columns = [
      { header: "projectCode", key: "projectCode" },
      { header: "name", key: "name" },
      { header: "category", key: "category" },
      { header: "department", key: "department" },
      { header: "contractor", key: "contractor" },
      { header: "contractorPhone", key: "contractorPhone" },
      { header: "wardNumber", key: "wardNumber" },
      { header: "startDate", key: "startDate" },
      { header: "expectedEndDate", key: "expectedEndDate" },
      { header: "actualEndDate", key: "actualEndDate" },
      { header: "budgetSanctioned", key: "budgetSanctioned" },
      { header: "budgetReleased", key: "budgetReleased" },
      { header: "budgetUsed", key: "budgetUsed" },
      { header: "fundType", key: "fundType" },
      { header: "status", key: "status" },
      { header: "completionPercent", key: "completionPercent" },
      { header: "description", key: "description" },
      { header: "address", key: "address" },
    ];

    worksheet.columns = columns;

    // Add Example Rows
    worksheet.addRow({
      projectCode: "PROJ-001",
      name: "School Build",
      category: "EDUCATION",
      department: "EDU",
      contractor: "ABC Infra",
      contractorPhone: "9876543210",
      wardNumber: 101,
      startDate: "2024-01-01",
      expectedEndDate: "2024-12-31",
      budgetSanctioned: 5000000,
      budgetReleased: 2000000,
      budgetUsed: 500000,
      fundType: "STATE_FUND",
      status: "RUNNING",
      completionPercent: 10,
    });

    // Add Data Validation (Dropdowns) for 100 rows
    const categories = PROJECT_CATEGORIES.map((c) => c.value);
    const statuses = PROJECT_STATUSES.map((s) => s.value);
    const fundTypes = FUND_TYPES.map((f) => f.value);

    for (let i = 2; i <= 101; i++) {
      // Category Dropdown (Column C)
      worksheet.getCell(`C${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${categories.join(",")}"`],
        showErrorMessage: true,
      };

      // FundType Dropdown (Column N)
      worksheet.getCell(`N${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${fundTypes.join(",")}"`],
        showErrorMessage: true,
      };

      // Status Dropdown (Column O)
      worksheet.getCell(`O${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${statuses.join(",")}"`],
        showErrorMessage: true,
      };
    }

    // Styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects_bulk_template.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (wardFilter !== "all") p.wardId = wardFilter;
    if (statusFilter !== "all") p.status = statusFilter;
    if (categoryFilter !== "all") p.category = categoryFilter;
    if (deptFilter !== "all") p.department = deptFilter;
    return p;
  }, [search, wardFilter, statusFilter, categoryFilter, deptFilter, page]);

  const { data: pRes, isLoading } = useProjects(params);
  const { data: statsRes } = useProjectStats(
    wardFilter !== "all" ? wardFilter : undefined,
  );
  const { data: wardsRes } = useWards({ limit: 100 });
  const { data: deptsRes } = useDepartments();

  const projects = pRes?.data || [];
  const pagination = pRes?.pagination;
  const stats = statsRes?.data;
  const wards = wardsRes?.data?.wards || [];
  const departments = deptsRes?.data || [];

  const reset = () => {
    setSearch("");
    setWardFilter("all");
    setStatusFilter("all");
    setDeptFilter("all");
    setCategoryFilter("all");
    setPage(1);
  };
  return (
    <MainLayout title="Projects">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderKanban className="h-7 w-7 text-primary" />
              Projects
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Development works & budget tracking
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end">
            <PermissionGate module="projects" action="read">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                Export All
              </Button>
            </PermissionGate>

            <PermissionGate module="projects" action="create">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                Bulk Upload
              </Button>
            </PermissionGate>

            <PermissionGate module="projects" action="create">
              <Link to="/projects/new" className="w-full sm:w-auto">
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        <BulkUploadModal
          open={isBulkImportOpen}
          onOpenChange={setIsBulkImportOpen}
          onUpload={bulkCreateProjects}
          title="Import Projects"
          description={
            <div>
              <p>
                Upload an Excel or CSV file to import multiple projects. Records
                are upserted by Project Code or Name.
              </p>
              <div className="mt-2 text-[10px] space-y-1 bg-muted p-2 rounded border">
                <p>
                  <strong>Valid Status:</strong> PENDING, RUNNING, COMPLETED,
                  ON_HOLD, CANCELLED
                </p>
                <p>
                  <strong>Valid Fund Types:</strong> MPLAD, MLALAD, STATE_FUND,
                  CENTRAL_FUND, CSR, OTHER
                </p>
                <p>
                  <strong>Valid Categories:</strong> ROAD, WATER, DRAINAGE,
                  ELECTRICITY, BUILDING, PARK, EDUCATION, HEALTH, SPORTS,
                  SANITATION, HOUSING, IT, OTHER
                </p>
              </div>
            </div>
          }
          onDownloadSample={downloadSampleTemplate}
        />

        {/* Stats */}
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                {
                  label: "Total",
                  value: stats.total,
                  Icon: FolderKanban,
                  color: "#6366f1",
                },
                {
                  label: "Running",
                  value: stats.running,
                  Icon: TrendingUp,
                  color: "#f59e0b",
                },
                {
                  label: "Pending",
                  value: stats.pending,
                  Icon: Clock,
                  color: "#3b82f6",
                },
                {
                  label: "Completed",
                  value: stats.completed,
                  Icon: CheckCircle2,
                  color: "#22c55e",
                },
                {
                  label: "On Hold",
                  value: stats.onHold,
                  Icon: PauseCircle,
                  color: "#ef4444",
                },
              ].map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${s.color}20` }}
                    >
                      <s.Icon className="h-4 w-4" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-none">
                        {s.value}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  label: "Sanctioned",
                  value: stats.totalSanctioned,
                  color: "#3b82f6",
                },
                {
                  label: "Released",
                  value: stats.totalReleased,
                  color: "#f59e0b",
                },
                { label: "Utilized", value: stats.totalUsed, color: "#22c55e" },
              ].map((b, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{b.label}</p>
                    <p
                      className="text-2xl font-bold mt-1"
                      style={{ color: b.color }}
                    >
                      {formatBudget(b.value)}
                    </p>
                    <Progress
                      value={
                        stats.totalSanctioned > 0
                          ? (b.value / stats.totalSanctioned) * 100
                          : 0
                      }
                      className="h-1.5 mt-2"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => {
                    setCategoryFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PROJECT_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={deptFilter}
                  onValueChange={(v) => {
                    setDeptFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Dept" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Depts</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={wardFilter}
                  onValueChange={(v) => {
                    setWardFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-36">
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    <SelectValue placeholder="Ward" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Wards</SelectItem>
                    {wards.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        #{w.wardNumber} {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(search ||
                  wardFilter !== "all" ||
                  statusFilter !== "all" ||
                  deptFilter !== "all" ||
                  categoryFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : projects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <FolderKanban className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No projects found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((p: any) => {
                      const sI = getStatusInfo(p.status);
                      const cI = getCategoryInfo(p.category);
                      return (
                        <TableRow key={p.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Link to={`/projects/${p.id}`}>
                              <span className="font-medium text-primary hover:underline cursor-pointer">
                                {p.name}
                              </span>
                            </Link>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {p.projectCode}
                            </p>
                            {p.contractor && (
                              <p className="text-[10px] text-muted-foreground">
                                🏗️ {p.contractor}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-[10px] gap-1"
                            >
                              <span>{cI.icon}</span>
                              {cI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            #{p.ward?.wardNumber} {p.ward?.name}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.departmentInfo?.name || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="font-mono text-sm font-medium">
                              {formatBudget(p.budgetSanctioned)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Used: {formatBudget(p.budgetUsed)}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <Progress
                                value={p.completionPercent}
                                className="h-1.5 w-16"
                              />
                              <span className="font-mono text-xs">
                                {p.completionPercent}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${sI.color}`}>
                              {sI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/projects/${p.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <PermissionGate module="projects" action="update">
                                <Link to={`/projects/${p.id}/edit`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </PermissionGate>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Page {pagination.page}/{pagination.totalPages}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
