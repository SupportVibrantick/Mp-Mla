import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import * as xlsx from "xlsx";
import { toast } from "sonner";
import api from "@/lib/api";
import { useDeleteWard, useWard, useWardDemographics, useCreateCouncillor, useUpdateCouncillor, useDeleteCouncillor } from "@/hooks/useWards";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Edit,
  Users,
  Home,
  MapPin,
  Phone,
  User,
  Calendar,
  AlertTriangle,
  Building2,
  ClipboardList,
  BarChart3,
  Download,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
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

const AREA_TYPE_COLORS: Record<string, string> = {
  RESIDENTIAL: "bg-blue-100 text-blue-700",
  COMMERCIAL: "bg-amber-100 text-amber-700",
  INDUSTRIAL: "bg-slate-100 text-slate-700",
  MIXED_USE: "bg-purple-100 text-purple-700",
  SLUM: "bg-red-100 text-red-700",
  INSTITUTIONAL: "bg-green-100 text-green-700",
  AGRICULTURAL: "bg-emerald-100 text-emerald-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export default function WardDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Use replace to simulate navigation without adding to history stack
  const [, setLocation] = useLocation();
  const { data: wardRes, isLoading } = useWard(id);
  const { data: demoRes } = useWardDemographics(id);
  const { mutateAsync: deleteWard, isPending: isDeleting } = useDeleteWard();
  const [isExporting, setIsExporting] = useState(false);

  const ward = wardRes?.data;
  const demographics = demoRes?.data;

  const handleExport = async () => {
    if (!id || !ward) return;
    setIsExporting(true);
    try {
      const response = await api.get(`/admin/wards/export?id=${id}`);
      const data = response.data?.data;
      if (data && data.length > 0) {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Ward Data");
        xlsx.writeFile(wb, `ward_${ward.wardNumber}_export.xlsx`);
        toast.success("Ward exported successfully.");
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export ward data.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteWard(id);
      setLocation("/wards");
    } catch (error) {
      // toast is handled in the hook
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Ward Detail">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (!ward) {
    return (
      <MainLayout title="Ward Detail">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Map className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Ward not found</p>
          <Link to="/wards">
            <Button variant="outline">Back to Wards</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const councillorsList =
    ward.councillors && ward.councillors.length > 0
      ? ward.councillors
      : ward.currentCouncillor
      ? [ward.currentCouncillor]
      : [];
  const councillor =
    ward.currentCouncillor || ward.councillors?.find((c: any) => c.isCurrent);
  const grievanceOpen =
    ward.grievanceStats
      ?.filter((g: any) =>
        ["OPEN", "IN_PROGRESS", "ESCALATED"].includes(g.status),
      )
      .reduce((s: number, g: any) => s + g.count, 0) || 0;

  return (
    <MainLayout title="Ward Detail">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/wards">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-muted border border-border/40">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{ward.name}</h1>
                <Badge variant="outline" className="text-[10px] font-bold border-border/80 px-2 py-0.5">
                  Ward #{ward.wardNumber}
                </Badge>
                <Badge
                  className={cn(
                    "text-[9px] sm:text-[10px] font-semibold border shadow-none",
                    ward.status === "ACTIVE"
                      ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground border-border/50"
                  )}
                >
                  {ward.status}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
                {ward.zone && `Zone ${ward.zone} • `}
                {ward.areaType}
                {ward.establishedDate &&
                  ` • Since ${format(new Date(ward.establishedDate), "yyyy-MM-dd")}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <PermissionGate module="wards" action="read">
              <Button
                variant="outline"
                className="gap-2 h-9 text-xs font-semibold hover:bg-muted border-border/60 justify-center"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" /> Export
              </Button>
            </PermissionGate>
            <PermissionGate module="wards" action="update">
              <Link to={`/wards/${ward.id}/edit`}>
                <Button variant="outline" className="gap-2 h-9 text-xs font-semibold hover:bg-muted border-border/60 justify-center">
                  <Edit className="h-4 w-4" /> Edit Ward
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="wards" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="gap-2 h-9 text-xs font-semibold justify-center hover:bg-destructive/95"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-extrabold text-foreground">Delete Ward</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground font-medium">
                      Are you sure you want to completely delete {ward.name}?
                      This will permanently delete all its dependent
                      Demographics, Areas, and Councillors.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel className="border-border/60 hover:bg-muted">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: "Population",
              value: ward.totalPopulation.toLocaleString(),
              Icon: Users,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
              borderColor: "border-indigo-100 dark:border-indigo-950/50",
            },
            {
              label: "Households",
              value: ward.totalHouseholds.toLocaleString(),
              Icon: Home,
              color: "text-emerald-500",
              bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
              borderColor: "border-emerald-100 dark:border-emerald-950/50",
            },
            {
              label: "Areas count",
              value: ward.totalAreas,
              Icon: MapPin,
              color: "text-orange-500",
              bgColor: "bg-orange-50 dark:bg-orange-950/30",
              borderColor: "border-orange-100 dark:border-orange-950/50",
            },
            {
              label: "Public Requests",
              value: ward._count?.grievances || 0,
              Icon: AlertTriangle,
              color: "text-rose-500",
              bgColor: "bg-rose-50 dark:bg-rose-950/30",
              borderColor: "border-rose-100 dark:border-rose-950/50",
            },
            {
              label: "Total Projects",
              value: ward._count?.projects || 0,
              Icon: ClipboardList,
              color: "text-blue-500",
              bgColor: "bg-blue-50 dark:bg-blue-950/30",
              borderColor: "border-blue-100 dark:border-blue-950/50",
            },
            {
              label: "Public Facilities",
              value: ward._count?.institutions || 0,
              Icon: Building2,
              color: "text-amber-500",
              bgColor: "bg-amber-50 dark:bg-amber-950/30",
              borderColor: "border-amber-100 dark:border-amber-950/50",
            },
          ].map((s, i) => (
            <Card key={i} className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-center">
                  <div className={cn("p-2 rounded-xl border", s.bgColor, s.borderColor)}>
                    <s.Icon className={cn("h-4 w-4", s.color)} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                    {s.label}
                  </p>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-0.5">
                    {s.value}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Councillor Card */}
        <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/30 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Ward Councillor Details ({councillorsList.length})
            </CardTitle>
            <PermissionGate module="constituency" action="update">
              <Link to={`/wards/${ward.id}/edit`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary gap-1">
                  <Edit className="h-3.5 w-3.5" /> Manage Councillors
                </Button>
              </Link>
            </PermissionGate>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {councillorsList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {councillorsList.map((c: any, index: number) => (
                  <div key={c.id || index} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-2xl bg-card/60 backdrop-blur-xs">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                      {c.name ? c.name.charAt(0) : "C"}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-base text-foreground">{c.name}</p>
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {c.designation || "Ward Councillor"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-medium">
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground/60" /> {c.phone}
                          </span>
                        )}
                        {c.partyName && (
                          <Badge variant="outline" className="text-[10px] font-bold border-border/80 px-2 py-0.5">
                            {c.partyName}
                          </Badge>
                        )}
                        {c.sinceDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                            Since {format(new Date(c.sinceDate), "yyyy-MM-dd")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic font-medium">
                No councillor assigned.
              </p>
            )}
            {ward.description && (
              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-3 border-t border-border/30 pt-3 leading-relaxed">
                {ward.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="areas" className="w-full space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted/20 border border-border/40 rounded-xl p-1 h-11 max-w-md">
            <TabsTrigger value="areas" className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:shadow-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> Areas ({ward.areas?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="demographics" className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:shadow-sm">
              <BarChart3 className="h-3.5 w-3.5 shrink-0" /> Demographics
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-1.5 text-xs font-semibold rounded-lg data-[state=active]:shadow-sm">
              <Users className="h-3.5 w-3.5 shrink-0" /> Community ({ward._count?.communityGroups || 0})
            </TabsTrigger>
          </TabsList>

          {/* Areas Tab */}
          <TabsContent value="areas" className="space-y-6 outline-none">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ward.areas?.map((area: any) => (
                <Card
                  key={area.id}
                  className="hover:shadow-md transition-all duration-300 border border-border/50 bg-card rounded-2xl hover:border-primary/20"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-semibold text-sm text-foreground">{area.name}</h3>
                        {area.pincode && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            PIN: {area.pincode}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          "text-[9px] font-bold border shadow-none",
                          AREA_TYPE_COLORS[area.areaType] || "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {area.areaType.replace("_", " ")}
                      </Badge>
                    </div>
                    {area.landmark && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" /> {area.landmark}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/30">
                      <div className="text-center">
                        <p className="text-sm font-bold font-mono text-foreground">
                          {area.population.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">
                          Population
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold font-mono text-foreground">
                          {area.households.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-muted-foreground uppercase font-semibold">
                          Households
                        </p>
                      </div>
                    </div>
                    {area.maleCount > 0 && (
                      <div className="flex gap-3 text-[10px] font-bold justify-center">
                        <span className="text-blue-600">
                          M: {area.maleCount.toLocaleString()}
                        </span>
                        <span className="text-pink-600">
                          F: {area.femaleCount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <Progress
                      value={
                        (area.population / (ward.totalPopulation || 1)) * 100
                      }
                      className="h-1.5"
                    />
                    <p className="text-[9px] text-muted-foreground text-right font-medium">
                      {(
                        (area.population / (ward.totalPopulation || 1)) *
                        100
                      ).toFixed(1)}
                      % of ward
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Area Summary Table */}
            {ward.areas?.length > 0 && (
              <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="pb-3 border-b border-border/30">
                  <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    Area Summary Directory
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/20">
                          <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Name</TableHead>
                          <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Type</TableHead>
                          <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Population</TableHead>
                          <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Male</TableHead>
                          <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Female</TableHead>
                          <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Households</TableHead>
                          <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">% of Ward</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ward.areas.map((a: any) => (
                          <TableRow key={a.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                            <TableCell className="font-semibold py-4 px-4 text-sm text-foreground">
                              {a.name}
                            </TableCell>
                            <TableCell className="py-4 px-4 align-middle">
                              <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 border">
                                {a.areaType.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {a.population.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-blue-600">
                              {a.maleCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-pink-600">
                              {a.femaleCount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {a.households.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-muted-foreground">
                              {(
                                (a.population / (ward.totalPopulation || 1)) *
                                100
                              ).toFixed(1)}
                              %
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/20 border-t hover:bg-muted/25">
                          <TableCell className="py-4 px-4 text-sm">Total</TableCell>
                          <TableCell className="py-4 px-4" />
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-foreground">
                            {ward.totalPopulation.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-blue-600">
                            {ward.totalMale.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-pink-600">
                            {ward.totalFemale.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-foreground">
                            {ward.totalHouseholds.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 px-4 text-xs font-extrabold text-foreground">
                            100%
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-4 outline-none">
            {demographics?.wardLevel ? (
              <div className="space-y-4">
                {/* Row 1: Gender + Age */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/30">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Gender Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      {[
                        {
                          label: "Male",
                          value: demographics.wardLevel.maleCount,
                          color: "bg-gradient-to-r from-blue-500 to-indigo-600",
                          total: demographics.wardLevel.totalPopulation,
                          textColor: "text-blue-600",
                        },
                        {
                          label: "Female",
                          value: demographics.wardLevel.femaleCount,
                          color: "bg-gradient-to-r from-pink-500 to-rose-600",
                          total: demographics.wardLevel.totalPopulation,
                          textColor: "text-pink-600",
                        },
                      ].map((g) => (
                        <div key={g.label} className="space-y-1">
                          <div className="flex justify-between text-xs sm:text-sm font-semibold">
                            <span className="text-foreground">{g.label}</span>
                            <span className={cn("font-mono font-bold", g.textColor)}>
                              {g.value.toLocaleString()} (
                              {((g.value / (g.total || 1)) * 100).toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", g.color)}
                              style={{
                                width: `${(g.value / (g.total || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/30">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Age Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 font-semibold text-xs sm:text-sm">
                      {(demographics.charts?.ageDistribution || []).map(
                        (age: any) => (
                          <div
                            key={age.label}
                            className="flex items-center gap-3"
                          >
                            <span className="text-xs w-12 text-muted-foreground font-semibold">
                              {age.label}
                            </span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-slate-900 to-indigo-950 rounded-full"
                                style={{
                                  width: `${(age.value / (demographics.wardLevel.totalPopulation || 1)) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs w-16 text-right font-bold text-foreground">
                              {age.value.toLocaleString()}
                            </span>
                          </div>
                        ),
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Religion + Caste */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/30">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Religion Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 font-semibold text-xs sm:text-sm">
                      {(() => {
                        const religionData = [
                          {
                            label: "Hindu 🕉️",
                            value: demographics.wardLevel.hinduCount || 0,
                            color: "bg-orange-500",
                          },
                          {
                            label: "Muslim ☪️",
                            value: demographics.wardLevel.muslimCount || 0,
                            color: "bg-emerald-600",
                          },
                          {
                            label: "Sikh 🙏",
                            value: demographics.wardLevel.sikhCount || 0,
                            color: "bg-indigo-600",
                          },
                          {
                            label: "Christian ✝️",
                            value: demographics.wardLevel.christianCount || 0,
                            color: "bg-rose-500",
                          },
                          {
                            label: "Buddhist ☸️",
                            value: demographics.wardLevel.buddhistCount || 0,
                            color: "bg-amber-600",
                          },
                          {
                            label: "Jain",
                            value: demographics.wardLevel.jainCount || 0,
                            color: "bg-purple-500",
                          },
                          {
                            label: "Other",
                            value:
                              demographics.wardLevel.otherReligionCount || 0,
                            color: "bg-slate-500",
                          },
                        ].filter((r) => r.value > 0);

                        const totalReligion =
                          religionData.reduce((acc, r) => acc + r.value, 0) ||
                          1;

                        return religionData.map((r) => (
                          <div
                            key={r.label}
                            className="flex items-center gap-3"
                          >
                            <span className="text-xs w-24 text-foreground">{r.label}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", r.color)}
                                style={{
                                  width: `${(r.value / totalReligion) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs w-20 text-right font-bold text-foreground">
                              {r.value.toLocaleString()} (
                              {((r.value / totalReligion) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        ));
                      })()}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/30">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Social Category (Caste)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 font-semibold text-xs sm:text-sm">
                      {(() => {
                        const casteData = [
                          {
                            label: "General",
                            value: demographics.wardLevel.generalCount || 0,
                            color: "bg-slate-500",
                          },
                          {
                            label: "OBC",
                            value: demographics.wardLevel.obcCount || 0,
                            color: "bg-amber-500",
                          },
                          {
                            label: "SC",
                            value: demographics.wardLevel.scCount || 0,
                            color: "bg-blue-500",
                          },
                          {
                            label: "ST",
                            value: demographics.wardLevel.stCount || 0,
                            color: "bg-emerald-500",
                          },
                          {
                            label: "Minority",
                            value: demographics.wardLevel.minorityCount || 0,
                            color: "bg-purple-500",
                          },
                        ].filter((c) => c.value > 0);

                        const totalCaste =
                          casteData.reduce((acc, c) => acc + c.value, 0) || 1;

                        return casteData.map((c) => (
                          <div
                            key={c.label}
                            className="flex items-center gap-3"
                          >
                            <span className="text-xs w-16 text-foreground">{c.label}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", c.color)}
                                style={{
                                  width: `${(c.value / totalCaste) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs w-20 text-right font-bold text-foreground">
                              {c.value.toLocaleString()} (
                              {((c.value / totalCaste) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        ));
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* Row 3: Economic + Literacy + Voters */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/30">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Economic</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4 font-semibold text-xs sm:text-sm">
                      {(() => {
                        const bpl = demographics.wardLevel.bplHouseholds || 0;
                        const apl = demographics.wardLevel.aplHouseholds || 0;
                        const totalHouseholds = bpl + apl || 1;

                        return (
                          <>
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-muted-foreground">
                                BPL Households
                              </span>
                              <span className="font-mono font-bold text-foreground">
                                {bpl.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-muted-foreground">
                                APL Households
                              </span>
                              <span className="font-mono font-bold text-foreground">
                                {apl.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                              <div
                                className="h-full bg-rose-400"
                                style={{
                                  width: `${(bpl / totalHouseholds) * 100}%`,
                                }}
                              />
                              <div className="h-full bg-emerald-400 flex-1" />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                              <span>
                                BPL {((bpl / totalHouseholds) * 100).toFixed(1)}%
                              </span>
                              <span>
                                APL {((apl / totalHouseholds) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/30">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Literacy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3.5 pt-4 font-semibold text-xs sm:text-sm">
                      {[
                        {
                          label: "Overall",
                          value: demographics.wardLevel.literacyRate,
                        },
                        {
                          label: "Male",
                          value: demographics.wardLevel.maleLiteracyRate,
                        },
                        {
                          label: "Female",
                          value: demographics.wardLevel.femaleLiteracyRate,
                        },
                      ].map((l) => (
                        <div key={l.label} className="space-y-1">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">
                              {l.label}
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {l.value ? `${l.value.toFixed(1)}%` : "N/A"}
                            </span>
                          </div>
                          {l.value && (
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${l.value}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/30">
                      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Voters & Vital Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4 font-semibold text-xs sm:text-sm">
                      {/* Voters Summary */}
                      <div className="flex items-center justify-around text-center pb-2 border-b border-border/30">
                        <div>
                          <p className="text-lg font-bold font-mono text-foreground">
                            {demographics.wardLevel.totalVoters.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">
                            Total Voters
                          </p>
                        </div>
                        <div className="w-px h-8 bg-border/40" />
                        <div>
                          <p className="text-lg font-bold font-mono text-blue-600">
                            {demographics.wardLevel.newVotersCount.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">
                            New Voters
                          </p>
                        </div>
                      </div>

                      {/* Vital Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center border border-emerald-100/30 dark:border-emerald-800/20">
                          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                            {demographics.wardLevel.totalBirths.toLocaleString()}
                          </p>
                          <p className="text-[8px] text-muted-foreground uppercase font-bold">
                            Births
                          </p>
                        </div>
                        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-center border border-rose-100/30 dark:border-rose-800/20">
                          <p className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                            {demographics.wardLevel.totalDeaths.toLocaleString()}
                          </p>
                          <p className="text-[8px] text-muted-foreground uppercase font-bold">
                            Deaths
                          </p>
                        </div>
                      </div>

                      {/* Gender Split (Voters) */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold">
                          <span>Voter Gender Split</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${(demographics.wardLevel.maleVoters / (demographics.wardLevel.totalVoters || 1)) * 100}%`,
                            }}
                          />
                          <div
                            className="h-full bg-pink-500"
                            style={{
                              width: `${(demographics.wardLevel.femaleVoters / (demographics.wardLevel.totalVoters || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono font-bold">
                          <span className="text-blue-600">
                            M: {demographics.wardLevel.maleVoters.toLocaleString()}
                          </span>
                          <span className="text-pink-600">
                            F: {demographics.wardLevel.femaleVoters.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {demographics.wardLevel.source && (
                        <p className="text-[9px] text-muted-foreground text-center font-medium pt-1">
                          Source: {demographics.wardLevel.source}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="p-12 text-center text-muted-foreground font-semibold text-sm border border-border/50 bg-card rounded-2xl">
                No demographic data available. Edit this ward to add demographics.
              </Card>
            )}
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-4 outline-none">
            {ward.communityGroupStats?.length > 0 ? (
              <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/20">
                          <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Type</TableHead>
                          <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Groups</TableHead>
                          <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Total Members</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ward.communityGroupStats.map((cg: any) => (
                          <TableRow key={cg.type} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                            <TableCell className="py-4 px-4 align-middle">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold border-border/80 px-2.5 py-0.5 capitalize shadow-none"
                              >
                                {cg.type.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {cg.count}
                            </TableCell>
                            <TableCell className="text-right font-mono py-4 px-4 text-xs font-bold text-foreground">
                              {cg.totalMembers.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-12 text-center text-muted-foreground font-semibold text-sm border border-border/50 bg-card rounded-2xl">
                No community groups in this ward.
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
