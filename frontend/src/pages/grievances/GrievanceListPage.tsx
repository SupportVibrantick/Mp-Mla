import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  useGrievances,
  useGrievanceStats,
  useGrievanceAnalytics,
  useExportGrievances,
  useBulkImportGrievances,
  useDeleteGrievance,
  useBulkDeleteGrievances,
  getStatusInfo,
  getPriorityInfo,
  getCategoryInfo,
  GRIEVANCE_STATUSES,
  PRIORITIES,
  CATEGORIES,
  SOURCES,
} from "@/hooks/useGrievances";
import { BulkUploadModal } from "@/components/shared/BulkUploadModal";
import * as xlsx from "xlsx";
import ExcelJS from "exceljs";
import { toast } from "sonner";

import { useWards } from "@/hooks/useWards";
import { useDepartments } from "@/hooks/useDepartments";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  MessageSquare,
  Plus,
  Search,
  Eye,
  Trash2,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileUp,
  Download,
  Loader2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { formatDistanceToNow } from "date-fns";

export default function GrievanceListPage() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all",
  );
  const [priorityFilter, setPriorityFilter] = useState(
    searchParams.get("priority") || "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 10 };
    if (search) p.search = search;
    if (wardFilter !== "all") p.wardId = wardFilter;
    if (statusFilter !== "all") p.status = statusFilter;
    if (priorityFilter !== "all") p.priority = priorityFilter;
    if (categoryFilter !== "all") p.category = categoryFilter;
    if (departmentFilter !== "all") p.departmentId = departmentFilter;
    if (sortBy) p.sortBy = sortBy;
    p.sortOrder = sortOrder;
    return p;
  }, [
    search,
    wardFilter,
    statusFilter,
    priorityFilter,
    categoryFilter,
    departmentFilter,
    sortBy,
    sortOrder,
    page,
  ]);

  const { data: gRes, isLoading } = useGrievances(params);
  const { data: statsRes } = useGrievanceStats(
    wardFilter !== "all" ? wardFilter : undefined,
  );
  const { data: analyticsRes } = useGrievanceAnalytics(6);
  const { data: wardsRes } = useWards({ limit: 100 });
  const { data: deptsRes } = useDepartments();
  const grievances = gRes?.data || [];
  const pagination = gRes?.pagination;
  const stats = statsRes?.data;
  const wards = wardsRes?.data?.wards || [];
  const departments = deptsRes?.data || [];

  const { mutateAsync: exportGrievances } = useExportGrievances();
  const { mutateAsync: bulkImport } = useBulkImportGrievances();
  const { mutateAsync: deleteGrievance, isPending: isDeleting } =
    useDeleteGrievance();
  const { mutateAsync: bulkDeleteGrievances, isPending: isBulkDeleting } =
    useBulkDeleteGrievances();

  const deptMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d: any) => {
      map[d.id] = d.name;
    });
    return map;
  }, [departments]);

  const allSelected =
    grievances.length > 0 &&
    grievances.every((g: any) => selectedIds.includes(g.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(grievances.map((g: any) => g.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await exportGrievances(params);
      if (res.success && res.data) {
        const worksheet = xlsx.utils.json_to_sheet(res.data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Public Requests");
        xlsx.writeFile(
          workbook,
          `PublicRequests_${new Date().toISOString().split("T")[0]}.xlsx`,
        );
        toast.success("Public requests exported successfully");
      }
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSample = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template");
      const dropdownSheet = workbook.addWorksheet("DropdownData", {
        state: "hidden",
      });

      const columns = [
        { header: "ticketNumber", key: "ticketNumber", width: 20 },
        { header: "subject", key: "subject", width: 30 },
        { header: "category", key: "category", width: 20 },
        { header: "subcategory", key: "subcategory", width: 22 },
        { header: "description", key: "description", width: 40 },
        { header: "status", key: "status", width: 16 },
        { header: "priority", key: "priority", width: 14 },
        { header: "source", key: "source", width: 18 },
        { header: "wardNumber", key: "wardNumber", width: 14 },
        { header: "assignedDept", key: "assignedDept", width: 24 },
        { header: "complainantName", key: "complainantName", width: 24 },
        { header: "complainantPhone", key: "complainantPhone", width: 18 },
        { header: "complainantEmail", key: "complainantEmail", width: 28 },
        { header: "complainantAddress", key: "complainantAddress", width: 30 },
        { header: "locationAddress", key: "locationAddress", width: 30 },
      ];

      worksheet.columns = columns;

      worksheet.addRow({
        ticketNumber: "",
        subject: "Example Subject",
        category: "ROAD",
        subcategory: "Potholes",
        description: "Multiple potholes on Main Road",
        status: "OPEN",
        priority: "HIGH",
        source: "OFFICE",
        wardNumber: wards[0]?.wardNumber || "",
        assignedDept: departments[0]?.name || "",
        complainantName: "John Doe",
        complainantPhone: "9876543210",
        complainantEmail: "john@example.com",
        complainantAddress: "H.No 123, Street 5",
        locationAddress: "Opposite Metro Station",
      });

      const categoryList = CATEGORIES.map((c) => c.value);
      const statusList = GRIEVANCE_STATUSES.map((s) => s.value);
      const priorityList = PRIORITIES.map((p) => p.value);
      const sourceList = SOURCES.map((s) => s.value);
      const wardList = wards
        .map((w: any) => String(w.wardNumber))
        .filter(Boolean)
        .sort((a: string, b: string) => Number(a) - Number(b));
      const deptList = departments
        .map((d: any) => String(d.name || "").trim())
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b));

      dropdownSheet.getColumn(1).values = ["Categories", ...categoryList];
      dropdownSheet.getColumn(2).values = ["Statuses", ...statusList];
      dropdownSheet.getColumn(3).values = ["Priorities", ...priorityList];
      dropdownSheet.getColumn(4).values = ["Sources", ...sourceList];
      dropdownSheet.getColumn(5).values = ["WardNumbers", ...wardList];
      dropdownSheet.getColumn(6).values = ["Departments", ...deptList];

      for (let i = 2; i <= 501; i++) {
        worksheet.getCell(`C${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=DropdownData!$A$2:$A$${categoryList.length + 1}`],
          showErrorMessage: true,
        };
        worksheet.getCell(`F${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=DropdownData!$B$2:$B$${statusList.length + 1}`],
          showErrorMessage: true,
        };
        worksheet.getCell(`G${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=DropdownData!$C$2:$C$${priorityList.length + 1}`],
          showErrorMessage: true,
        };
        worksheet.getCell(`H${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=DropdownData!$D$2:$D$${sourceList.length + 1}`],
          showErrorMessage: true,
        };
        worksheet.getCell(`I${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [
            `=DropdownData!$E$2:$E$${Math.max(wardList.length + 1, 2)}`,
          ],
          showErrorMessage: true,
        };
        worksheet.getCell(`J${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [
            `=DropdownData!$F$2:$F$${Math.max(deptList.length + 1, 2)}`,
          ],
          showErrorMessage: true,
        };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "PublicRequests_Import_Template.xlsx";
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download template", err);
      toast.error("Failed to generate Excel template");
    }
  };

  const reset = () => {
    setSearch("");
    setWardFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setDepartmentFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
    setSelectedIds([]);
  };

  return (
    <MainLayout title="Public Requests">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Public Requests / Grievances
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              Track citizen complaints, petitions, and requests by ward
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <PermissionGate module="grievances" action="create">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkOpen(true)}
                className="gap-2 border-border/80 hover:bg-muted/50 rounded-xl h-9 text-xs font-semibold"
              >
                <FileUp className="h-4 w-4 text-emerald-600" />
                <span>Bulk Upload</span>
              </Button>
            </PermissionGate>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2 border-border/80 hover:bg-muted/50 rounded-xl h-9 text-xs font-semibold"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Download className="h-4 w-4 text-blue-600" />
              )}
              <span>Export</span>
            </Button>

            <PermissionGate module="grievances" action="create">
              <Link to="/public-requests/new">
                <Button
                  size="sm"
                  className="gap-2 w-full sm:w-auto justify-center bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Request</span>
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: "Total Requests",
              value: stats?.total || 0,
              Icon: MessageSquare,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
              borderColor: "border-indigo-100 dark:border-indigo-950/50",
            },
            {
              label: "Open Requests",
              value: stats?.open || 0,
              Icon: Clock,
              color: "text-amber-500",
              bgColor: "bg-amber-50 dark:bg-amber-950/30",
              borderColor: "border-amber-100 dark:border-amber-950/50",
            },
            {
              label: "In Progress",
              value: stats?.inProgress || 0,
              Icon: TrendingUp,
              color: "text-blue-500",
              bgColor: "bg-blue-50 dark:bg-blue-950/30",
              borderColor: "border-blue-100 dark:border-blue-950/50",
            },
            {
              label: "Escalated",
              value: stats?.escalated || 0,
              Icon: AlertTriangle,
              color: "text-purple-500",
              bgColor: "bg-purple-50 dark:bg-purple-950/30",
              borderColor: "border-purple-100 dark:border-purple-950/50",
            },
            {
              label: "Resolved",
              value: stats?.resolved || 0,
              Icon: CheckCircle2,
              color: "text-emerald-500",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
              borderColor: "border-emerald-100 dark:border-emerald-950/50",
            },
            {
              label: "High Priority",
              value: stats?.byPriority?.HIGH ?? 0,
              Icon: XCircle,
              color: "text-rose-500",
              bgColor: "bg-rose-50 dark:bg-rose-950/30",
              borderColor: "border-rose-100 dark:border-rose-950/50",
            },
          ].map((s, i) => (
            <Card
              key={i}
              className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl"
            >
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-center">
                  <div
                    className={cn(
                      "p-2 rounded-xl border",
                      s.bgColor,
                      s.borderColor,
                    )}
                  >
                    <s.Icon className={cn("h-4 w-4", s.color)} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                    {s.label}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
                    {s.value.toLocaleString()}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Card */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket #, subject, complainant name or phone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus-visible:ring-primary/20 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div className="flex gap-2 flex-wrap w-full lg:w-auto items-center">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10 text-xs rounded-xl">
                    <Filter className="h-3.5 w-3.5 mr-1 opacity-50" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {GRIEVANCE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter}
                  onValueChange={(v) => {
                    setPriorityFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-32 h-10 border-border/60 bg-muted/10 text-xs rounded-xl">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.icon} {p.label}
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
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10 text-xs rounded-xl">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={departmentFilter}
                  onValueChange={(v) => {
                    setDepartmentFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40 h-10 border-border/60 bg-muted/10 text-xs rounded-xl">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.code})
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
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10 text-xs rounded-xl">
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

                <Select
                  value={sortBy}
                  onValueChange={(v) => {
                    setSortBy(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10 text-xs rounded-xl">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="ticketNumber">Ticket Number</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 border-border/60 bg-muted/10 rounded-xl"
                  onClick={() => {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    setPage(1);
                  }}
                  title={sortOrder === "asc" ? "Ascending" : "Descending"}
                >
                  {sortOrder === "asc" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </Button>

                {(search ||
                  wardFilter !== "all" ||
                  statusFilter !== "all" ||
                  priorityFilter !== "all" ||
                  categoryFilter !== "all" ||
                  departmentFilter !== "all" ||
                  sortBy !== "createdAt" ||
                  sortOrder !== "desc") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="text-xs h-10 px-3 text-muted-foreground hover:text-foreground rounded-xl"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Bulk Selection Action Bar */}
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs shadow-sm transition-all animate-in fade-in-50">
                <span className="font-semibold text-destructive">
                  {selectedIds.length} request(s) selected
                </span>
                <PermissionGate module="grievances" action="delete">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 rounded-lg text-xs gap-1.5 font-semibold"
                    onClick={() => setIsBulkDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Move Selected to Recycle Bin
                  </Button>
                </PermissionGate>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-12 w-10 px-4 text-left py-4 bg-muted/20">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20 w-32">
                      Ticket
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Subject
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Complainant
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Category
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Ward
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Department
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Priority
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Status
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Created At
                    </TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({ length: 11 }).map((_, j) => (
                          <TableCell key={j} className="py-4 px-4">
                            <Skeleton className="h-4 w-full rounded" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : grievances.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-center py-20 text-muted-foreground text-xs font-semibold"
                      >
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30 text-primary" />
                        <p className="font-bold text-sm text-foreground">
                          No requests found
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adjust filters or create a new request
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    grievances.map((g: any) => {
                      const sI = getStatusInfo(g.status);
                      const pI = getPriorityInfo(g.priority);
                      const cI = getCategoryInfo(g.category);
                      const isSelected = selectedIds.includes(g.id);
                      return (
                        <TableRow
                          key={g.id}
                          className={cn(
                            "hover:bg-muted/10 transition-colors border-b border-border/40",
                            isSelected && "bg-primary/5",
                          )}
                        >
                          <TableCell className="py-4 px-4 align-middle">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectOne(g.id)}
                            />
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <span
                              onClick={() =>
                                navigate("/public-requests/detail", {
                                  state: { id: g.id },
                                })
                              }
                              className="font-mono text-xs text-primary hover:underline cursor-pointer font-bold"
                            >
                              {g.ticketNumber}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <p
                              onClick={() =>
                                navigate("/public-requests/detail", {
                                  state: { id: g.id },
                                })
                              }
                              className="font-bold text-xs sm:text-sm hover:underline cursor-pointer max-w-[180px] truncate text-foreground"
                            >
                              {g.subject}
                            </p>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <p className="text-xs font-bold text-foreground">
                              {g.complainantName || "Unknown"}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              {g.complainantPhone}
                            </p>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold gap-1 rounded-lg"
                            >
                              <span>{cI.icon}</span>
                              {cI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground py-4 px-4 align-middle">
                            #{g.ward?.wardNumber} {g.ward?.name}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground py-4 px-4 align-middle">
                            {g.department?.name
                              ? `${g.department.name}${g.department.code ? ` (${g.department.code})` : ""}`
                              : g.departmentId
                                ? deptMap[g.departmentId] || g.departmentId
                                : g.assignedDept
                                  ? deptMap[g.assignedDept] || g.assignedDept
                                  : "—"}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Badge
                              className={`text-[10px] font-bold border-none rounded-lg ${pI.color}`}
                            >
                              {pI.icon} {pI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Badge
                              className={`text-[10px] font-bold border-none rounded-lg ${sI.color}`}
                            >
                              {sI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap py-4 px-4 align-middle">
                            {formatDistanceToNow(new Date(g.createdAt), {
                              addSuffix: false,
                            })}{" "}
                            ago
                          </TableCell>
                          <TableCell className="text-right py-4 px-4 align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl hover:bg-muted/80"
                                onClick={() =>
                                  navigate("/public-requests/detail", {
                                    state: { id: g.id },
                                  })
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <PermissionGate
                                module="grievances"
                                action="delete"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setSingleDeleteId(g.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} records)
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 bg-card"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 bg-card"
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

        {/* Bulk Delete Alert Dialog */}
        <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Move Selected Requests to Recycle Bin?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will move {selectedIds.length} selected request(s) to the
                Recycle Bin. You can restore them later from the Recycle Bin if
                needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBulkDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isBulkDeleting}
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    await bulkDeleteGrievances(selectedIds);
                    setSelectedIds([]);
                    setIsBulkDeleteOpen(false);
                  } catch (err) {
                    // handled by hook
                  }
                }}
              >
                {isBulkDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1.5" />
                )}
                Move to Recycle Bin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Single Delete Alert Dialog */}
        <AlertDialog
          open={!!singleDeleteId}
          onOpenChange={(open) => !open && setSingleDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move Request to Recycle Bin?</AlertDialogTitle>
              <AlertDialogDescription>
                This public request will be moved to the Recycle Bin. You can
                restore it later from the Recycle Bin if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={async (e) => {
                  e.preventDefault();
                  if (!singleDeleteId) return;
                  try {
                    await deleteGrievance(singleDeleteId);
                    setSingleDeleteId(null);
                  } catch (err) {
                    // handled by hook
                  }
                }}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1.5" />
                )}
                Move to Recycle Bin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          open={isBulkOpen}
          onOpenChange={setIsBulkOpen}
          onUpload={async (data) => {
            await bulkImport(data);
          }}
          title="Bulk Import Public Requests"
          description="Download the template to see the required format. All requests will be imported with either a new ticket number or an updated one if ticketNumber is provided."
          onDownloadSample={handleDownloadSample}
          sampleFileName="PublicRequests_Import_Template.xlsx"
        />
      </div>
    </MainLayout>
  );
}
