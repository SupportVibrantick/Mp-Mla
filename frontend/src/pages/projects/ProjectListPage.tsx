import { useState, useMemo } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
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
  AlertCircle,
  MapPin,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  AlertTriangle,
  X,
  UserCheck,
} from "lucide-react";
import {
  BarChart as ReBarChart,
  Bar as ReBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie as RePie,
  Legend,
} from "recharts";

export default function ProjectListPage() {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
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
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Projects");
      const dropdownSheet = workbook.addWorksheet("DropdownData", {
        state: "hidden",
      });

      // Define Columns
      const columns = [
        { header: "projectCode", key: "projectCode", width: 18 },
        { header: "name", key: "name", width: 30 },
        { header: "category", key: "category", width: 20 },
        { header: "department", key: "department", width: 25 },
        { header: "contractor", key: "contractor", width: 25 },
        { header: "contractorPhone", key: "contractorPhone", width: 18 },
        { header: "wardNumber", key: "wardNumber", width: 14 },
        { header: "startDate", key: "startDate", width: 15 },
        { header: "expectedEndDate", key: "expectedEndDate", width: 18 },
        { header: "actualEndDate", key: "actualEndDate", width: 15 },
        { header: "budgetSanctioned", key: "budgetSanctioned", width: 18 },
        { header: "budgetReleased", key: "budgetReleased", width: 18 },
        { header: "budgetUsed", key: "budgetUsed", width: 18 },
        { header: "fundType", key: "fundType", width: 18 },
        { header: "status", key: "status", width: 16 },
        { header: "completionPercent", key: "completionPercent", width: 18 },
        { header: "description", key: "description", width: 35 },
        { header: "address", key: "address", width: 35 },
      ];

      worksheet.columns = columns;

      // Add Example Rows
      worksheet.addRow({
        projectCode: "PROJ-001",
        name: "School Construction",
        category: "EDUCATION",
        department: departments[0]?.name || "Education Department",
        contractor: "ABC Infra Ltd",
        contractorPhone: "9876543210",
        wardNumber: wards[0]?.wardNumber || 101,
        startDate: "2024-01-01",
        expectedEndDate: "2024-12-31",
        actualEndDate: "",
        budgetSanctioned: 5000000,
        budgetReleased: 2000000,
        budgetUsed: 500000,
        fundType: "STATE_FUND",
        status: "RUNNING",
        completionPercent: 10,
        description: "Construction of new school building in Ward 101",
        address: "Plot 12, Main Sector",
      });

      const categories = PROJECT_CATEGORIES.map((c) => c.value);
      const deptList = departments
        .map((d: any) => String(d.name || d.code || "").trim())
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b));
      const wardList = wards
        .map((w: any) => String(w.wardNumber))
        .filter(Boolean)
        .sort((a: string, b: string) => Number(a) - Number(b));
      const fundTypes = FUND_TYPES.map((f) => f.value);
      const statuses = PROJECT_STATUSES.map((s) => s.value);

      dropdownSheet.getColumn(1).values = ["Categories", ...categories];
      dropdownSheet.getColumn(2).values = ["Departments", ...deptList];
      dropdownSheet.getColumn(3).values = ["WardNumbers", ...wardList];
      dropdownSheet.getColumn(4).values = ["FundTypes", ...fundTypes];
      dropdownSheet.getColumn(5).values = ["Statuses", ...statuses];

      for (let i = 2; i <= 501; i++) {
        // Category Dropdown (Column C)
        worksheet.getCell(`C${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=DropdownData!$A$2:$A$${categories.length + 1}`],
          showErrorMessage: true,
        };

        // Department Dropdown (Column D)
        worksheet.getCell(`D${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [
            `=DropdownData!$B$2:$B$${Math.max(deptList.length + 1, 2)}`,
          ],
          showErrorMessage: true,
        };

        // WardNumber Dropdown (Column G)
        worksheet.getCell(`G${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [
            `=DropdownData!$C$2:$C$${Math.max(wardList.length + 1, 2)}`,
          ],
          showErrorMessage: true,
        };

        // FundType Dropdown (Column N)
        worksheet.getCell(`N${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=DropdownData!$D$2:$D$${fundTypes.length + 1}`],
          showErrorMessage: true,
        };

        // Status Dropdown (Column O)
        worksheet.getCell(`O${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=DropdownData!$E$2:$E$${statuses.length + 1}`],
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
      a.download = "Projects_Import_Template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate Projects template", err);
      toast.error("Failed to generate Excel template");
    }
  };

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (wardFilter !== "all") p.wardId = wardFilter;
    if (statusFilter !== "all") p.status = statusFilter;
    if (categoryFilter !== "all") p.category = categoryFilter;
    if (deptFilter !== "all") p.departmentId = deptFilter;
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <FolderKanban className="h-7 w-7 text-primary" />
              Projects
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Constituency development works & budget tracking
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 sm:flex-nowrap sm:justify-end">
            <PermissionGate module="projects" action="read">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto h-9 text-xs font-semibold hover:bg-muted border-border/60"
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
                className="gap-2 w-full sm:w-auto h-9 text-xs font-semibold hover:bg-muted border-border/60"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                Bulk Upload
              </Button>
            </PermissionGate>

            <PermissionGate module="projects" action="create">
              <Link to="/projects/new" className="w-full sm:w-auto">
                <Button className="gap-2 w-full sm:w-auto bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none">
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
              <p className="text-xs text-muted-foreground">
                Upload an Excel or CSV file to import multiple projects. Records
                are upserted by Project Code or Name.
              </p>
            </div>
          }
          onDownloadSample={downloadSampleTemplate}
        />

        {/* Stats Summary Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                label: "Total Projects",
                value: stats.total,
                Icon: FolderKanban,
                color: "text-indigo-500",
                bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
                borderColor: "border-indigo-100 dark:border-indigo-950/50",
              },
              {
                label: "Running",
                value: stats.running,
                Icon: TrendingUp,
                color: "text-amber-500",
                bgColor: "bg-amber-50 dark:bg-amber-950/30",
                borderColor: "border-amber-100 dark:border-amber-950/50",
              },
              {
                label: "Pending",
                value: stats.pending,
                Icon: Clock,
                color: "text-blue-500",
                bgColor: "bg-blue-50 dark:bg-blue-950/30",
                borderColor: "border-blue-100 dark:border-blue-950/50",
              },
              {
                label: "Completed",
                value: stats.completed,
                Icon: CheckCircle2,
                color: "text-emerald-500",
                bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
                borderColor: "border-emerald-100 dark:border-emerald-950/50",
              },
              {
                label: "On Hold",
                value: stats.onHold,
                Icon: PauseCircle,
                color: "text-rose-500",
                bgColor: "bg-rose-50 dark:bg-rose-950/30",
                borderColor: "border-rose-100 dark:border-rose-950/50",
              },
            ].map((s, i) => (
              <Card key={i} className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20">
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
                    <h3 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                      {s.value}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Perfected Dashboard Row */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Performance Matrix */}
            <Card className="lg:col-span-1 border border-border/50 bg-card shadow-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/10">
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                  </div>
                  Category Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={stats.byCategory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                        opacity={0.4}
                      />
                      <XAxis
                        dataKey="category"
                        fontSize={9}
                        fontWeight={500}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        dy={5}
                      />
                      <YAxis
                        fontSize={10}
                        fontWeight={500}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        dx={-5}
                      />
                      <ReTooltip
                        cursor={{ fill: "hsl(var(--muted)/0.15)" }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
                          fontSize: "11px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={6}
                        verticalAlign="top"
                        height={32}
                        align="right"
                        wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                      />
                      <ReBar
                        dataKey="total"
                        name="Total"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={16}
                      />
                      <ReBar
                        dataKey="completed"
                        name="Done"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={16}
                      />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Financial Health (Funds Pie) */}
            <Card className="lg:col-span-1 border border-border/50 bg-card shadow-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/10">
                    <IndianRupee className="h-4 w-4 text-emerald-500" />
                  </div>
                  Fund Utilisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] relative flex items-center justify-center">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
                    <span className="text-2xl font-extrabold tracking-tight text-foreground">
                      {Math.round(
                        (stats.totalUsed / stats.totalSanctioned) * 100,
                      ) || 0}
                      %
                    </span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">
                      Utilised
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <RePie
                        data={[
                          {
                            name: "Available",
                            value: stats.totalSanctioned - stats.totalUsed,
                            color: "hsl(var(--muted))",
                          },
                          {
                            name: "Released",
                            value: stats.totalReleased,
                            color: "#f59e0b",
                          },
                          {
                            name: "Expenditure",
                            value: stats.totalUsed,
                            color: "#22c55e",
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {[
                          { color: "hsl(var(--muted)/0.4)" },
                          { color: "#f59e0b" },
                          { color: "#22c55e" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </RePie>
                      <ReTooltip 
                        formatter={(v: any) => formatBudget(v)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
                          fontSize: "11px",
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] text-center font-bold">
                  <div className="text-muted-foreground bg-muted/40 py-1.5 rounded border border-border/30">
                    Sanctioned: <span className="font-mono">{formatBudget(stats.totalSanctioned)}</span>
                  </div>
                  <div className="text-amber-700 bg-amber-50/50 py-1.5 rounded border border-amber-100/50 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30">
                    Released: <span className="font-mono">{formatBudget(stats.totalReleased)}</span>
                  </div>
                  <div className="text-emerald-700 bg-emerald-50/50 py-1.5 rounded border border-emerald-100/50 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                    Used: <span className="font-mono">{formatBudget(stats.totalUsed)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Alerts & Delay Metrics (Expanded) */}
            {!isAlertDismissed && stats.delayedCount > 0 && (
              <Card className="lg:col-span-1 border border-rose-200 bg-rose-50/30 dark:border-rose-900/30 dark:bg-rose-950/10 shadow-lg shadow-rose-500/5 relative overflow-hidden flex flex-col justify-between rounded-2xl">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2.5 right-2.5 h-6 w-6 text-rose-400 hover:text-rose-600 hover:bg-transparent"
                  onClick={() => setIsAlertDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase text-rose-750 dark:text-rose-400 flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 animate-bounce" />
                      Critical Delay Alerts
                    </span>
                    <Badge
                      variant="destructive"
                      className="h-5 px-1.5 font-bold bg-rose-600 hover:bg-rose-700"
                    >
                      {stats.delayedCount} OVERDUE
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="rounded-xl bg-background/50 dark:bg-background/25 p-3 border border-rose-100 dark:border-rose-900/20 flex-1">
                    <p className="text-[10px] text-rose-800 dark:text-rose-400 font-bold leading-none flex items-center gap-1.5">
                      <UserCheck className="h-3 w-3" />
                      PROJECTS REQUIRING ATTENTION
                    </p>
                    <div className="mt-3 space-y-2 max-h-[160px] overflow-y-auto pr-1 thin-scrollbar">
                      {stats.delayedProjects?.map((p: any) => (
                        <Link key={p.id} to={`/projects/${p.id}`}>
                          <div className="p-2.5 rounded-xl bg-card hover:bg-muted/40 border border-rose-100/50 dark:border-rose-900/30 hover:border-rose-300 transition-all duration-200 flex justify-between items-center group cursor-pointer mt-2 first:mt-0 shadow-sm">
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold text-foreground truncate group-hover:text-primary">
                                {p.name}
                              </p>
                              <p className="text-[9px] text-muted-foreground mt-0.5 font-semibold">
                                Status: {p.status} • <span className="text-rose-600">{p.daysOverdue} days late</span>
                              </p>
                            </div>
                            <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* If alert dismissed or no delays, show a nice summary */}
            {(isAlertDismissed || stats.delayedCount === 0) && (
              <Card className="lg:col-span-1 border border-border/50 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-950 dark:to-slate-900/50 flex flex-col justify-center items-center p-8 text-center min-h-[250px] rounded-2xl">
                <div className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-4 text-indigo-600 border border-indigo-100/40">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-indigo-900 dark:text-indigo-400 text-sm">
                  Status Clearance
                </h3>
                <p className="text-[11px] text-muted-foreground mt-2 max-w-[200px] leading-relaxed">
                  No critical delays detected or notifications have been acknowledged.
                </p>
                {isAlertDismissed && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-4 text-[10px] text-indigo-600 hover:text-indigo-800 p-0"
                    onClick={() => setIsAlertDismissed(false)}
                  >
                    Restore Delay Alerts
                  </Button>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Filters */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex gap-2.5 flex-wrap w-full lg:w-auto">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-32 h-10 border-border/60 bg-muted/10">
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
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10">
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
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10">
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
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10">
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
                      className="text-xs h-10 px-3 text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Project</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Category</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Department</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Budget</TableHead>
                    <TableHead className="h-12 px-4 text-center text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Progress</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j} className="py-4 px-4">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : projects.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={8}
                        className="text-center py-16 text-muted-foreground text-xs"
                      >
                        <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                        <p className="font-medium text-sm">No projects found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((p: any) => {
                      const sI = getStatusInfo(p.status);
                      const cI = getCategoryInfo(p.category);
                      return (
                        <TableRow key={p.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                          <TableCell className="py-4 px-4 align-middle">
                            <Link to={`/projects/${p.id}`}>
                              <span className="font-semibold text-primary hover:underline cursor-pointer text-sm">
                                {p.name}
                              </span>
                            </Link>
                            <p className="text-[10px] text-muted-foreground font-mono mt-1 flex items-center gap-1.5">
                              <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold text-muted-foreground border">
                                {p.projectCode}
                              </span>
                              {p.contractor && (
                                <span className="truncate">🏗️ {p.contractor}</span>
                              )}
                            </p>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Badge
                              variant="secondary"
                              className="text-[9px] sm:text-[10px] font-semibold gap-1 px-2 py-0.5 border"
                            >
                              <span>{cI.icon}</span>
                              {cI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-xs sm:text-sm font-semibold text-foreground">
                            Ward {p.ward?.wardNumber}
                            <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{p.ward?.name}</p>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-muted-foreground">
                            {p.department?.name || "—"}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-right">
                            <p className="font-mono text-xs sm:text-sm font-bold text-foreground">
                              {formatBudget(p.budgetSanctioned)}
                            </p>
                            <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">
                              Used: {formatBudget(p.budgetUsed)}
                            </p>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={p.completionPercent}
                                  className="h-1.5 w-16"
                                />
                                <span className="font-mono text-[10px] sm:text-xs font-bold text-foreground">
                                  {p.completionPercent}%
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Badge className={cn("text-[9px] sm:text-[10px] font-semibold border shadow-none", sI.color)}>
                              {sI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/projects/${p.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted"
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                              </Link>
                              <PermissionGate module="projects" action="update">
                                <Link to={`/projects/${p.id}/edit`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-muted"
                                  >
                                    <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
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
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-border/40">
                <p className="text-xs text-muted-foreground font-semibold">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted"
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
