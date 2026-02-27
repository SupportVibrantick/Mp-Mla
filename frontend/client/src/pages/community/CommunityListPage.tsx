import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useCommunityGroups,
  useCommunityGroupStats,
  getTypeInfo,
  COMMUNITY_TYPES,
} from "@/hooks/useCommunityGroups";
import { useWards } from "@/hooks/useWards";
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
} from "lucide-react";

export default function CommunityListPage() {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);

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
  const wards = wardsRes?.data?.data || [];

  return (
    <MainLayout title="Community Groups">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Community Groups
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage RWAs, clubs, associations, and community organizations
            </p>
          </div>
          <PermissionGate module="community_groups" action="create">
            <Link to="/community/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Group
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
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">
                      Active Groups
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalMembers?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Members
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">M</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalMale?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Male Members
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/15 flex items-center justify-center">
                    <span className="text-pink-600 font-bold text-sm">F</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats?.totalFemale?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Female Members
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <UserX className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.inactive || 0}</p>
                    <p className="text-xs text-muted-foreground">Inactive</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Type-wise Distribution */}
        {stats?.byType && stats.byType.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Distribution by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {stats.byType.map((t: any) => {
                  const info = getTypeInfo(t.type);
                  const Icon = info.icon;

                  return (
                    <div
                      key={t.type}
                      className="text-center p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setTypeFilter(t.type);
                        setPage(1);
                      }}
                    >
                      <Icon className="h-6 w-6 mx-auto" />{" "}
                      <p className="text-lg font-bold mt-1">{t.count}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {info.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.members.toLocaleString()} members
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
                  placeholder="Search by name, head name, or registration..."
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
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-44">
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
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Groups ({pagination?.total || groups.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Ward / Area</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead>Head Person</TableHead>
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
                  ) : groups.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No community groups found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    groups.map((g: any) => {
                      const info = getTypeInfo(g.type);
                      const Icon = info.icon;
                      return (
                        <TableRow key={g.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Link to={`/community/${g.id}`}>
                              <span className="font-medium text-primary hover:underline cursor-pointer">
                                {g.name}
                              </span>
                            </Link>
                            {g.registrationNo && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Reg: {g.registrationNo}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-xs gap-1"
                            >
                              <Icon className="h-3 w-3" />

                              {info.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">
                                #{g.ward.wardNumber} {g.ward.name}
                              </p>
                              {g.wardArea && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {g.wardArea.name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <p className="font-mono font-medium">
                                {(g.memberCount || 0).toLocaleString()}
                              </p>
                              {(g.maleMembers > 0 || g.femaleMembers > 0) && (
                                <p className="text-[10px]">
                                  <span className="text-blue-600">
                                    M:{g.maleMembers || 0}
                                  </span>
                                  {" / "}
                                  <span className="text-pink-600">
                                    F:{g.femaleMembers || 0}
                                  </span>
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {g.headName ? (
                              <div>
                                <p className="text-sm">{g.headName}</p>
                                {g.headPhone && (
                                  <p className="text-xs text-muted-foreground">
                                    {g.headPhone}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Not assigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] ${
                                g.isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              {g.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/community/${g.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Eye className="h-4 w-4" />
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

        {/* Ward-wise Distribution */}
        {stats?.byWard && stats.byWard.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ward-wise Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.byWard.map((w: any) => (
                  <div key={w.wardId} className="flex items-center gap-3">
                    <span className="text-xs w-32 truncate">
                      #{w.wardNumber} {w.wardName}
                    </span>
                    <Progress
                      value={(w.count / (stats.total || 1)) * 100}
                      className="h-2 flex-1"
                    />
                    <span className="font-mono text-xs w-20 text-right">
                      {w.count} groups
                    </span>
                    <span className="font-mono text-xs w-24 text-right text-muted-foreground">
                      {w.members.toLocaleString()} members
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
