import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useWards, useWardStats } from "@/hooks/useWards";
import { useAuth } from "@/hooks/useAuth";
import { PermissionGate } from "@/components/auth/PermissionGate";
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
} from "lucide-react";

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

  return (
    <MainLayout title="Wards">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Map className="h-7 w-7 text-primary" />
              Ward Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage wards, areas, and constituency geography
            </p>
          </div>
          <PermissionGate module="wards" action="create">
            <Link to="/wards/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add New Ward
              </Button>
            </Link>
          </PermissionGate>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Map className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalWards || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Wards</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalAreas || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Areas</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center">
                    <Users className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalPopulation
                        ? `${(stats.totalPopulation / 1000).toFixed(0)}K`
                        : "0"}
                    </p>
                    <p className="text-xs text-muted-foreground">Population</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center">
                    <Home className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalHouseholds
                        ? `${(stats.totalHouseholds / 1000).toFixed(1)}K`
                        : "0"}
                    </p>
                    <p className="text-xs text-muted-foreground">Households</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ward name or zone..."
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
                  value={zone}
                  onValueChange={(v) => {
                    setZone(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-32">
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
                  <SelectTrigger className="w-36">
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
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="PROPOSED">Proposed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wards Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Wards Directory ({pagination?.total || wards.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Ward Name</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Population</TableHead>
                    <TableHead className="text-right">Households</TableHead>
                    <TableHead className="text-right">Areas</TableHead>
                    <TableHead>Councillor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Stats</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 11 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : wards.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No wards found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    wards.map((ward: any) => {
                      const councillor = ward.councillors?.[0];
                      const openGrievances = ward._count?.grievances || 0;
                      return (
                        <TableRow key={ward.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-muted-foreground">
                            {ward.wardNumber}
                          </TableCell>
                          <TableCell>
                            <Link to={`/wards/${ward.id}`}>
                              <span className="font-medium text-primary hover:underline cursor-pointer">
                                {ward.name}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            {ward.zone ? (
                              <Badge variant="outline" className="text-xs">
                                {ward.zone}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {ward.areaType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {ward.totalPopulation.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {ward.totalHouseholds.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {ward.totalAreas}
                          </TableCell>
                          <TableCell>
                            {councillor ? (
                              <div>
                                <p className="text-sm">{councillor.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {councillor.phone}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Not assigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] ${STATUS_COLORS[ward.status] || ""}`}
                            >
                              {ward.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2 text-xs">
                              <span title="Grievances">
                                {ward._count?.grievances || 0} G
                              </span>
                              <span className="text-muted-foreground">|</span>
                              <span title="Projects">
                                {ward._count?.projects || 0} P
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/wards/${ward.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <PermissionGate module="wards" action="update">
                                <Link to={`/wards/${ward.id}/edit`}>
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

            {/* Pagination */}
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

        {/* Zone Summary */}
        {stats?.byZone && stats.byZone.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.byZone.map((z: any) => (
              <Card key={z.zone}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {z.zone}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Wards</span>
                    <span className="font-medium">{z.count}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Population</span>
                    <span className="font-medium">
                      {z.population.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(z.population / (stats.totalPopulation || 1)) * 100}
                    className="h-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
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
    </MainLayout>
  );
}
