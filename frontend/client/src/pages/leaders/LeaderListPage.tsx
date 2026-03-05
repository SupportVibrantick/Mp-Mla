import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useLeaders,
  useLeaderStats,
  useDeleteLeader,
  getCategoryInfo,
  LEADER_CATEGORIES,
  RELATIONS,
  INFLUENCES,
} from "@/hooks/useLeaders";
import { useWards } from "@/hooks/useWards";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { MainLayout } from "@/components/layout/MainLayout";
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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

  const leaders = res?.data || [];
  const pagination = res?.pagination;
  const stats = statsRes?.data;
  const wards = wardsRes?.data?.wards || [];

  // Top categories for mini bar chart
  const topCategories = (stats?.byCategory || []).slice(0, 6);
  const maxCatCount =
    topCategories.length > 0
      ? Math.max(...topCategories.map((c: any) => c.count))
      : 1;

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
          <div className="flex gap-2">
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
              <Link to="/leaders/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Add Leader
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>

        {/* ─── Stats Row ───────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
              // {
              //   label: "Upcoming 7 Days",
              //   value: stats.upcoming7,
              //   Icon: Cake,
              //   color: "#f59e0b",
              // },
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
                      <span className="text-lg flex-shrink-0">{info.icon}</span>
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
                    {LEADER_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
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
                          {/* Leader Info */}
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
                                  <span className="absolute -top-1 -right-1 text-sm">
                                    🎂
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

                          {/* Category */}
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-[10px] gap-1"
                            >
                              <span>{cInfo.icon}</span>
                              {cInfo.label}
                            </Badge>
                          </TableCell>

                          {/* Ward */}
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

                          {/* Relation */}
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

                          {/* Influence */}
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

                          {/* Birthday */}
                          <TableCell>
                            <div>
                              <p className="text-xs">
                                {format(new Date(l.dateOfBirth), "dd MMM yyyy")}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Age {l.age}
                              </p>
                              {l.isBirthdayToday ? (
                                <Badge className="text-[9px] bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 mt-0.5">
                                  🎂 Today!
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

                          {/* Actions */}
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
