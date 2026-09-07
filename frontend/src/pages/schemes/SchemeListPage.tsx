import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useSchemes,
  useSchemeStats,
  getSchemeStatusInfo,
  SCHEME_STATUSES,
  SCHEME_LEVELS,
  useBulkCreateSchemes,
} from "@/hooks/useSchemes";
import { toast } from "sonner";
import * as xlsx from "xlsx";
import ExcelJS from "exceljs";
import api from "@/lib/api";
import { BulkUploadModal } from "@/components/shared/BulkUploadModal";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent } from "@/components/ui/card";
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
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileUp,
  Download,
} from "lucide-react";
import { format } from "date-fns";

export default function SchemeListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { mutateAsync: bulkCreateSchemes } = useBulkCreateSchemes();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/admin/schemes/export");
      const data = response.data?.data;
      if (data && data.length > 0) {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Schemes");
        xlsx.writeFile(wb, "schemes_export.xlsx");
        toast.success("Schemes exported successfully.");
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export schemes.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSampleTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Schemes");
      const dropdownSheet = workbook.addWorksheet("DropdownData", {
        state: "hidden",
      });

      const columns = [
        { header: "name", key: "name", width: 30 },
        { header: "code", key: "code", width: 18 },
        { header: "department", key: "department", width: 25 },
        { header: "level", key: "level", width: 16 },
        { header: "status", key: "status", width: 16 },
        { header: "description", key: "description", width: 40 },
        { header: "eligibility", key: "eligibility", width: 35 },
        { header: "benefits", key: "benefits", width: 35 },
        { header: "requiredDocuments", key: "requiredDocuments", width: 35 },
        { header: "applicationUrl", key: "applicationUrl", width: 30 },
        { header: "startDate", key: "startDate", width: 15 },
        { header: "endDate", key: "endDate", width: 15 },
      ];

      worksheet.columns = columns;

      worksheet.addRow({
        name: "PM Awas Yojana",
        code: "PMAY-01",
        department: "Housing & Urban Development",
        level: "CENTRAL",
        status: "ACTIVE",
        description: "Housing for all scheme providing financial assistance",
        eligibility: "Annual income below 3 Lacs",
        benefits: "Financial grant up to Rs 2.5 Lacs",
        requiredDocuments: "Aadhaar Card, Income Certificate, Bank Passbook",
        applicationUrl: "https://pmaymis.gov.in",
        startDate: "2024-01-01",
        endDate: "2026-12-31",
      });

      const levels = SCHEME_LEVELS.map((l) => l.value);
      const statuses = SCHEME_STATUSES.map((s) => s.value);

      dropdownSheet.getColumn(1).values = ["Levels", ...levels];
      dropdownSheet.getColumn(2).values = ["Statuses", ...statuses];

      for (let i = 2; i <= 501; i++) {
        // Level Dropdown (Column D)
        worksheet.getCell(`D${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=DropdownData!$A$2:$A$${levels.length + 1}`],
          showErrorMessage: true,
        };

        // Status Dropdown (Column E)
        worksheet.getCell(`E${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`=DropdownData!$B$2:$B$${statuses.length + 1}`],
          showErrorMessage: true,
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
      a.download = "Schemes_Import_Template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate Schemes template", err);
      toast.error("Failed to generate Excel template");
    }
  };

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (statusFilter !== "all") p.status = statusFilter;
    if (levelFilter !== "all") p.level = levelFilter;
    return p;
  }, [search, statusFilter, levelFilter, page]);

  const { data: sRes, isLoading } = useSchemes(params);
  const { data: statsRes } = useSchemeStats();
  const schemes = sRes?.data || [];
  const pagination = sRes?.pagination;
  const stats = statsRes?.data;

  return (
    <MainLayout title="Schemes">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <FileText className="h-7 w-7 text-primary" />
              Government Schemes
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Central, State & Local welfare schemes
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 sm:flex-nowrap sm:justify-end w-full sm:w-auto">
            <PermissionGate module="schemes" action="read">
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

            <PermissionGate module="schemes" action="create">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto h-9 text-xs font-semibold hover:bg-muted border-border/60"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                Bulk Upload
              </Button>
            </PermissionGate>

            <PermissionGate module="schemes" action="create">
              <Link to="/schemes/new" className="w-full sm:w-auto">
                <Button className="gap-2 w-full sm:w-auto bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none">
                  <Plus className="h-4 w-4" />
                  Add Scheme
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        <BulkUploadModal
          open={isBulkImportOpen}
          onOpenChange={setIsBulkImportOpen}
          onUpload={bulkCreateSchemes}
          title="Import Government Schemes"
          description={
            <div>
              <p className="text-xs text-muted-foreground">
                Upload an Excel or CSV file to import multiple government schemes.
                Records are upserted matching on Scheme Code or Name.
              </p>
            </div>
          }
          onDownloadSample={downloadSampleTemplate}
        />

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total Schemes",
                value: stats.totalSchemes,
                icon: FileText,
                color: "#6366f1",
              },
              {
                label: "Active",
                value: stats.activeSchemes,
                icon: FileText,
                color: "#22c55e",
              },
              {
                label: "Applications",
                value: stats.totalApplications,
                icon: Users,
                color: "#3b82f6",
              },
              {
                label: "Approved",
                value: stats.approved,
                icon: Users,
                color: "#8b5cf6",
              },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${s.color}20` }}
                  >
                    <s.icon className="h-4 w-4" style={{ color: s.color }} />
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schemes..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
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
                    {SCHEME_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={levelFilter}
                  onValueChange={(v) => {
                    setLevelFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {SCHEME_LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.icon} {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <TableHead>Scheme</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-center">Applications</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : schemes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No schemes found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    schemes.map((s: any) => {
                      const stInfo = getSchemeStatusInfo(s.status);
                      return (
                        <TableRow key={s.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Link to={`/schemes/${s.id}`}>
                              <span className="font-medium text-primary hover:underline cursor-pointer">
                                {s.name}
                              </span>
                            </Link>
                            {s.startDate && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(s.startDate), "dd MMM yyyy")}
                                {s.endDate && ` - ${format(new Date(s.endDate), "dd MMM yyyy")}`}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {s.code || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.department}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {s.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <p className="font-mono text-sm">
                              {s._count?.applications?.toLocaleString() || 0}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${stInfo.color}`}>
                              {stInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/schemes/${s.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <PermissionGate module="schemes" action="update">
                                <Link to={`/schemes/${s.id}/edit`}>
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