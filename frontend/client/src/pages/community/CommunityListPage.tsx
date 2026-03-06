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
  TrendingUp,
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
  const wards = wardsRes?.data?.wards || [];

  const reset = () => {
    setSearch("");
    setWardFilter("all");
    setTypeFilter("all");
    setActiveFilter("all");
    setPage(1);
  };

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
          <Card className="overflow-hidden border-none bg-transparent shadow-none">
            <CardHeader className="px-0 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Community Distribution
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Statistical breakdown by organization category
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                {stats.byType.map((t: any) => {
                  const info = getTypeInfo(t.type);
                  const Icon = info.icon;

                  // Dynamic color mapping
                  const colors: Record<
                    string,
                    { bg: string; text: string; light: string }
                  > = {
                    MARKET: {
                      bg: "bg-blue-500",
                      text: "text-blue-600",
                      light: "bg-blue-50",
                    },
                    SLUM: {
                      bg: "bg-amber-500",
                      text: "text-amber-600",
                      light: "bg-amber-50",
                    },
                    SPORTS_TEAM: {
                      bg: "bg-orange-500",
                      text: "text-orange-600",
                      light: "bg-orange-50",
                    },
                    CLUB: {
                      bg: "bg-indigo-500",
                      text: "text-indigo-600",
                      light: "bg-indigo-50",
                    },
                    RWA: {
                      bg: "bg-violet-500",
                      text: "text-violet-600",
                      light: "bg-violet-50",
                    },
                    SENIOR_CITIZEN: {
                      bg: "bg-emerald-500",
                      text: "text-emerald-600",
                      light: "bg-emerald-50",
                    },
                    BUDDHIJEEVI: {
                      bg: "bg-sky-500",
                      text: "text-sky-600",
                      light: "bg-sky-50",
                    },
                    WOMEN_GROUP: {
                      bg: "bg-pink-500",
                      text: "text-pink-600",
                      light: "bg-pink-50",
                    },
                    YOUTH_GROUP: {
                      bg: "bg-cyan-500",
                      text: "text-cyan-600",
                      light: "bg-cyan-50",
                    },
                    CULTURAL_ORG: {
                      bg: "bg-rose-500",
                      text: "text-rose-600",
                      light: "bg-rose-50",
                    },
                    NGO: {
                      bg: "bg-teal-500",
                      text: "text-teal-600",
                      light: "bg-teal-50",
                    },
                    FESTIVAL_COMMITTEE: {
                      bg: "bg-yellow-500",
                      text: "text-yellow-600",
                      light: "bg-yellow-50",
                    },
                    TRADE_UNION: {
                      bg: "bg-slate-500",
                      text: "text-slate-600",
                      light: "bg-slate-50",
                    },
                    OTHER: {
                      bg: "bg-gray-400",
                      text: "text-gray-500",
                      light: "bg-gray-50",
                    },
                  };

                  const theme = colors[t.type] || colors.OTHER;

                  return (
                    <div
                      key={t.type}
                      className="group relative flex flex-col p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-pointer overflow-hidden"
                      onClick={() => {
                        setTypeFilter(t.type);
                        setPage(1);
                        window.scrollTo({ top: 400, behavior: "smooth" });
                      }}
                    >
                      {/* Decorative Background Blob */}
                      <div
                        className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${theme.bg}`}
                      />

                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`p-2.5 rounded-lg ${theme.light} ${theme.text} group-hover:scale-110 transition-transform`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black tracking-tight">
                            {t.count}
                          </p>
                          <p className="text-[9px] font-medium uppercase text-muted-foreground">
                            Groups
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                          {info.label}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex -space-x-1">
                            <div className="w-3.5 h-3.5 rounded-full border border-background bg-muted flex items-center justify-center">
                              <Users className="w-2 h-2 text-muted-foreground" />
                            </div>
                          </div>
                          <p className="text-[10px] font-semibold text-muted-foreground">
                            {t.members.toLocaleString()}{" "}
                            <span className="font-normal opacity-70">
                              people
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Active Indicator Bar (only visible on hover or if filtered) */}
                      <div
                        className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ${typeFilter === t.type ? "w-full " + theme.bg : "w-0 group-hover:w-full " + theme.bg}`}
                      />
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
                {(search ||
                  wardFilter !== "all" ||
                  typeFilter !== "all" ||
                  activeFilter !== "all") && (
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
