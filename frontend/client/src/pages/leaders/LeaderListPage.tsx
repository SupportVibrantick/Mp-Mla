import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useLeaders,
  useLeaderStats,
  useDeleteLeader,
  useBulkCreateLeaders,
  getCategoryInfo,
  LEADER_CATEGORIES,
  RELATIONS,
  INFLUENCES,
} from "@/hooks/useLeaders";
import { useWards } from "@/hooks/useWards";
import { toast } from "sonner";
import * as xlsx from "xlsx";
import ExcelJS from "exceljs";
import api from "@/lib/api";
import { BulkUploadModal } from "@/components/shared/BulkUploadModal";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { MainLayout } from "@/components/layout/MainLayout";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Cake,
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  PartyPopper,
  Star,
  Shield,
  UserCheck,
  FileUp,
  Download,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

const RELATION_COLORS: Record<string, string> = {
  Supporter:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Alliance: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Opposition: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Other:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

const INFLUENCE_DOTS: Record<string, { color: string; label: string }> = {
  High: { color: "text-red-500", label: "●●●" },
  Medium: { color: "text-amber-500", label: "●●○" },
  Low: { color: "text-green-500", label: "●○○" },
};

export default function LeaderListPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");
  const [relationFilter, setRelationFilter] = useState("all");
  const [influenceFilter, setInfluenceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 25 };
    if (search) p.search = search;
    if (categoryFilter !== "all") p.category = categoryFilter;
    if (wardFilter !== "all") p.wardId = wardFilter;
    if (relationFilter !== "all") p.relation = relationFilter;
    if (influenceFilter !== "all") p.influence = influenceFilter;
    return p;
  }, [
    search,
    categoryFilter,
    wardFilter,
    relationFilter,
    influenceFilter,
    page,
  ]);

  const { data: res, isLoading } = useLeaders(params);
  const { data: statsRes } = useLeaderStats();
  const { data: wardsRes } = useWards({ limit: 100 });
  const deleteMut = useDeleteLeader();
  const { mutateAsync: bulkCreateLeaders } = useBulkCreateLeaders();

  const leaders = res?.data || [];
  const pagination = res?.pagination;
  const stats = statsRes?.data;
  const wards = wardsRes?.data?.wards || [];

  const topCategories = (stats?.byCategory || []).slice(0, 6);
  const maxCatCount =
    topCategories.length > 0
      ? Math.max(...topCategories.map((c: any) => c.count))
      : 1;

  // ── Export ──
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportParams: Record<string, any> = {};
      if (categoryFilter !== "all") exportParams.category = categoryFilter;
      if (wardFilter !== "all") exportParams.wardId = wardFilter;

      const response = await api.get("/admin/leaders/export", {
        params: exportParams,
      });
      const data = response.data?.data;
      if (data && data.length > 0) {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Leaders");
        xlsx.writeFile(wb, "leaders_export.xlsx");
        toast.success(`Exported ${data.length} leaders successfully.`);
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export leaders.");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Download Sample Template ──
  const downloadSampleTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Leaders");

    worksheet.columns = [
      { header: "name", key: "name", width: 25 },
      { header: "category", key: "category", width: 20 },
      { header: "designation", key: "designation", width: 20 },
      { header: "organization", key: "organization", width: 20 },
      { header: "partyName", key: "partyName", width: 18 },
      { header: "dateOfBirth", key: "dateOfBirth", width: 15 },
      { header: "gender", key: "gender", width: 10 },
      { header: "address", key: "address", width: 30 },
      { header: "wardNumber", key: "wardNumber", width: 12 },
      { header: "phone", key: "phone", width: 15 },
      { header: "altPhone", key: "altPhone", width: 15 },
      { header: "email", key: "email", width: 25 },
      { header: "whatsapp", key: "whatsapp", width: 15 },
      { header: "facebookUrl", key: "facebookUrl", width: 25 },
      { header: "twitterUrl", key: "twitterUrl", width: 25 },
      { header: "instagramUrl", key: "instagramUrl", width: 25 },
      { header: "relation", key: "relation", width: 15 },
      { header: "influence", key: "influence", width: 12 },
      { header: "notes", key: "notes", width: 30 },
      { header: "tags", key: "tags", width: 25 },
      { header: "isActive", key: "isActive", width: 10 },
    ];

    // Sample rows
    worksheet.addRow({
      name: "Rajesh Kumar",
      category: "PARTY_LEADER",
      designation: "Block President",
      organization: "BJP",
      partyName: "BJP",
      dateOfBirth: "1975-06-15",
      gender: "Male",
      address: "123 Main Road, Ward 5",
      wardNumber: 5,
      phone: "9876543210",
      altPhone: "9876543211",
      email: "rajesh@example.com",
      whatsapp: "9876543210",
      facebookUrl: "",
      twitterUrl: "",
      instagramUrl: "",
      relation: "Supporter",
      influence: "High",
      notes: "Key party worker since 2010",
      tags: "party, senior",
      isActive: "TRUE",
    });

    worksheet.addRow({
      name: "Meena Devi",
      category: "WOMEN_LEADER",
      designation: "President",
      organization: "Mahila Mandal",
      partyName: "",
      dateOfBirth: "1982-03-22",
      gender: "Female",
      address: "45 Gandhi Nagar",
      wardNumber: 3,
      phone: "9123456789",
      altPhone: "",
      email: "meena@example.com",
      whatsapp: "9123456789",
      facebookUrl: "",
      twitterUrl: "",
      instagramUrl: "",
      relation: "Alliance",
      influence: "Medium",
      notes: "",
      tags: "women, community",
      isActive: "TRUE",
    });

    // Data validations
    const categoryValues = LEADER_CATEGORIES.map((c) => c.value).join(",");
    const maxRows = 500;

    for (let i = 2; i <= maxRows; i++) {
      // Category dropdown
      worksheet.getCell(`B${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${categoryValues}"`],
      };
      // Gender dropdown
      worksheet.getCell(`G${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Male,Female,Other"'],
      };
      // Relation dropdown
      worksheet.getCell(`Q${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Supporter,Neutral,Alliance,Opposition,Other"'],
      };
      // Influence dropdown
      worksheet.getCell(`R${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"High,Medium,Low"'],
      };
      // isActive dropdown
      worksheet.getCell(`U${i}`).dataValidation = {
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

    // Color required columns
    ["A1", "B1", "F1"].forEach((cell) => {
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
      { header: "Field", key: "field", width: 20 },
      { header: "Required", key: "required", width: 10 },
      { header: "Description", key: "description", width: 60 },
    ];
    instrSheet.addRows([
      {
        field: "name",
        required: "YES",
        description: "Full name of the leader",
      },
      {
        field: "category",
        required: "YES",
        description: `One of: ${categoryValues}`,
      },
      {
        field: "dateOfBirth",
        required: "YES",
        description: "Date in YYYY-MM-DD format",
      },
      {
        field: "wardNumber",
        required: "No",
        description: "Ward number (must exist in system)",
      },
      {
        field: "relation",
        required: "No",
        description: "Supporter, Neutral, Alliance, Opposition, Other",
      },
      { field: "influence", required: "No", description: "High, Medium, Low" },
      { field: "gender", required: "No", description: "Male, Female, Other" },
      { field: "tags", required: "No", description: "Comma-separated tags" },
      {
        field: "isActive",
        required: "No",
        description: "TRUE or FALSE (defaults to TRUE)",
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
    a.download = "leaders_template.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Leaders">
      <div className="space-y-6">
        {/* ─── Header ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" /> Leaders
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Constituency leaders, VIPs & key persons with birthday tracking
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="leaders" action="read">
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
            <Link to="/leaders/birthdays">
              <Button variant="outline" className="gap-2">
                <Cake className="h-4 w-4 text-pink-500" /> Birthdays
                {stats?.todayBirthdays ? (
                  <Badge className="ml-1 bg-pink-600 text-white text-[10px] h-5 min-w-5 flex items-center justify-center">
                    {stats.todayBirthdays}
                  </Badge>
                ) : null}
              </Button>
            </Link>
            <PermissionGate module="leaders" action="create">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-4 w-4" /> Bulk Upload
              </Button>
              <Link to="/leaders/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Add Leader
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* ─── Bulk Upload Modal ───────────────────────── */}
        <BulkUploadModal
          open={isBulkImportOpen}
          onOpenChange={setIsBulkImportOpen}
          onUpload={bulkCreateLeaders}
          title="Import Leaders"
          description={
            <div>
              <p>
                Upload an Excel or CSV file to import multiple leaders. Records
                are upserted by Name+Phone or Email.
              </p>
              <div className="mt-2 text-[10px] space-y-1 bg-muted p-2 rounded border">
                <p>
                  <strong>Required:</strong> name, category, dateOfBirth
                </p>
                <p>
                  <strong>Category:</strong>{" "}
                  {LEADER_CATEGORIES.map((c) => c.value).join(", ")}
                </p>
                <p>
                  <strong>Date format:</strong> YYYY-MM-DD
                </p>
                <p>
                  <strong>Relation:</strong> Supporter, Neutral, Alliance,
                  Opposition, Other
                </p>
                <p>
                  <strong>Influence:</strong> High, Medium, Low
                </p>
                <p>
                  <strong>isActive:</strong> TRUE, FALSE
                </p>
              </div>
            </div>
          }
          onDownloadSample={downloadSampleTemplate}
        />

        {/* ─── Stats Row ───────────────────────────────── */}
        {stats && (
          <div className=" md:grid-cols-3  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              {
                label: "Total Leaders",
                value: stats.total,
                Icon: Users,
                color: "#6366f1",
              },
              {
                label: "Active",
                value: stats.active,
                Icon: UserCheck,
                color: "#22c55e",
              },
              {
                label: "Today's Birthdays",
                value: stats.todayBirthdays,
                Icon: PartyPopper,
                color: "#ec4899",
                highlight: stats.todayBirthdays > 0,
              },
              {
                label: "High Influence",
                value:
                  stats.byInfluence?.find((i: any) => i.influence === "High")
                    ?.count || 0,
                Icon: Star,
                color: "#ef4444",
              },
              {
                label: "Supporters",
                value:
                  stats.byRelation?.find((r: any) => r.relation === "Supporter")
                    ?.count || 0,
                Icon: Shield,
                color: "#3b82f6",
              },
            ].map((s, i) => (
              <Card
                key={i}
                className={
                  s.highlight
                    ? "border-pink-300 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/20"
                    : ""
                }
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${s.color}18` }}
                  >
                    <s.Icon className="h-5 w-5" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ─── Category Breakdown ──────────────────────── */}
        {topCategories.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {topCategories.map((c: any) => {
                  const info = getCategoryInfo(c.category);
                  const CategoryIcon = info.icon;
                  const pct = Math.round((c.count / maxCatCount) * 100);
                  return (
                    <button
                      key={c.category}
                      onClick={() => {
                        setCategoryFilter(
                          categoryFilter === c.category ? "all" : c.category,
                        );
                        setPage(1);
                      }}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                        categoryFilter === c.category
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <CategoryIcon className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate">
                            {info.label}
                          </span>
                          <span className="text-xs font-bold ml-2">
                            {c.count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Filters ─────────────────────────────────── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, email, designation..."
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
                    {LEADER_CATEGORIES.map((c) => {
                      const CIcon = c.icon;
                      return (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2">
                            <CIcon className="h-3.5 w-3.5" /> {c.label}
                          </span>
                        </SelectItem>
                      );
                    })}
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
                <Select
                  value={relationFilter}
                  onValueChange={(v) => {
                    setRelationFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Relation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Relations</SelectItem>
                    {RELATIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={influenceFilter}
                  onValueChange={(v) => {
                    setInfluenceFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Influence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {INFLUENCES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(categoryFilter !== "all" ||
                  wardFilter !== "all" ||
                  relationFilter !== "all" ||
                  influenceFilter !== "all" ||
                  search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setWardFilter("all");
                      setRelationFilter("all");
                      setInfluenceFilter("all");
                      setPage(1);
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Table ───────────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Leader</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Relation</TableHead>
                    <TableHead className="text-center">Influence</TableHead>
                    <TableHead>Birthday</TableHead>
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
                  ) : leaders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-16 text-muted-foreground"
                      >
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No leaders found</p>
                        <p className="text-xs mt-1">
                          Adjust filters or add a new leader
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaders.map((l: any) => {
                      const cInfo = getCategoryInfo(l.category);
                      const CategoryIcon = cInfo.icon;

                      const infDots = INFLUENCE_DOTS[l.influence] || null;
                      const relColor =
                        RELATION_COLORS[l.relation] || RELATION_COLORS.Other;
                      return (
                        <TableRow
                          key={l.id}
                          className={`hover:bg-muted/50 transition-colors ${
                            l.isBirthdayToday
                              ? "bg-pink-50/50 dark:bg-pink-950/10"
                              : ""
                          } ${!l.isActive ? "opacity-50" : ""}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                {l.photoUrl ? (
                                  <img
                                    src={l.photoUrl}
                                    alt={l.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                                    {l.name
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .slice(0, 2)}
                                  </div>
                                )}
                                {l.isBirthdayToday && (
                                  <span className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 shadow-sm border border-pink-200 dark:border-pink-700">
                                    <Cake className="h-3 w-3 text-pink-500" />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <Link to={`/leaders/${l.id}`}>
                                  <p className="font-semibold text-sm hover:text-primary cursor-pointer truncate">
                                    {l.name}
                                  </p>
                                </Link>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {[l.designation, l.organization, l.partyName]
                                    .filter(Boolean)
                                    .join(" • ") || "—"}
                                </p>
                                {l.phone && (
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-2.5 w-2.5" />
                                    {l.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-[10px] gap-1"
                            >
                              <CategoryIcon className="h-3 w-3" />
                              {cInfo.label}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-sm">
                            {l.ward ? (
                              <span>
                                #{l.ward.wardNumber} {l.ward.name}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {l.relation ? (
                              <Badge className={`text-[10px] ${relColor}`}>
                                {l.relation}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            {infDots ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span
                                      className={`font-mono text-sm tracking-widest ${infDots.color}`}
                                    >
                                      {infDots.label}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {l.influence} Influence
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <div>
                              <p className="text-xs">
                                {format(new Date(l.dateOfBirth), "dd MMM yyyy")}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Age {l.age}
                              </p>
                              {l.isBirthdayToday ? (
                                <Badge className="text-[9px] bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 mt-0.5 gap-0.5">
                                  <Cake className="h-2.5 w-2.5" /> Today!
                                </Badge>
                              ) : l.daysUntilBirthday <= 7 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] mt-0.5"
                                >
                                  {l.daysUntilBirthday === 1
                                    ? "Tomorrow"
                                    : `In ${l.daysUntilBirthday}d`}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {l.whatsapp && (
                                <a
                                  href={`https://wa.me/${l.whatsapp}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                              <Link to={`/leaders/${l.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <PermissionGate module="leaders" action="update">
                                <Link to={`/leaders/${l.id}/edit`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </PermissionGate>
                              <PermissionGate module="leaders" action="delete">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Remove &quot;{l.name}&quot;?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        All greeting history will be deleted.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive"
                                        onClick={() => deleteMut.mutate(l.id)}
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {pagination.total} leaders • Page {pagination.page}/
                  {pagination.totalPages}
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
