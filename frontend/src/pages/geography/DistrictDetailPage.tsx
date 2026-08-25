import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  useDistrict,
  useToggleDistrict,
  useDeleteDistrict,
  useDistrictTownVillages,
  useDistrictBlocks,
  useDistrictConstituencies,
} from "@/hooks/useDistrictsGeography";

import { MainLayout } from "@/components/layout/MainLayout";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  ArrowLeft,
  Edit,
  Trash2,
  Globe,
  Building,
  Map,
  Landmark,
  ToggleLeft,
  ToggleRight,
  MapPin,
  BarChart3,
  RefreshCw,
  Hash,
  CalendarDays,
  Activity,
} from "lucide-react";

function normalizeListResponse(response: any): any[] {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function formatDate(value?: string | Date | null) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatType(value?: string | null) {
  if (!value) return "N/A";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatusBadge({ active }: { active?: boolean }) {
  return (
    <Badge
      variant={active ? "default" : "secondary"}
      className={cn(
        "text-[10px] font-semibold border shadow-none",
        active &&
          "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400",
      )}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground opacity-60" />
      </div>

      <h3 className="text-sm font-bold text-foreground">{title}</h3>

      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          {description}
        </p>
      )}
    </div>
  );
}

function TableLoading({
  columns,
  rows = 4,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <TableCell key={columnIndex} className="py-4">
              <Skeleton className="h-4 w-full max-w-45" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function DistrictDetailPage({ id }: { id: string }) {
  const [, navigate] = useLocation();

  /*
   * ------------------------------------------------------------------
   * District
   * ------------------------------------------------------------------
   */

  const {
    data: districtRes,
    isLoading: districtLoading,
    isFetching: districtFetching,
    refetch: refetchDistrict,
  } = useDistrict(id);

  const district = districtRes?.data;

  const toggleMut = useToggleDistrict();
  const deleteMut = useDeleteDistrict();

  /*
   * ------------------------------------------------------------------
   * District child geographies
   * ------------------------------------------------------------------
   */

  const {
    data: municipalRes,
    isLoading: municipalLoading,
    isFetching: municipalFetching,
    refetch: refetchMunicipal,
  } = useDistrictTownVillages(id);

  const {
    data: blocksRes,
    isLoading: blocksLoading,
    isFetching: blocksFetching,
    refetch: refetchBlocks,
  } = useDistrictBlocks(id);

  const {
    data: constituenciesRes,
    isLoading: constituenciesLoading,
    isFetching: constituenciesFetching,
    refetch: refetchConstituencies,
  } = useDistrictConstituencies(id);

  const townVillages = normalizeListResponse(municipalRes);
  const blocks = normalizeListResponse(blocksRes);
  const constituencies = normalizeListResponse(constituenciesRes);

  /*
   * ------------------------------------------------------------------
   * Loading
   * ------------------------------------------------------------------
   */

  if (districtLoading) {
    return (
      <MainLayout title="District Details">
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />

            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>

          <Skeleton className="h-11 w-full max-w-3xl" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>

          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  /*
   * ------------------------------------------------------------------
   * Not found
   * ------------------------------------------------------------------
   */

  if (!district) {
    return (
      <MainLayout title="District Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Globe className="h-8 w-8 text-muted-foreground opacity-40" />
          </div>

          <div className="text-center">
            <h2 className="text-base font-bold text-foreground">
              District not found
            </h2>

            <p className="text-xs text-muted-foreground mt-1">
              The requested district does not exist or is no longer available.
            </p>
          </div>

          <Link to="/geography/districts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Districts
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  /*
   * ------------------------------------------------------------------
   * Actions
   * ------------------------------------------------------------------
   */

  const handleToggle = async () => {
    try {
      await toggleMut.mutateAsync(district.id);
    } catch {
      // Error handled by mutation hook.
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(district.id);
      navigate("/geography/districts");
    } catch {
      // Error handled by mutation hook.
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetchDistrict(),
      refetchMunicipal(),
      refetchBlocks(),
      refetchConstituencies(),
    ]);
  };

  /*
   * ------------------------------------------------------------------
   * Statistics
   * ------------------------------------------------------------------
   */

  const totalUnits =
    townVillages.length + blocks.length + constituencies.length;

  const activeTownVillages = townVillages.filter(
    (item: any) => item.isActive,
  ).length;

  const activeBlocks = blocks.filter((item: any) => item.isActive).length;

  const activeConstituencies = constituencies.filter(
    (item: any) => item.isActive,
  ).length;

  /*
   * ------------------------------------------------------------------
   * Render
   * ------------------------------------------------------------------
   */

  return (
    <MainLayout title={`${district.name} Details`}>
      <div className="space-y-6">
        {/* ============================================================
            HEADER
        ============================================================ */}

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 border-border/60 hover:bg-muted shrink-0"
              onClick={() => navigate("/geography/districts")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-sky-500" />
                </div>

                <h1 className="text-2xl font-extrabold text-foreground">
                  {district.name}
                </h1>

                <StatusBadge active={district.isActive} />
              </div>

              <p className="text-xs text-muted-foreground mt-1 font-medium">
                District administration, geographical units, constituencies and
                statistics.
              </p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {district.code && (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] font-bold"
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {district.code}
                  </Badge>
                )}

                {district.state && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {district.state}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              disabled={districtFetching}
              onClick={handleRefresh}
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 mr-1.5",
                  districtFetching && "animate-spin",
                )}
              />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() =>
                navigate(`/geography/districts?edit=${district.id}`)
              }
            >
              <Edit className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 text-xs",
                district.isActive
                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
              )}
              disabled={toggleMut.isPending}
              onClick={handleToggle}
            >
              {district.isActive ? (
                <>
                  <ToggleRight className="h-3.5 w-3.5 mr-1.5" />
                  Deactivate
                </>
              ) : (
                <>
                  <ToggleLeft className="h-3.5 w-3.5 mr-1.5" />
                  Activate
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-9 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-extrabold text-foreground">
                    Delete "{district.name}"?
                  </AlertDialogTitle>
                </AlertDialogHeader>

                <div className="text-xs text-muted-foreground">
                  This action may affect geographical data associated with this
                  district. Please confirm that you want to continue.
                </div>

                <AlertDialogFooter className="gap-2 sm:gap-0">
                  <AlertDialogCancel className="border-border/60 hover:bg-muted">
                    Cancel
                  </AlertDialogCancel>

                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                    disabled={deleteMut.isPending}
                    onClick={handleDelete}
                  >
                    {deleteMut.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* ============================================================
            TABS
        ============================================================ */}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 max-w-4xl bg-muted/40 p-1 rounded-xl min-h-11 h-auto">
            <TabsTrigger
              value="overview"
              className="rounded-lg text-xs font-semibold py-2"
            >
              Overview
            </TabsTrigger>

            <TabsTrigger
              value="municipal"
              className="rounded-lg text-xs font-semibold py-2"
            >
              Towns/Villages
            </TabsTrigger>

            <TabsTrigger
              value="blocks"
              className="rounded-lg text-xs font-semibold py-2"
            >
              Blocks
            </TabsTrigger>

            <TabsTrigger
              value="constituencies"
              className="rounded-lg text-xs font-semibold py-2"
            >
              Constituencies
            </TabsTrigger>

            <TabsTrigger
              value="statistics"
              className="rounded-lg text-xs font-semibold py-2"
            >
              Statistics
            </TabsTrigger>
          </TabsList>

          {/* ==========================================================
              OVERVIEW
          ========================================================== */}

          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">
                      Administrative Information
                    </h3>

                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Basic information configured for this district.
                    </p>
                  </div>

                  <StatusBadge active={district.isActive} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">
                      District Name
                    </span>

                    <span className="text-foreground font-bold mt-1.5 block text-sm">
                      {district.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">
                      District Code
                    </span>

                    <span className="text-foreground font-mono font-bold mt-1.5 block text-sm">
                      {district.code || "No code set"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">
                      State
                    </span>

                    <span className="text-foreground font-bold mt-1.5 block text-sm">
                      {district.state || "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">
                      Status
                    </span>

                    <div className="mt-1.5">
                      <StatusBadge active={district.isActive} />
                    </div>
                  </div>
                </div>

                {district.description && (
                  <div className="pt-2">
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block mb-1.5">
                      Description
                    </span>

                    <p className="text-foreground text-xs leading-relaxed bg-muted/20 p-4 rounded-xl border">
                      {district.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick statistics */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border border-border/50 bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                    <Building className="h-5 w-5 text-indigo-500" />
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Towns/Villages
                    </span>

                    <h4 className="text-2xl font-extrabold mt-0.5">
                      {municipalLoading ? (
                        <Skeleton className="h-7 w-10" />
                      ) : (
                        townVillages.length
                      )}
                    </h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50 bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                    <Map className="h-5 w-5 text-amber-500" />
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Blocks
                    </span>

                    <h4 className="text-2xl font-extrabold mt-0.5">
                      {blocksLoading ? (
                        <Skeleton className="h-7 w-10" />
                      ) : (
                        blocks.length
                      )}
                    </h4>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/50 bg-card rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-rose-500" />
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Constituencies
                    </span>

                    <h4 className="text-2xl font-extrabold mt-0.5">
                      {constituenciesLoading ? (
                        <Skeleton className="h-7 w-10" />
                      ) : (
                        constituencies.length
                      )}
                    </h4>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Administrative hierarchy */}

            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Activity className="h-4 w-4 text-primary" />

                  <div>
                    <h3 className="font-bold text-foreground text-sm">
                      Administrative Coverage
                    </h3>

                    <p className="text-[11px] text-muted-foreground">
                      Units currently associated with this district.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border bg-muted/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Towns/Villages
                      </span>

                      <Building className="h-4 w-4 text-indigo-500" />
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <span className="text-2xl font-extrabold">
                        {townVillages.length}
                      </span>

                      <span className="text-[10px] text-muted-foreground">
                        {activeTownVillages} active
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Blocks
                      </span>

                      <Map className="h-4 w-4 text-amber-500" />
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <span className="text-2xl font-extrabold">
                        {blocks.length}
                      </span>

                      <span className="text-[10px] text-muted-foreground">
                        {activeBlocks} active
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Constituencies
                      </span>

                      <Landmark className="h-4 w-4 text-rose-500" />
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <span className="text-2xl font-extrabold">
                        {constituencies.length}
                      </span>

                      <span className="text-[10px] text-muted-foreground">
                        {activeConstituencies} active
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Total Associated Units
                  </span>

                  <span className="text-lg font-extrabold">{totalUnits}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==========================================================
              TOWNS / VILLAGES
          ========================================================== */}

          <TabsContent value="municipal" className="mt-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Towns/Villages
                  </h3>

                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Municipal and urban administrative areas belonging to this
                    district.
                  </p>
                </div>

                <Badge variant="outline" className="text-[10px]">
                  {townVillages.length} Total
                </Badge>
              </div>

              {municipalLoading ? (
                <div className="p-4">
                  <Table>
                    <TableBody>
                      <TableLoading columns={4} />
                    </TableBody>
                  </Table>
                </div>
              ) : townVillages.length === 0 ? (
                <EmptyState
                  icon={Building}
                  title="No towns/villages configured"
                  description="There are currently no towns or villages associated with this district."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/20">
                        <TableHead>Town/Village</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {townVillages.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-muted/10">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                                <Building className="h-3.5 w-3.5 text-indigo-500" />
                              </div>

                              <div>
                                <p className="font-semibold text-sm">
                                  {item.name || "Unnamed"}
                                </p>

                                {item.description && (
                                  <p className="text-[10px] text-muted-foreground max-w-65 truncate">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {item.code || "-"}
                          </TableCell>

                          <TableCell className="text-xs">
                            {formatType(item.type)}
                          </TableCell>

                          <TableCell>
                            <StatusBadge active={item.isActive} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ==========================================================
              BLOCKS
          ========================================================== */}

          <TabsContent value="blocks" className="mt-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Blocks</h3>

                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Rural administrative blocks under this district.
                  </p>
                </div>

                <Badge variant="outline" className="text-[10px]">
                  {blocks.length} Total
                </Badge>
              </div>

              {blocksLoading ? (
                <div className="p-4">
                  <Table>
                    <TableBody>
                      <TableLoading columns={4} />
                    </TableBody>
                  </Table>
                </div>
              ) : blocks.length === 0 ? (
                <EmptyState
                  icon={Map}
                  title="No blocks configured"
                  description="There are currently no blocks associated with this district."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/20">
                        <TableHead>Block Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {blocks.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-muted/10">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                                <Map className="h-3.5 w-3.5 text-amber-500" />
                              </div>

                              <div>
                                <p className="font-semibold text-sm">
                                  {item.name || "Unnamed"}
                                </p>

                                {item.blockType && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatType(item.blockType)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs">
                            {item.code || "-"}
                          </TableCell>

                          <TableCell className="text-xs">
                            {item.district?.name || district.name || "-"}
                          </TableCell>

                          <TableCell>
                            <StatusBadge active={item.isActive} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ==========================================================
              CONSTITUENCIES
          ========================================================== */}

          <TabsContent value="constituencies" className="mt-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Constituencies
                  </h3>

                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Parliamentary or legislative constituencies associated with
                    this district.
                  </p>
                </div>

                <Badge variant="outline" className="text-[10px]">
                  {constituencies.length} Total
                </Badge>
              </div>

              {constituenciesLoading ? (
                <div className="p-4">
                  <Table>
                    <TableBody>
                      <TableLoading columns={5} />
                    </TableBody>
                  </Table>
                </div>
              ) : constituencies.length === 0 ? (
                <EmptyState
                  icon={Landmark}
                  title="No constituencies associated"
                  description="There are currently no constituencies associated with this district."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/20">
                        <TableHead>Constituency</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>District</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {constituencies.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-muted/10">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                                <Landmark className="h-3.5 w-3.5 text-rose-500" />
                              </div>

                              <div>
                                <p className="font-semibold text-sm">
                                  {item.name || "Unnamed"}
                                </p>

                                {item.description && (
                                  <p className="text-[10px] text-muted-foreground max-w-55 truncate">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {item.code ? (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                {item.code}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-[9px] uppercase font-bold"
                            >
                              {formatType(item.type)}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-xs">
                            {item.district?.name || district.name || "-"}
                          </TableCell>

                          <TableCell>
                            <StatusBadge active={item.isActive} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ==========================================================
              STATISTICS
          ========================================================== */}

          <TabsContent value="statistics" className="mt-4 space-y-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 className="h-4 w-4 text-primary" />

                  <div>
                    <h3 className="font-bold text-sm text-foreground">
                      District Statistics
                    </h3>

                    <p className="text-[11px] text-muted-foreground">
                      Administrative coverage summary for {district.name}.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border bg-muted/5 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Total Units
                      </span>

                      <Activity className="h-4 w-4 text-primary" />
                    </div>

                    <h4 className="text-3xl font-extrabold mt-3">
                      {totalUnits}
                    </h4>

                    <p className="text-[10px] text-muted-foreground mt-1">
                      Across all loaded administrative categories
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/5 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Towns/Villages
                      </span>

                      <Building className="h-4 w-4 text-indigo-500" />
                    </div>

                    <h4 className="text-3xl font-extrabold mt-3">
                      {townVillages.length}
                    </h4>

                    <p className="text-[10px] text-muted-foreground mt-1">
                      {activeTownVillages} currently active
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/5 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Blocks
                      </span>

                      <Map className="h-4 w-4 text-amber-500" />
                    </div>

                    <h4 className="text-3xl font-extrabold mt-3">
                      {blocks.length}
                    </h4>

                    <p className="text-[10px] text-muted-foreground mt-1">
                      {activeBlocks} currently active
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/5 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Constituencies
                      </span>

                      <Landmark className="h-4 w-4 text-rose-500" />
                    </div>

                    <h4 className="text-3xl font-extrabold mt-3">
                      {constituencies.length}
                    </h4>

                    <p className="text-[10px] text-muted-foreground mt-1">
                      {activeConstituencies} currently active
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active / inactive breakdown */}

            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-sm text-foreground mb-4">
                  Active Unit Breakdown
                </h3>

                <div className="space-y-4">
                  {[
                    {
                      label: "Towns/Villages",
                      total: townVillages.length,
                      active: activeTownVillages,
                    },
                    {
                      label: "Blocks",
                      total: blocks.length,
                      active: activeBlocks,
                    },
                    {
                      label: "Constituencies",
                      total: constituencies.length,
                      active: activeConstituencies,
                    },
                  ].map((item) => {
                    const percentage =
                      item.total > 0
                        ? Math.round((item.active / item.total) * 100)
                        : 0;

                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold">
                            {item.label}
                          </span>

                          <span className="text-[10px] text-muted-foreground">
                            {item.active} / {item.total} active
                          </span>
                        </div>

                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* District metadata */}

            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-sm text-foreground mb-4">
                  Record Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      District ID
                    </span>

                    <p className="font-mono text-xs font-bold mt-1.5 break-all">
                      {district.id}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Created
                    </span>

                    <p className="text-xs font-semibold mt-1.5">
                      {formatDate(district.createdAt)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Last Updated
                    </span>

                    <p className="text-xs font-semibold mt-1.5">
                      {formatDate(district.updatedAt)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                      Current Status
                    </span>

                    <div className="mt-1.5">
                      <StatusBadge active={district.isActive} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ============================================================
            BACK LINK
        ============================================================ */}

        <div className="pt-1">
          <Link to="/geography/districts">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Districts
            </Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}
