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
  // INFLUENCES,
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

// const INFLUENCE_DOTS: Record<string, { color: string; label: string }> = {
//   High: { color: "text-red-500", label: "●●●" },
//   Medium: { color: "text-amber-500", label: "●●○" },
//   Low: { color: "text-green-500", label: "●○○" },
// };


export default function LeaderListPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [wardFilter, setWardFilter] = useState("all");
  const [relationFilter, setRelationFilter] = useState("all");
  // const [influenceFilter, setInfluenceFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 25 };
    if (search) p.search = search;
    if (categoryFilter !== "all") p.category = categoryFilter;
    if (wardFilter !== "all") p.wardId = wardFilter;
    if (relationFilter !== "all") p.relation = relationFilter;
    // if (influenceFilter !== "all") p.influence = influenceFilter;
    return p;
  }, [
    search,
    categoryFilter,
    wardFilter,
    relationFilter,
    // influenceFilter,
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

  const allCategories = stats?.byCategory || [];
  const maxCatCount =
    allCategories.length > 0
      ? Math.max(...allCategories.map((c: any) => c.count))
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
      toast.error("failed to export local representatives.");
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
      // { header: "influence", key: "influence", width: 12 },
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
      // influence: "High",
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
      // influence: "Medium",
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
      // formulae: ['"High,Medium,Low"'],
      // };

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
        description: "Full name of the local representative",
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
      { field: "relation", required: "No", description: "Supporter, Neutral, Alliance, Opposition, Other" },
      // { field: "influence", required: "No", description: "High, Medium, Low" },
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
    <MainLayout title="Local Representatives">
      <div className="space-y-6">
        {/* ─── Header ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Users className="h-7 w-7 text-primary" /> Local Representatives
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Constituency local representatives, VIPs & key persons with birthday tracking
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <PermissionGate module="leaders" action="read">
              <Button
                variant="outline"
                className="gap-2 text-xs border-border/60 bg-card"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Export
              </Button>
            </PermissionGate>
            <Link to="/leaders/birthdays">
              <Button variant="outline" className="gap-2 text-xs border-border/60 bg-card hover:bg-pink-50/10 hover:text-pink-600 transition-colors">
                <Cake className="h-3.5 w-3.5 text-pink-500" /> Birthdays
                {stats?.todayBirthdays ? (
                  <Badge className="ml-1 bg-pink-600 text-white text-[10px] h-5 min-w-5 flex items-center justify-center font-bold">
                    {stats.todayBirthdays}
                  </Badge>
                ) : null}
              </Button>
            </Link>
            <PermissionGate module="leaders" action="create">
              <Button
                variant="outline"
                className="gap-2 text-xs border-border/60 bg-card"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-3.5 w-3.5" /> Bulk Upload
              </Button>
              <Link to="/leaders/new">
                <Button className="gap-2 text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90">
                  <Plus className="h-3.5 w-3.5" /> Add Representative
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
          title="Import Local Representatives"
          description={
            <div>
              <p className="text-xs text-muted-foreground">
                Upload an Excel or CSV file to import multiple local representatives. Records
                are upserted by Name+Phone or Email.
              </p>
            </div>
          }
          onDownloadSample={downloadSampleTemplate}
        />

        {/* ─── Stats Row ───────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Representatives",
                value: stats.total,
                Icon: Users,
                color: "#6366f1",
              },
              {
                label: "Active Accounts",
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
                label: "Key Supporters",
                value:
                  stats.byRelation?.find((r: any) => r.relation === "Supporter")
                    ?.count || 0,
                Icon: Shield,
                color: "#3b82f6",
              },
            ].map((s, i) => (
              <Card
                key={i}
                className={`transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border bg-card rounded-2xl ${
                  s.highlight
                    ? "border-pink-300 dark:border-pink-800/80 bg-pink-500/5 hover:border-pink-400"
                    : "border-border/50 hover:border-primary/25"
                }`}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex justify-between items-center">
                    <div
                      className="p-2.5 rounded-xl border flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${s.color}15`, borderColor: `${s.color}25` }}
                    >
                      <s.Icon className="h-4 w-4" style={{ color: s.color }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                      {s.label}
                    </p>
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-1 font-mono">
                      {s.value}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ─── Category Breakdown ──────────────────────── */}
        {allCategories.length > 0 && (
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-3 px-4 sm:px-6 border-b border-border/30 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Representative Breakdown ({allCategories.length} Categories • {allCategories.reduce((acc: number, curr: any) => acc + curr.count, 0)} Total)
              </CardTitle>
              {categoryFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCategoryFilter("all")}
                  className="h-6 text-[11px] px-2 font-semibold text-muted-foreground hover:text-foreground"
                >
                  Clear Filter
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {allCategories.map((c: any) => {
                  const info = getCategoryInfo(c.category);
                  const CategoryIcon = info.icon;
                  const pct = Math.round((c.count / maxCatCount) * 100);
                  const isSelected = categoryFilter === c.category;
                  return (
                    <button
                      key={c.category}
                      onClick={() => {
                        setCategoryFilter(
                          isSelected ? "all" : c.category,
                        );
                        setPage(1);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-inner"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <CategoryIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-foreground truncate" title={info.label}>
                            {info.label}
                          </span>
                          <span className="text-xs font-extrabold text-foreground ml-2">
                            {c.count}
                          </span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
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
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
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
                  className="pl-9 bg-background/50 border-muted-foreground/20 rounded-xl"
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
                  <SelectTrigger className="w-40 bg-background/50 border-muted-foreground/20 rounded-xl text-xs">
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
                  <SelectTrigger className="w-36 bg-background/50 border-muted-foreground/20 rounded-xl text-xs">
                    <Filter className="h-3.5 w-3.5 mr-1 opacity-50" />
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
                  <SelectTrigger className="w-32 bg-background/50 border-muted-foreground/20 rounded-xl text-xs">
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
                {(categoryFilter !== "all" ||
                  wardFilter !== "all" ||
                  relationFilter !== "all" ||
                  search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("all");
                      setWardFilter("all");
                      setRelationFilter("all");
                      setPage(1);
                    }}
                    className="text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl h-9"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Table ───────────────────────────────────── */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20 w-[280px]">Local Representative</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Category</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Relation</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Birthday</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j} className="py-4 px-4">
                            <Skeleton className="h-4 w-full rounded" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : leaders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-20 text-muted-foreground text-xs font-semibold"
                      >
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-sm">No local representatives found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adjust filters or add a new local representative
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaders.map((l: any) => {
                      const cInfo = getCategoryInfo(l.category);
                      const CategoryIcon = cInfo.icon;
                      const relColor =
                        RELATION_COLORS[l.relation] || RELATION_COLORS.Other;
                      return (
                        <TableRow
                          key={l.id}
                          className={`hover:bg-muted/10 transition-colors border-b border-border/40 ${
                            l.isBirthdayToday
                              ? "bg-pink-500/5 dark:bg-pink-500/5"
                              : ""
                          } ${!l.isActive ? "opacity-50" : ""}`}
                        >
                          <TableCell className="py-4 px-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="relative flex-shrink-0">
                                {l.photoUrl ? (
                                  <img
                                    src={l.photoUrl}
                                    alt={l.name}
                                    className="w-10 h-10 rounded-full object-cover border border-border/40 shadow-sm"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold border border-primary/20">
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
                                  <p className="font-bold text-xs sm:text-sm text-foreground hover:text-primary cursor-pointer truncate">
                                    {l.name}
                                  </p>
                                </Link>
                                <p className="text-[10px] text-muted-foreground font-semibold truncate mt-0.5">
                                  {[l.designation, l.organization, l.partyName]
                                    .filter(Boolean)
                                    .join(" • ") || "—"}
                                </p>
                                {l.phone && (
                                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                                    <Phone className="h-2.5 w-2.5" />
                                    {l.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-4 px-4 align-middle">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold gap-1"
                            >
                              <CategoryIcon className="h-3 w-3" />
                              {cInfo.label}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-foreground">
                            {l.ward ? (
                              <span>
                                #{l.ward.wardNumber} {l.ward.name}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-4 px-4 align-middle">
                            {l.relation ? (
                              <Badge className={`text-[10px] font-bold border-none ${relColor}`}>
                                {l.relation}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-4 px-4 align-middle">
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                {format(new Date(l.dateOfBirth), "dd MMM yyyy")}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                Age {l.age}
                              </p>
                              {l.isBirthdayToday ? (
                                <Badge className="text-[9px] font-bold border-none bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 mt-1 gap-0.5">
                                  <Cake className="h-2.5 w-2.5" /> Today!
                                </Badge>
                              ) : l.daysUntilBirthday <= 7 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-bold mt-1"
                                >
                                  {l.daysUntilBirthday === 1
                                    ? "Tomorrow"
                                    : `In ${l.daysUntilBirthday}d`}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell className="text-right py-4 px-4 align-middle">
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
                                    className="h-8 w-8 text-green-600 rounded-full hover:bg-green-500/10"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                              <Link to={`/leaders/${l.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <PermissionGate module="leaders" action="update">
                                <Link to={`/leaders/${l.id}/edit`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
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
                                      className="h-8 w-8 text-destructive rounded-full hover:bg-destructive/10"
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground">
                  {pagination.total} representatives • Page {pagination.page}/
                  {pagination.totalPages}
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
      </div>
    </MainLayout>
  );
}
