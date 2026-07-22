import { useState, useMemo } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import * as xlsx from "xlsx";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  useWards,
  useWardStats,
  useBulkCreateWards,
  useDeleteWard,
} from "@/hooks/useWards";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { BulkUploadModal } from "@/components/shared/BulkUploadModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Map,
  Plus,
  Search,
  Users,
  Home,
  MapPin,
  Eye,
  Edit,
  Filter,
  Building2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Briefcase,
  FileUp,
  Download,
  Trash2,
} from "lucide-react";
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

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  INACTIVE: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  PROPOSED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MERGED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function WardsPage() {
  const [search, setSearch] = useState("");
  const [zone, setZone] = useState("all");
  const [areaType, setAreaType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Delete Context
  const [wardToDelete, setWardToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { mutateAsync: bulkCreateWards } = useBulkCreateWards();
  const { mutateAsync: deleteWard, isPending: isDeleting } = useDeleteWard();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.get("/admin/wards/export");
      const data = response.data?.data;
      if (data && data.length > 0) {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Wards");
        xlsx.writeFile(wb, "wards_export.xlsx");
        toast.success("Wards exported successfully.");
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export wards data.");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadSampleTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Wards");

    const columns = [
      // Basic Info
      { header: "wardNumber", key: "wardNumber", width: 12 },
      { header: "wardName", key: "wardName", width: 20 },
      { header: "wardZone", key: "wardZone", width: 15 },
      { header: "wardStatus", key: "wardStatus", width: 12 },
      { header: "wardAreaType", key: "wardAreaType", width: 15 },
      { header: "wardPincode", key: "wardPincode", width: 12 },
      { header: "wardDescription", key: "wardDescription", width: 30 },
      { header: "establishedDate", key: "establishedDate", width: 15 },

      // Councillor
      { header: "councillorName", key: "councillorName", width: 20 },
      { header: "councillorPhone", key: "councillorPhone", width: 15 },
      { header: "councillorEmail", key: "councillorEmail", width: 25 },
      { header: "councillorParty", key: "councillorParty", width: 15 },
      { header: "councillorDesignation", key: "councillorDesignation", width: 20 },
      { header: "councillorSinceDate", key: "councillorSinceDate", width: 15 },

      // Area Info
      { header: "areaName", key: "areaName", width: 20 },
      { header: "areaType", key: "areaType", width: 15 },
      { header: "areaPopulation", key: "areaPopulation", width: 12 },
      { header: "areaHouseholds", key: "areaHouseholds", width: 12 },
      { header: "areaMaleCount", key: "areaMaleCount", width: 12 },
      { header: "areaFemaleCount", key: "areaFemaleCount", width: 12 },
      { header: "areaPincode", key: "areaPincode", width: 12 },
      { header: "areaLandmark", key: "areaLandmark", width: 20 },
      { header: "areaDescription", key: "areaDescription", width: 30 },

      // Ward Demographics (wd_)
      { header: "wd_totalPopulation", key: "wd_totalPopulation", width: 15 },
      { header: "wd_maleCount", key: "wd_maleCount", width: 12 },
      { header: "wd_femaleCount", key: "wd_femaleCount", width: 12 },
      { header: "wd_transgenderCount", key: "wd_transgenderCount", width: 15 },
      { header: "wd_age0to6", key: "wd_age0to6", width: 12 },
      { header: "wd_age7to18", key: "wd_age7to18", width: 12 },
      { header: "wd_age19to35", key: "wd_age19to35", width: 12 },
      { header: "wd_age36to60", key: "wd_age36to60", width: 12 },
      { header: "wd_age60plus", key: "wd_age60plus", width: 12 },
      { header: "wd_totalHouseholds", key: "wd_totalHouseholds", width: 15 },
      { header: "wd_bplHouseholds", key: "wd_bplHouseholds", width: 15 },
      { header: "wd_aplHouseholds", key: "wd_aplHouseholds", width: 15 },
      { header: "wd_generalCount", key: "wd_generalCount", width: 12 },
      { header: "wd_obcCount", key: "wd_obcCount", width: 12 },
      { header: "wd_scCount", key: "wd_scCount", width: 12 },
      { header: "wd_stCount", key: "wd_stCount", width: 12 },
      { header: "wd_minorityCount", key: "wd_minorityCount", width: 12 },
      { header: "wd_otherCount", key: "wd_otherCount", width: 12 },
      { header: "wd_hinduCount", key: "wd_hinduCount", width: 12 },
      { header: "wd_muslimCount", key: "wd_muslimCount", width: 12 },
      { header: "wd_sikhCount", key: "wd_sikhCount", width: 12 },
      { header: "wd_christianCount", key: "wd_christianCount", width: 12 },
      { header: "wd_buddhistCount", key: "wd_buddhistCount", width: 12 },
      { header: "wd_jainCount", key: "wd_jainCount", width: 12 },
      { header: "wd_otherReligionCount", key: "wd_otherReligionCount", width: 15 },
      { header: "wd_literacyRate", key: "wd_literacyRate", width: 12 },
      { header: "wd_maleLiteracyRate", key: "wd_maleLiteracyRate", width: 15 },
      { header: "wd_femaleLiteracyRate", key: "wd_femaleLiteracyRate", width: 15 },
      { header: "wd_totalVoters", key: "wd_totalVoters", width: 12 },
      { header: "wd_maleVoters", key: "wd_maleVoters", width: 12 },
      { header: "wd_femaleVoters", key: "wd_femaleVoters", width: 12 },

      // Area Demographics (ad_)
      { header: "ad_totalPopulation", key: "ad_totalPopulation", width: 15 },
      { header: "ad_maleCount", key: "ad_maleCount", width: 12 },
      { header: "ad_femaleCount", key: "ad_femaleCount", width: 12 },
      { header: "ad_transgenderCount", key: "ad_transgenderCount", width: 15 },
      { header: "ad_age0to6", key: "ad_age0to6", width: 12 },
      { header: "ad_age7to18", key: "ad_age7to18", width: 12 },
      { header: "ad_age19to35", key: "ad_age19to35", width: 12 },
      { header: "ad_age36to60", key: "ad_age36to60", width: 12 },
      { header: "ad_age60plus", key: "ad_age60plus", width: 12 },
      { header: "ad_totalHouseholds", key: "ad_totalHouseholds", width: 15 },
      { header: "ad_bplHouseholds", key: "ad_bplHouseholds", width: 15 },
      { header: "ad_aplHouseholds", key: "ad_aplHouseholds", width: 15 },
      { header: "ad_generalCount", key: "ad_generalCount", width: 12 },
      { header: "ad_obcCount", key: "ad_obcCount", width: 12 },
      { header: "ad_scCount", key: "ad_scCount", width: 12 },
      { header: "ad_stCount", key: "ad_stCount", width: 12 },
      { header: "ad_minorityCount", key: "ad_minorityCount", width: 12 },
      { header: "ad_otherCount", key: "ad_otherCount", width: 12 },
      { header: "ad_hinduCount", key: "ad_hinduCount", width: 12 },
      { header: "ad_muslimCount", key: "ad_muslimCount", width: 12 },
      { header: "ad_sikhCount", key: "ad_sikhCount", width: 12 },
      { header: "ad_christianCount", key: "ad_christianCount", width: 12 },
      { header: "ad_buddhistCount", key: "ad_buddhistCount", width: 12 },
      { header: "ad_jainCount", key: "ad_jainCount", width: 12 },
      { header: "ad_otherReligionCount", key: "ad_otherReligionCount", width: 15 },
      { header: "ad_literacyRate", key: "ad_literacyRate", width: 12 },
      { header: "ad_maleLiteracyRate", key: "ad_maleLiteracyRate", width: 15 },
      { header: "ad_femaleLiteracyRate", key: "ad_femaleLiteracyRate", width: 15 },
      { header: "ad_totalVoters", key: "ad_totalVoters", width: 12 },
      { header: "ad_maleVoters", key: "ad_maleVoters", width: 12 },
      { header: "ad_femaleVoters", key: "ad_femaleVoters", width: 12 },
    ];

    worksheet.columns = columns;

    // Add Example Row
    worksheet.addRow({
      wardNumber: 101,
      wardName: "Sample Ward Alpha",
      wardZone: "North",
      wardStatus: "ACTIVE",
      wardAreaType: "URBAN",
      wardPincode: "110001",
      wardDescription: "Main urban ward",
      establishedDate: "2020-01-01",
      councillorName: "John Doe",
      councillorPhone: "9876543210",
      councillorEmail: "john@example.com",
      councillorParty: "Party A",
      councillorDesignation: "Ward Councillor",
      councillorSinceDate: "2021-01-01",
      areaName: "Area 1",
      areaType: "RESIDENTIAL",
      areaPopulation: 5000,
      areaHouseholds: 1000,
      areaMaleCount: 2500,
      areaFemaleCount: 2500,
      areaPincode: "110001",
      areaLandmark: "Near Park",
      areaDescription: "Main residential block",
      wd_totalPopulation: 15000,
      wd_maleCount: 7500,
      wd_femaleCount: 7500,
      wd_transgenderCount: 0,
      wd_literacyRate: 85.5,
      wd_totalVoters: 8250,
      ad_totalPopulation: 5000,
      ad_maleCount: 2500,
      ad_femaleCount: 2500,
      ad_transgenderCount: 0,
      ad_literacyRate: 86,
      ad_totalVoters: 2750,
    });

    // Data Validation Sheet (Hidden)
    const dataSheet = workbook.addWorksheet("DataLists", { state: "hidden" });
    const wardStatuses = ["ACTIVE", "INACTIVE", "PROPOSED", "DEPRECATED"];
    const wardAreaTypes = ["URBAN", "SEMI_URBAN", "RURAL"];
    const areaTypes = [
      "RESIDENTIAL",
      "COMMERCIAL",
      "MIXED",
      "INDUSTRIAL",
      "PARK",
      "INSTITUTIONAL",
      "OTHER",
    ];

    wardStatuses.forEach((v, i) => (dataSheet.getCell(`A${i + 1}`).value = v));
    wardAreaTypes.forEach((v, i) => (dataSheet.getCell(`B${i + 1}`).value = v));
    areaTypes.forEach((v, i) => (dataSheet.getCell(`C${i + 1}`).value = v));

    for (let i = 2; i <= 201; i++) {
      // wardStatus (D)
      worksheet.getCell(`D${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`DataLists!$A$1:$A$${wardStatuses.length}`],
      };
      // wardAreaType (E)
      worksheet.getCell(`E${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`DataLists!$B$1:$B$${wardAreaTypes.length}`],
      };
      // areaType (P)
      worksheet.getCell(`P${i}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`DataLists!$C$1:$C$${areaTypes.length}`],
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
    a.download = "wards_bulk_template.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const queryParams = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (zone !== "all") p.zone = zone;
    if (areaType !== "all") p.areaType = areaType;
    if (status !== "all") p.status = status;
    return p;
  }, [search, zone, areaType, status, page]);

  const { data: wardsData, isLoading } = useWards(queryParams);
  const { data: statsData } = useWardStats();

  const wards = wardsData?.data?.wards || [];
  const pagination = wardsData?.data?.pagination;
  const stats = statsData?.data;

  const zones = useMemo(() => {
    if (!stats?.byZone) return [];
    return stats.byZone.map((z: any) => z.zone);
  }, [stats]);

  const reset = () => {
    setSearch("");
    setAreaType("all");
    setZone("all");
    setStatus("all");
    setPage(1);
  };

  return (
    <MainLayout title="Wards">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Map className="h-7 w-7 text-primary" />
              Wards
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Manage constituency wards, areas, demographics and councillors
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end w-full sm:w-auto">
            <PermissionGate module="wards" action="read">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto h-9 text-xs font-semibold hover:bg-muted border-border/60 justify-center"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" />
                Export All
              </Button>
            </PermissionGate>

            <PermissionGate module="wards" action="create">
              <Button
                variant="outline"
                className="gap-2 w-full sm:w-auto h-9 text-xs font-semibold hover:bg-muted border-border/60 justify-center"
                onClick={() => setIsBulkImportOpen(true)}
              >
                <FileUp className="h-4 w-4" />
                Bulk Upload
              </Button>
            </PermissionGate>

            <PermissionGate module="wards" action="create">
              <Link to="/wards/new" className="w-full sm:w-auto">
                <Button className="gap-2 w-full sm:w-auto justify-center bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none">
                  <Plus className="h-4 w-4" />
                  Add New Ward
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>
        {/* Delete Confirmation Modal */}
        <AlertDialog
          open={!!wardToDelete}
          onOpenChange={(open) => !open && setWardToDelete(null)}
        >
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-extrabold text-foreground">Delete Ward</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground font-medium">
                Are you sure you want to completely delete {wardToDelete?.name}?
                This will permanently delete all its dependent Demographics,
                Areas, and Councillors.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="border-border/60 hover:bg-muted" disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={async (e) => {
                  e.preventDefault();
                  if (wardToDelete) {
                    await deleteWard(wardToDelete.id);
                    setWardToDelete(null);
                  }
                }}
                className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))
          ) : (
            <>
              {[
                {
                  label: "Total Wards",
                  value: stats?.totalWards || 0,
                  Icon: Map,
                  color: "text-indigo-500",
                  bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
                  borderColor: "border-indigo-100 dark:border-indigo-950/50",
                },
                {
                  label: "Total Areas",
                  value: stats?.totalAreas || 0,
                  Icon: MapPin,
                  color: "text-slate-500",
                  bgColor: "bg-slate-50 dark:bg-slate-950/30",
                  borderColor: "border-slate-100 dark:border-slate-950/50",
                },
                {
                  label: "Population",
                  value: stats?.totalPopulation ? `${(stats.totalPopulation / 1000).toFixed(0)}K` : "0",
                  Icon: Users,
                  color: "text-orange-500",
                  bgColor: "bg-orange-50 dark:bg-orange-950/30",
                  borderColor: "border-orange-100 dark:border-orange-950/50",
                },
                {
                  label: "Households",
                  value: stats?.totalHouseholds ? `${(stats.totalHouseholds / 1000).toFixed(1)}K` : "0",
                  Icon: Home,
                  color: "text-rose-500",
                  bgColor: "bg-rose-50 dark:bg-rose-950/30",
                  borderColor: "border-rose-100 dark:border-rose-950/50",
                },
              ].map((s, i) => (
                <Card key={i} className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl">
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
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                        {s.value}
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Filters */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ward name or zone..."
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
                  value={zone}
                  onValueChange={(v) => {
                    setZone(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    {zones.map((z: string) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={areaType}
                  onValueChange={(v) => {
                    setAreaType(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40 h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Area Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Urban">Urban</SelectItem>
                    <SelectItem value="Semi-Urban">Semi-Urban</SelectItem>
                    <SelectItem value="Rural">Rural</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="PROPOSED">Proposed</SelectItem>
                  </SelectContent>
                </Select>

                {(search ||
                  zone !== "all" ||
                  areaType !== "all" ||
                  status !== "all") && (
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

        {/* Wards Table */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="w-14 h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">#</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward Name</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Zone</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Type</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Population</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Households</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Areas</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Councillor</TableHead>
                    <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-4 text-center text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Stats</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({ length: 11 }).map((_, j) => (
                          <TableCell key={j} className="py-4 px-4">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : wards.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={11}
                        className="text-center py-16 text-muted-foreground text-xs font-semibold"
                      >
                        No wards found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    wards.map((ward: any) => {
                      const councillor = ward.councillors?.[0];
                      return (
                        <TableRow key={ward.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                          <TableCell className="font-mono text-muted-foreground py-4 px-4 font-semibold text-xs">
                            {ward.wardNumber}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Link to={`/wards/${ward.id}`}>
                              <span className="font-semibold text-primary hover:underline cursor-pointer text-sm">
                                {ward.name}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            {ward.zone ? (
                              <Badge variant="outline" className="text-[10px] font-bold border-border/80 px-2 py-0.5">
                                {ward.zone}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 border">
                              {ward.areaType}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-right font-mono text-xs font-bold text-foreground">
                            {ward.totalPopulation.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-right font-mono text-xs font-bold text-foreground">
                            {ward.totalHouseholds.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-right font-mono text-xs font-bold text-foreground">
                            {ward.totalAreas}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-foreground">
                            {councillor ? (
                              <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-foreground">{councillor.name}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">
                                  {councillor.phone}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground font-normal italic">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle">
                            <Badge
                              className={cn("text-[9px] sm:text-[10px] font-semibold border shadow-none", STATUS_COLORS[ward.status] || "")}
                            >
                              {ward.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold cursor-help"
                                title="Active Public Requests"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-mono font-bold">
                                  {ward._count?.grievances || 0}
                                </span>
                              </div>
                              <div
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold cursor-help"
                                title="Ongoing Projects"
                              >
                                <Briefcase className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-mono font-bold">
                                  {ward._count?.projects || 0}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/wards/${ward.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted"
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                              </Link>
                              <PermissionGate module="wards" action="update">
                                <Link to={`/wards/${ward.id}/edit`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-muted"
                                  >
                                    <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </Link>
                              </PermissionGate>
                              <PermissionGate module="wards" action="delete">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    setWardToDelete({
                                      id: ward.id,
                                      name: ward.name,
                                    })
                                  }
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

            {/* Pagination */}
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

        {/* Zone Summary */}
        {stats?.byZone && stats.byZone.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.byZone.map((z: any) => (
              <Card key={z.zone} className="border border-border/50 bg-card rounded-2xl shadow-sm">
                <CardHeader className="pb-3 border-b border-border/30">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    {z.zone}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 font-semibold text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wards</span>
                    <span className="text-foreground">{z.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Population</span>
                    <span className="text-foreground font-mono font-bold">
                      {z.population.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(z.population / (stats.totalPopulation || 1)) * 100}
                    className="h-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground text-right font-medium">
                    {(
                      (z.population / (stats.totalPopulation || 1)) *
                      100
                    ).toFixed(1)}
                    % of total
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BulkUploadModal
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onUpload={bulkCreateWards}
        title="Import Wards"
        description={
          <div>
            <p className="text-xs text-muted-foreground">
              Upload an Excel or CSV file to import multiple wards. The file
              uses a flat schema where areas are grouped by wardNumber.
            </p>
          </div>
        }
        onDownloadSample={downloadSampleTemplate}
      />
    </MainLayout>
  );
}
