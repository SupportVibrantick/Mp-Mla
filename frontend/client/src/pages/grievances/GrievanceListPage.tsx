import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  useGrievances,
  useGrievanceStats,
  useGrievanceAnalytics,
  useExportGrievances,
  useBulkImportGrievances,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { MainLayout } from "@/components/layout/MainLayout";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MessageSquare,
  Plus,
  Search,
  Eye,
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
  const [page, setPage] = useState(1);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);


  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (wardFilter !== "all") p.wardId = wardFilter;
    if (statusFilter !== "all") p.status = statusFilter;
    if (priorityFilter !== "all") p.priority = priorityFilter;
    if (categoryFilter !== "all") p.category = categoryFilter;
    return p;
  }, [search, wardFilter, statusFilter, priorityFilter, categoryFilter, page]);

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
  const trend = analyticsRes?.data?.trend || [];
  const wards = wardsRes?.data?.wards || [];
  const departments = deptsRes?.data || [];

  const { mutateAsync: exportGrievances } = useExportGrievances();
  const { mutateAsync: bulkImport } = useBulkImportGrievances();

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

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFF2F7" },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "PublicRequests_Import_Template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Failed to download sample template");
    }
  };

  const deptMap = useMemo(() => {

    const m: Record<string, string> = {};
    (departments || []).forEach((d: any) => {
      m[d.id] = d.name;
    });
    return m;
  }, [departments]);

  const reset = () => {
    setSearch("");
    setWardFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setPage(1);
  };

  return (
    <MainLayout title="Public Requests">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-primary" /> Public Requests
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track and resolve citizen requests
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="grievances" action="create">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsBulkOpen(true)}
              >
                <FileUp className="h-4 w-4" /> Bulk Import
              </Button>
            </PermissionGate>

            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? "Exporting..." : "Export All"}
            </Button>

            <PermissionGate module="grievances" action="create">
              <Link to="/public-requests/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> New Request
                </Button>
              </Link>
            </PermissionGate>
          </div>

        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              {
                label: "Total",
                value: stats.total,
                Icon: MessageSquare,
                color: "#6366f1",
              },
              {
                label: "Open",
                value: stats.open,
                Icon: Clock,
                color: "#3b82f6",
              },
              {
                label: "In Progress",
                value: stats.inProgress,
                Icon: TrendingUp,
                color: "#f59e0b",
              },
              // {
              //   label: "Escalated",
              //   value: stats.escalated,
              //   Icon: AlertTriangle,
              //   color: "#ef4444",
              // },
              {
                label: "Resolved",
                value: stats.resolved,
                Icon: CheckCircle2,
                color: "#22c55e",
              },
              // {
              //   label: "Overdue",
              //   value: stats.overdue,
              //   Icon: XCircle,
              //   color: "#dc2626",
              // },
              {
                label: "Resolution",
                value: `${stats.resolutionRate}%`,
                Icon: TrendingUp,
                color: "#10b981",
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
                    <p className="text-lg font-bold leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          {trend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="created"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Created"
                      />
                      <Line
                        type="monotone"
                        dataKey="resolved"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Resolved"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          {stats?.byCategory && stats.byCategory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.byCategory.slice(0, 8)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" fontSize={10} />
                      <YAxis
                        dataKey="category"
                        type="category"
                        width={85}
                        fontSize={10}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#6366f1"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ticket, name, phone..."
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
                  <SelectTrigger className="w-36">
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
                  <SelectTrigger className="w-32">
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
                  <SelectTrigger className="w-40">
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
                  priorityFilter !== "all" ||
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
                    <TableHead className="w-32">Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Complainant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : grievances.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No requests found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    grievances.map((g: any) => {
                      const sI = getStatusInfo(g.status);
                      const pI = getPriorityInfo(g.priority);
                      const cI = getCategoryInfo(g.category);
                      return (
                        <TableRow
                          key={g.id}
                          className="hover:bg-muted/50"
                        >
                          <TableCell>
                            <span
                              onClick={() =>
                                navigate("/public-requests/detail", {
                                  state: { id: g.id },
                                })
                              }
                              className="font-mono text-xs text-primary hover:underline cursor-pointer font-semibold"
                            >
                              {g.ticketNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <p
                              onClick={() =>
                                navigate("/public-requests/detail", {
                                  state: { id: g.id },
                                })
                              }
                              className="font-medium text-sm hover:underline cursor-pointer max-w-[180px] truncate"
                            >
                              {g.subject}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {g.complainantName || "Unknown"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {g.complainantPhone}
                            </p>
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
                            #{g.ward?.wardNumber} {g.ward?.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {g.assignedDept
                              ? deptMap[g.assignedDept] || g.assignedDept
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${pI.color}`}>
                              {pI.icon} {pI.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${sI.color}`}>
                              {sI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(g.createdAt), {
                              addSuffix: false,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                navigate("/public-requests/detail", {
                                  state: { id: g.id },
                                })
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total})
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
