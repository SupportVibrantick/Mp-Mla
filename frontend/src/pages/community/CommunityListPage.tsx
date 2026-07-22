import { useState, useMemo } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  useCommunityGroups,
  useCommunityGroupStats,
  getTypeInfo,
  COMMUNITY_TYPES,
  useBulkCreateCommunityGroups,
} from "@/hooks/useCommunityGroups";
import { useWards } from "@/hooks/useWards";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import ExcelJS from "exceljs";
import api from "@/lib/api";
import { BulkUploadModal } from "@/components/shared/BulkUploadModal";
import { toast } from "sonner";
import * as xlsx from "xlsx";
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
  Users,
  Plus,
  Search,
  Eye,
  Edit,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  MapPin,
  TrendingUp,
  FileDown,
  FileUp,
  Phone,
} from "lucide-react";

export default function CommunityListPage() {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { mutateAsync: bulkCreateGroups } = useBulkCreateCommunityGroups();

  const queryParams = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (wardFilter !== "all") p.wardId = wardFilter;
    if (typeFilter !== "all") p.type = typeFilter;
    if (activeFilter !== "all") p.isActive = activeFilter;
    return p;
  }, [search, wardFilter, typeFilter, activeFilter, page]);

  const { data: groupsRes, isLoading } = useCommunityGroups(queryParams);
  const { data: statsRes } = useCommunityGroupStats(
    wardFilter !== "all" ? wardFilter : undefined,
  );
  const { data: wardsRes } = useWards({ limit: 100 });

  const groups = groupsRes?.data || [];
  const pagination = groupsRes?.pagination;
  const stats = statsRes?.data;
  const wards = wardsRes?.data?.wards || [];

  const reset = () => {
    setSearch("");
    setWardFilter("all");
    setTypeFilter("all");
    setActiveFilter("all");
    setPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/admin/community-groups/export/all");
      const data = response.data?.data;
      if (data && data.length > 0) {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Community Groups");
        xlsx.writeFile(wb, "community_groups_export.xlsx");
        toast.success("Community groups exported successfully.");
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export community groups data.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSampleTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Community Groups");

    const columns = [
      { header: "name", key: "name", width: 30 },
      { header: "type", key: "type", width: 20 },
      { header: "wardNumber", key: "wardNumber", width: 15 },
      { header: "address", key: "address", width: 30 },
      { header: "description", key: "description", width: 40 },
      { header: "memberCount", key: "memberCount", width: 15 },
      { header: "maleMembers", key: "maleMembers", width: 15 },
      { header: "femaleMembers", key: "femaleMembers", width: 15 },
      { header: "headName", key: "headName", width: 25 },
      { header: "headPhone", key: "headPhone", width: 20 },
      { header: "headEmail", key: "headEmail", width: 30 },
      { header: "headDesignation", key: "headDesignation", width: 20 },
      { header: "registrationNo", key: "registrationNo", width: 20 },
      { header: "isActive", key: "isActive", width: 15 },
    ];

    worksheet.columns = columns;

    worksheet.addRow({
      name: "Sample Market Association",
      type: "MARKET",
      wardNumber: 1,
      address: "Main Market Area",
      description: "Association of local traders",
      memberCount: 150,
      maleMembers: 100,
      femaleMembers: 50,
      headName: "John Trader",
      headPhone: "9876543210",
      headEmail: "head@market.org",
      headDesignation: "President",
      registrationNo: "MK/2023/001",
      isActive: "TRUE",
    });

    const types = COMMUNITY_TYPES.map((t) => t.value);

    for (let i = 2; i <= 51; i++) {
      worksheet.getCell(`B${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${types.join(",")}"`],
      };
      worksheet.getCell(`N${i}`).dataValidation = {
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
    a.download = "community_groups_template.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Community Groups">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Users className="h-7 w-7 text-primary" />
              Community Groups
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Manage RWAs, clubs, associations, and community organizations
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end w-full sm:w-auto">
            <PermissionGate module="community_groups" action="read">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto h-9 text-xs font-semibold hover:bg-muted border-border/60 justify-center"
                onClick={handleExport}
                disabled={isExporting}
              >
                <FileDown className="h-4 w-4" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>
            </PermissionGate>

            <PermissionGate module="community_groups" action="create">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto h-9 text-xs font-semibold hover:bg-muted border-border/60 justify-center"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                Bulk Upload
              </Button>
            </PermissionGate>

            <PermissionGate module="community_groups" action="create">
              <Link to="/community/new" className="w-full sm:w-auto">
                <Button className="gap-2 w-full sm:w-auto justify-center bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none">
                  <Plus className="h-4 w-4" />
                  Add Group
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        <BulkUploadModal
          open={isBulkImportOpen}
          onOpenChange={setIsBulkImportOpen}
          onUpload={bulkCreateGroups}
          title="Import Community Groups"
          description={
            <div>
              <p className="text-xs text-muted-foreground">
                Upload an Excel or CSV file to import multiple community groups.
                Records are upserted by Name and Ward.
              </p>
            </div>
          }
          onDownloadSample={downloadSampleTemplate}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))
          ) : (
            <>
              {[
                {
                  label: "Active Groups",
                  value: stats?.total || 0,
                  Icon: Users,
                  color: "text-indigo-500",
                  bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
                  borderColor: "border-indigo-100 dark:border-indigo-950/50",
                },
                {
                  label: "Total Members",
                  value: stats?.totalMembers || 0,
                  Icon: UserCheck,
                  color: "text-emerald-500",
                  bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
                  borderColor: "border-emerald-100 dark:border-emerald-950/50",
                },
                {
                  label: "Male Members",
                  value: stats?.totalMale || 0,
                  textIcon: "M",
                  color: "text-blue-500",
                  bgColor: "bg-blue-50 dark:bg-blue-950/30",
                  borderColor: "border-blue-100 dark:border-blue-950/50",
                },
                {
                  label: "Female Members",
                  value: stats?.totalFemale || 0,
                  textIcon: "F",
                  color: "text-pink-500",
                  bgColor: "bg-pink-50 dark:bg-pink-950/30",
                  borderColor: "border-pink-100 dark:border-pink-950/50",
                },
                {
                  label: "Inactive Groups",
                  value: stats?.inactive || 0,
                  Icon: UserX,
                  color: "text-rose-500",
                  bgColor: "bg-rose-50 dark:bg-rose-950/30",
                  borderColor: "border-rose-100 dark:border-rose-950/50",
                },
              ].map((s, i) => (
                <Card key={i} className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl">
                  <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                    <div className="flex justify-between items-center">
                      <div className={cn("p-2 rounded-xl border", s.bgColor, s.borderColor)}>
                        {s.Icon ? (
                          <s.Icon className={cn("h-4 w-4", s.color)} />
                        ) : (
                          <span className={cn("text-sm font-extrabold leading-none", s.color)}>{s.textIcon}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                        {s.label}
                      </p>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                        {s.value.toLocaleString()}
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Type-wise Distribution */}
        {stats?.byType && stats.byType.length > 0 && (
          <Card className="border border-border/50 bg-card shadow-sm rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                Community Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {stats.byType.map((t: any) => {
                  const info = getTypeInfo(t.type);
                  const Icon = info.icon;
                  const isActive = typeFilter === t.type;

                  const colors: Record<
                    string,
                    { bg: string; text: string; light: string; border: string }
                  > = {
                    MARKET: {
                      bg: "bg-blue-500",
                      text: "text-blue-600",
                      light: "bg-blue-50 dark:bg-blue-950/20",
                      border: "border-blue-100 dark:border-blue-950/40",
                    },
                    SLUM: {
                      bg: "bg-amber-500",
                      text: "text-amber-600",
                      light: "bg-amber-50 dark:bg-amber-950/20",
                      border: "border-amber-100 dark:border-amber-950/40",
                    },
                    SPORTS_TEAM: {
                      bg: "bg-orange-500",
                      text: "text-orange-600",
                      light: "bg-orange-50 dark:bg-orange-950/20",
                      border: "border-orange-100 dark:border-orange-950/40",
                    },
                    CLUB: {
                      bg: "bg-indigo-500",
                      text: "text-indigo-600",
                      light: "bg-indigo-50 dark:bg-indigo-950/20",
                      border: "border-indigo-100 dark:border-indigo-950/40",
                    },
                    RWA: {
                      bg: "bg-violet-500",
                      text: "text-violet-600",
                      light: "bg-violet-50 dark:bg-violet-950/20",
                      border: "border-violet-100 dark:border-violet-950/40",
                    },
                    SENIOR_CITIZEN: {
                      bg: "bg-emerald-500",
                      text: "text-emerald-600",
                      light: "bg-emerald-50 dark:bg-emerald-950/20",
                      border: "border-emerald-100 dark:border-emerald-950/40",
                    },
                    BUDDHIJEEVI: {
                      bg: "bg-sky-500",
                      text: "text-sky-600",
                      light: "bg-sky-50 dark:bg-sky-950/20",
                      border: "border-sky-100 dark:border-sky-950/40",
                    },
                    WOMEN_GROUP: {
                      bg: "bg-pink-500",
                      text: "text-pink-600",
                      light: "bg-pink-50 dark:bg-pink-950/20",
                      border: "border-pink-100 dark:border-pink-950/40",
                    },
                    YOUTH_GROUP: {
                      bg: "bg-cyan-500",
                      text: "text-cyan-600",
                      light: "bg-cyan-50 dark:bg-cyan-950/20",
                      border: "border-cyan-100 dark:border-cyan-950/40",
                    },
                    CULTURAL_ORG: {
                      bg: "bg-rose-500",
                      text: "text-rose-600",
                      light: "bg-rose-50 dark:bg-rose-950/20",
                      border: "border-rose-100 dark:border-rose-950/40",
                    },
                    NGO: {
                      bg: "bg-teal-500",
                      text: "text-teal-600",
                      light: "bg-teal-50 dark:bg-teal-950/20",
                      border: "border-teal-100 dark:border-teal-950/40",
                    },
                    FESTIVAL_COMMITTEE: {
                      bg: "bg-yellow-500",
                      text: "text-yellow-600",
                      light: "bg-yellow-50 dark:bg-yellow-950/20",
                      border: "border-yellow-100 dark:border-yellow-950/40",
                    },
                    TRADE_UNION: {
                      bg: "bg-slate-500",
                      text: "text-slate-600",
                      light: "bg-slate-50 dark:bg-slate-950/20",
                      border: "border-slate-100 dark:border-slate-950/40",
                    },
                    OTHER: {
                      bg: "bg-gray-400",
                      text: "text-gray-500",
                      light: "bg-gray-50 dark:bg-gray-950/20",
                      border: "border-gray-100 dark:border-gray-950/40",
                    },
                  };

                  const theme = colors[t.type] || colors.OTHER;

                  return (
                    <div
                      key={t.type}
                      className={cn(
                        "text-center p-3 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm flex flex-col items-center justify-between min-h-[110px]",
                        isActive
                          ? "border-primary bg-primary/5 shadow-md -translate-y-0.5"
                          : "hover:bg-muted/40 border-border/50 hover:-translate-y-0.5"
                      )}
                      onClick={() => {
                        setTypeFilter(isActive ? "all" : t.type);
                        setPage(1);
                      }}
                    >
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border shadow-inner shrink-0", theme.light, theme.border)}>
                        <Icon className={cn("h-5 w-5", theme.text)} />
                      </div>
                      <div className="mt-2 w-full">
                        <p className="text-lg font-extrabold text-foreground tracking-tight leading-none">{t.count}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1 truncate w-full px-1">
                          {info.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, head name, or registration..."
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
                  value={wardFilter}
                  onValueChange={(v) => {
                    setWardFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40 h-10 border-border/60 bg-muted/10">
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
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44 h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {COMMUNITY_TYPES.map((t) => {
                      const Icon = t.icon;
                      return (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {t.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select
                  value={activeFilter}
                  onValueChange={(v) => {
                    setActiveFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-32 h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {(search ||
                  wardFilter !== "all" ||
                  typeFilter !== "all" ||
                  activeFilter !== "all") && (
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
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Group Name</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Type</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward / Area</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Members</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Head Person</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j} className="py-4 px-4">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : groups.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={7}
                        className="text-center py-16 text-muted-foreground text-xs"
                      >
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                        <p className="font-medium text-sm">No community groups found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    groups.map((g: any) => {
                      const info = getTypeInfo(g.type);
                      const Icon = info.icon;
                      return (
                        <TableRow key={g.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                          <TableCell className="py-4 px-4 align-middle">
                            <Link to={`/community/${g.id}`}>
                              <div className="cursor-pointer space-y-1">
                                <p className="font-semibold text-primary hover:underline text-sm">
                                  {g.name}
                                </p>
                                {g.registrationNo && (
                                  <p className="text-[10px] text-muted-foreground font-semibold">
                                    Reg: {g.registrationNo}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-semibold gap-1.5 px-2 py-0.5 border"
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {info.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-xs sm:text-sm font-semibold text-foreground">
                            Ward #{g.ward?.wardNumber}
                            <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{g.ward?.name}</p>
                            {g.wardArea && (
                              <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5 mt-0.5">
                                <MapPin className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                {g.wardArea.name}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-right text-xs sm:text-sm font-semibold text-foreground">
                            <div className="flex flex-col items-end">
                              <span className="font-mono font-bold">{g.memberCount?.toLocaleString() || 0}</span>
                              {(g.maleMembers > 0 || g.femaleMembers > 0) && (
                                <p className="text-[9px] font-medium mt-0.5">
                                  <span className="text-blue-500">M: {g.maleMembers}</span>
                                  {" / "}
                                  <span className="text-pink-500">F: {g.femaleMembers}</span>
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-foreground">
                            {g.headName ? (
                              <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-foreground">{g.headName}</p>
                                {g.headPhone && (
                                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5">
                                    <Phone className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                    {g.headPhone}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground font-normal italic">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Badge
                              className={cn(
                                "text-[9px] sm:text-[10px] font-semibold border shadow-none",
                                g.isActive
                                  ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground border-border/50"
                              )}
                            >
                              {g.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/community/${g.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted"
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                              </Link>
                              <PermissionGate
                                module="community_groups"
                                action="update"
                              >
                                <Link to={`/community/${g.id}/edit`}>
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
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
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

        {/* Ward-wise Distribution */}
        {stats?.byWard && stats.byWard.length > 0 && (
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ward-wise Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {stats.byWard.map((w: any) => (
                <div key={w.wardId} className="flex items-center gap-4 text-xs sm:text-sm font-semibold">
                  <span className="w-32 truncate text-foreground">
                    #{w.wardNumber} {w.wardName}
                  </span>
                  <div className="flex-1">
                    <Progress
                      value={(w.count / (stats.total || 1)) * 100}
                      className="h-2"
                    />
                  </div>
                  <span className="font-mono text-xs w-20 text-right text-muted-foreground">
                    {w.count} groups
                  </span>
                  <span className="font-mono text-xs w-24 text-right text-foreground font-bold">
                    {w.members.toLocaleString()} members
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
