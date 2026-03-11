import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useInstitutions,
  useInstitutionStats,
  useBulkCreateInstitutions,
  getCategoryInfo,
  getStatusInfo,
  INSTITUTION_CATEGORIES,
  INSTITUTION_STATUSES,
} from "@/hooks/useInstitutions";
import { useWards } from "@/hooks/useWards";
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
  Building2,
  Plus,
  Search,
  Eye,
  Edit,
  MapPin,
  Phone,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileUp,
  Download,
  Loader2,
} from "lucide-react";

export default function InstitutionListPage() {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const queryParams = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (wardFilter !== "all") p.wardId = wardFilter;
    if (categoryFilter !== "all") p.category = categoryFilter;
    if (statusFilter !== "all") p.status = statusFilter;
    return p;
  }, [search, wardFilter, categoryFilter, statusFilter, page]);

  const { data: instRes, isLoading } = useInstitutions(queryParams);
  const { data: statsRes } = useInstitutionStats(
    wardFilter !== "all" ? wardFilter : undefined,
  );
  const { data: wardsRes } = useWards({ limit: 100 });
  const { mutateAsync: bulkCreateInstitutions } = useBulkCreateInstitutions();

  const institutions = instRes?.data || [];
  const pagination = instRes?.pagination;
  const stats = statsRes?.data;
  const wards = wardsRes?.data?.wards || [];

  const categoryGroups = useMemo(() => {
    const groups: Record<string, (typeof INSTITUTION_CATEGORIES)[number][]> =
      {};
    INSTITUTION_CATEGORIES.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, []);

  const reset = () => {
    setSearch("");
    setWardFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPage(1);
  };

  // ── Export ──
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportParams: Record<string, any> = {};
      if (wardFilter !== "all") exportParams.wardId = wardFilter;
      if (categoryFilter !== "all") exportParams.category = categoryFilter;
      if (statusFilter !== "all") exportParams.status = statusFilter;

      const response = await api.get("/admin/institutions/export", {
        params: exportParams,
      });
      const data = response.data?.data;
      if (data && data.length > 0) {
        // Remove wardName from export (it's informational, not importable)
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Institutions");
        xlsx.writeFile(wb, "institutions_export.xlsx");
        toast.success(`Exported ${data.length} rows successfully.`);
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export institutions.");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Download Sample Template ──
  const downloadSampleTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Institutions");

    worksheet.columns = [
      { header: "name", key: "name", width: 30 },
      { header: "category", key: "category", width: 20 },
      { header: "subcategory", key: "subcategory", width: 18 },
      { header: "address", key: "address", width: 35 },
      { header: "wardNumber", key: "wardNumber", width: 12 },
      { header: "contactNo", key: "contactNo", width: 15 },
      { header: "email", key: "email", width: 25 },
      { header: "website", key: "website", width: 25 },
      { header: "status", key: "status", width: 18 },
      { header: "description", key: "description", width: 30 },
      { header: "capacity", key: "capacity", width: 10 },
      { header: "establishedDate", key: "establishedDate", width: 15 },
      { header: "inchargeName", key: "inchargeName", width: 20 },
      { header: "inchargeDesignation", key: "inchargeDesignation", width: 20 },
      { header: "inchargeContactNo", key: "inchargeContactNo", width: 15 },
      { header: "inchargeEmail", key: "inchargeEmail", width: 25 },
      { header: "inchargeDateOfBirth", key: "inchargeDateOfBirth", width: 15 },
      {
        header: "inchargeAppointedDate",
        key: "inchargeAppointedDate",
        width: 18,
      },
      { header: "inchargeIsActive", key: "inchargeIsActive", width: 15 },
    ];

    // Sample: institution with one incharge
    worksheet.addRow({
      name: "Govt Senior Secondary School",
      category: "SCHOOL",
      subcategory: "Senior Secondary",
      address: "Main Road, Sector 5",
      wardNumber: 3,
      contactNo: "0172-2740001",
      email: "school5@edu.gov.in",
      website: "",
      status: "ACTIVE",
      description: "Government school serving ward 3",
      capacity: 1200,
      establishedDate: "1985-06-15",
      inchargeName: "Dr. Ramesh Kumar",
      inchargeDesignation: "Principal",
      inchargeContactNo: "9876543210",
      inchargeEmail: "principal@school5.edu",
      inchargeDateOfBirth: "1970-03-15",
      inchargeAppointedDate: "2020-07-01",
      inchargeIsActive: "TRUE",
    });

    // Sample: same institution, second incharge (only name + wardNumber + incharge fields)
    worksheet.addRow({
      name: "Govt Senior Secondary School",
      category: "",
      subcategory: "",
      address: "",
      wardNumber: 3,
      contactNo: "",
      email: "",
      website: "",
      status: "",
      description: "",
      capacity: "",
      establishedDate: "",
      inchargeName: "Mrs. Sunita Devi",
      inchargeDesignation: "Vice Principal",
      inchargeContactNo: "9876543211",
      inchargeEmail: "",
      inchargeDateOfBirth: "1975-08-22",
      inchargeAppointedDate: "2021-01-15",
      inchargeIsActive: "TRUE",
    });

    // Sample: different institution
    worksheet.addRow({
      name: "Shiv Mandir",
      category: "TEMPLE",
      subcategory: "",
      address: "Temple Road, Old City",
      wardNumber: 1,
      contactNo: "",
      email: "",
      website: "",
      status: "ACTIVE",
      description: "Historic temple",
      capacity: 500,
      establishedDate: "1950-01-01",
      inchargeName: "Pt. Shyam Lal",
      inchargeDesignation: "Head Priest",
      inchargeContactNo: "9123456789",
      inchargeEmail: "",
      inchargeDateOfBirth: "1965-12-10",
      inchargeAppointedDate: "2000-01-01",
      inchargeIsActive: "TRUE",
    });

    // Data validations
    const categoryValues = INSTITUTION_CATEGORIES.map((c) => c.value).join(",");
    const statusValues = INSTITUTION_STATUSES.map((s) => s.value).join(",");
    const maxRows = 500;

    for (let i = 2; i <= maxRows; i++) {
      worksheet.getCell(`B${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${categoryValues}"`],
      };
      worksheet.getCell(`I${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${statusValues}"`],
      };
      worksheet.getCell(`S${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"TRUE,FALSE"'],
      };
    }

    // Header styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Highlight required columns
    ["A1", "B1", "D1", "E1"].forEach((cell) => {
      worksheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF3CD" },
      };
      worksheet.getCell(cell).note = "Required field";
    });

    // Instructions sheet
    const instrSheet = workbook.addWorksheet("Instructions");
    instrSheet.columns = [
      { header: "Field", key: "field", width: 25 },
      { header: "Required", key: "required", width: 10 },
      { header: "Description", key: "description", width: 70 },
    ];
    instrSheet.addRows([
      {
        field: "name",
        required: "YES",
        description: "Institution name. Used with wardNumber as upsert key.",
      },
      {
        field: "category",
        required: "YES (row 1)",
        description: `One of: ${categoryValues}`,
      },
      {
        field: "address",
        required: "YES (row 1)",
        description: "Full address of the institution",
      },
      {
        field: "wardNumber",
        required: "YES",
        description: "Ward number (must exist in system). Used for grouping.",
      },
      {
        field: "status",
        required: "No",
        description: `One of: ${statusValues}. Defaults to ACTIVE.`,
      },
      {
        field: "capacity",
        required: "No",
        description: "Numeric. Seating or capacity.",
      },
      {
        field: "establishedDate",
        required: "No",
        description: "Date in YYYY-MM-DD format",
      },
      { field: "---", required: "---", description: "--- INCHARGE FIELDS ---" },
      {
        field: "inchargeName",
        required: "No",
        description:
          "Name of the incharge. If provided, designation & contactNo are also required.",
      },
      {
        field: "inchargeDesignation",
        required: "If incharge",
        description: "E.g. Principal, Head Priest, Manager",
      },
      {
        field: "inchargeContactNo",
        required: "If incharge",
        description: "Phone number of the incharge",
      },
      {
        field: "inchargeDateOfBirth",
        required: "No",
        description: "YYYY-MM-DD format",
      },
      {
        field: "inchargeAppointedDate",
        required: "No",
        description: "YYYY-MM-DD format",
      },
      {
        field: "inchargeIsActive",
        required: "No",
        description: "TRUE or FALSE. Defaults to TRUE.",
      },
      { field: "---", required: "---", description: "--- MULTI-INCHARGE ---" },
      {
        field: "(note)",
        required: "",
        description:
          "To add multiple incharges to one institution, repeat the institution name + wardNumber on a new row with only incharge fields filled. See sample rows 2-3.",
      },
    ]);
    instrSheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "institutions_template.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Institutions">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              Institutions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schools, hospitals, temples, govt offices & more
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="institutions" action="read">
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
                Export
              </Button>
            </PermissionGate>
            <PermissionGate module="institutions" action="create">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-4 w-4" /> Bulk Upload
              </Button>
              <Link to="/institutions/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Add Institution
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* Bulk Upload Modal */}
        <BulkUploadModal
          open={isBulkImportOpen}
          onOpenChange={setIsBulkImportOpen}
          onUpload={bulkCreateInstitutions}
          title="Import Institutions"
          description={
            <div>
              <p>
                Upload an Excel or CSV file to import institutions with
                incharges. Records are upserted by Name + Ward Number.
              </p>
              <div className="mt-2 text-[10px] space-y-1 bg-muted p-2 rounded border">
                <p>
                  <strong>Required:</strong> name, category, address, wardNumber
                </p>
                <p>
                  <strong>Category:</strong>{" "}
                  {INSTITUTION_CATEGORIES.map((c) => c.value).join(", ")}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {INSTITUTION_STATUSES.map((s) => s.value).join(", ")}
                </p>
                <p>
                  <strong>Multi-incharge:</strong> Repeat name + wardNumber on
                  new row with only incharge fields
                </p>
                <p>
                  <strong>Date format:</strong> YYYY-MM-DD
                </p>
              </div>
            </div>
          }
          onDownloadSample={downloadSampleTemplate}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.active || 0}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.inactive || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      Inactive/Closed
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalIncharges || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Incharges</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <User className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {(stats?.totalCapacity || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Capacity
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Category Distribution */}
        {stats?.byCategory && stats.byCategory.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
                {stats.byCategory.map((c: any) => {
                  const info = getCategoryInfo(c.category);
                  return (
                    <div
                      key={c.category}
                      className={`text-center p-3 rounded-lg border transition-colors cursor-pointer ${
                        categoryFilter === c.category
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        setCategoryFilter(
                          categoryFilter === c.category ? "all" : c.category,
                        );
                        setPage(1);
                      }}
                    >
                      <span className="text-2xl">{info.icon}</span>
                      <p className="text-lg font-bold mt-1">{c.count}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight truncate">
                        {info.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, address, contact..."
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
                  value={wardFilter}
                  onValueChange={(v) => {
                    setWardFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
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
                  value={categoryFilter}
                  onValueChange={(v) => {
                    setCategoryFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(categoryGroups).map(([group, cats]) => (
                      <div key={group}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {group}
                        </div>
                        {cats.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.icon} {c.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>

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
                    {INSTITUTION_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(search ||
                  wardFilter !== "all" ||
                  statusFilter !== "all" ||
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
                    <TableHead>Institution</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-center">Incharges</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : institutions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No institutions found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    institutions.map((inst: any) => {
                      const catInfo = getCategoryInfo(inst.category);
                      const statusInfo = getStatusInfo(inst.status);
                      const primaryIncharge = inst.incharges?.[0];
                      return (
                        <TableRow key={inst.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Link to={`/institutions/${inst.id}`}>
                              <div className="cursor-pointer">
                                <p className="font-medium text-primary hover:underline">
                                  {inst.name}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {inst.address?.slice(0, 40)}
                                  {(inst.address?.length || 0) > 40
                                    ? "..."
                                    : ""}
                                </p>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-xs gap-1"
                            >
                              <span>{catInfo.icon}</span>
                              {catInfo.label}
                            </Badge>
                            {inst.subcategory && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {inst.subcategory}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link to={`/wards/${inst.ward?.id}`}>
                              <span className="text-sm text-primary hover:underline cursor-pointer">
                                #{inst.ward?.wardNumber} {inst.ward?.name}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            {inst.contactNo ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {inst.contactNo}
                              </div>
                            ) : primaryIncharge ? (
                              <div className="text-sm">
                                <p className="text-xs">
                                  {primaryIncharge.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {primaryIncharge.contactNo}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {inst._count?.incharges || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] ${statusInfo.color}`}
                            >
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/institutions/${inst.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <PermissionGate
                                module="institutions"
                                action="update"
                              >
                                <Link to={`/institutions/${inst.id}/edit`}>
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
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} total)
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
