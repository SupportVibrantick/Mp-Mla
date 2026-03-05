import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useInstitutions,
  useInstitutionStats,
  getCategoryInfo,
  getStatusInfo,
  INSTITUTION_CATEGORIES,
} from "@/hooks/useInstitutions";
import { useWards } from "@/hooks/useWards";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
} from "lucide-react";

export default function InstitutionListPage() {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

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

  const institutions = instRes?.data || [];
  const pagination = instRes?.pagination;
  const stats = statsRes?.data;
  const wards = wardsRes?.data?.wards || [];

  // Group categories for filter dropdown
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
          <PermissionGate module="institutions" action="create">
            <Link to="/institutions/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Institution
              </Button>
            </Link>
          </PermissionGate>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                      className="text-center p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setCategoryFilter(c.category);
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
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="UNDER_MAINTENANCE">
                      Maintenance
                    </SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="PROPOSED">Proposed</SelectItem>
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
                            <Link to={`/wards/${inst.ward.id}`}>
                              <span className="text-sm text-primary hover:underline cursor-pointer">
                                #{inst.ward.wardNumber} {inst.ward.name}
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
