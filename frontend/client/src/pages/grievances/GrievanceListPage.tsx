import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useGrievances,
  useGrievanceStats,
  useGrievanceAnalytics,
  getStatusInfo,
  getPriorityInfo,
  getCategoryInfo,
  GRIEVANCE_STATUSES,
  PRIORITIES,
  CATEGORIES,
  SOURCES,
} from "@/hooks/useGrievances";
import { useWards } from "@/hooks/useWards";
import { useDepartments } from "@/hooks/useDepartments";
import { PermissionGate } from "@/components/auth/PermissionGate";
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
import { MainLayout } from "@/components/layout/MainLayout";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MessageSquare,
  Plus,
  Search,
  Eye,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function GrievanceListPage() {
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (wardFilter !== "all") p.wardId = wardFilter;
    if (statusFilter !== "all") p.status = statusFilter;
    if (priorityFilter !== "all") p.priority = priorityFilter;
    if (categoryFilter !== "all") p.category = categoryFilter;
    return p;
  }, [search, wardFilter, statusFilter, priorityFilter, categoryFilter, page]);

  const { data: gRes, isLoading } = useGrievances(params);
  const { data: statsRes } = useGrievanceStats(
    wardFilter !== "all" ? wardFilter : undefined,
  );
  const { data: analyticsRes } = useGrievanceAnalytics(6);
  const { data: wardsRes } = useWards({ limit: 100 });
  const { data: deptsRes } = useDepartments();

  const grievances = gRes?.data || [];
  const pagination = gRes?.pagination;
  const stats = statsRes?.data;
  const trend = analyticsRes?.data?.trend || [];
  const wards = wardsRes?.data?.wards || [];
  const departments = deptsRes?.data || [];

  // Build dept map for display
  const deptMap = useMemo(() => {
    const m: Record<string, string> = {};
    (departments || []).forEach((d: any) => {
      m[d.id] = d.name;
    });
    return m;
  }, [departments]);

  const reset = () => {
    setSearch("");
    setWardFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setPage(1);
  };

  return (
    <MainLayout title="Grievances">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-primary" /> Grievances
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track and resolve citizen complaints
            </p>
          </div>
          <PermissionGate module="grievances" action="create">
            <Link to="/grievances/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New Grievance
              </Button>
            </Link>
          </PermissionGate>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              {
                label: "Total",
                value: stats.total,
                Icon: MessageSquare,
                color: "#6366f1",
              },
              {
                label: "Open",
                value: stats.open,
                Icon: Clock,
                color: "#3b82f6",
              },
              {
                label: "In Progress",
                value: stats.inProgress,
                Icon: TrendingUp,
                color: "#f59e0b",
              },
              // {
              //   label: "Escalated",
              //   value: stats.escalated,
              //   Icon: AlertTriangle,
              //   color: "#ef4444",
              // },
              {
                label: "Resolved",
                value: stats.resolved,
                Icon: CheckCircle2,
                color: "#22c55e",
              },
              // {
              //   label: "Overdue",
              //   value: stats.overdue,
              //   Icon: XCircle,
              //   color: "#dc2626",
              // },
              {
                label: "Resolution",
                value: `${stats.resolutionRate}%`,
                Icon: TrendingUp,
                color: "#10b981",
              },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${s.color}20` }}
                  >
                    <s.Icon className="h-4 w-4" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          {trend.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="created"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Created"
                      />
                      <Line
                        type="monotone"
                        dataKey="resolved"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Resolved"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          {stats?.byCategory && stats.byCategory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.byCategory.slice(0, 8)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" fontSize={10} />
                      <YAxis
                        dataKey="category"
                        type="category"
                        width={85}
                        fontSize={10}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#6366f1"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ticket, name, phone..."
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
                    {GRIEVANCE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={priorityFilter}
                  onValueChange={(v) => {
                    setPriorityFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.icon} {p.label}
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
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((c) => (
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
                {(search ||
                  wardFilter !== "all" ||
                  statusFilter !== "all" ||
                  priorityFilter !== "all" ||
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
                    <TableHead className="w-32">Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Complainant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : grievances.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No grievances found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    grievances.map((g: any) => {
                      const sI = getStatusInfo(g.status);
                      const pI = getPriorityInfo(g.priority);
                      const cI = getCategoryInfo(g.category);
                      return (
                        <TableRow
                          key={g.id}
                          className={`hover:bg-muted/50 ${g.isOverdue ? "bg-red-50/50 dark:bg-red-950/20" : ""}`}
                        >
                          <TableCell>
                            <Link to={`/grievances/${g.id}`}>
                              <span className="font-mono text-xs text-primary hover:underline cursor-pointer font-semibold">
                                {g.ticketNumber}
                              </span>
                            </Link>
                            {g.isOverdue && (
                              <Badge
                                variant="destructive"
                                className="text-[8px] ml-1 px-1"
                              >
                                OVERDUE
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link to={`/grievances/${g.id}`}>
                              <p className="font-medium text-sm hover:underline cursor-pointer max-w-[180px] truncate">
                                {g.subject}
                              </p>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {g.complainantName || "Unknown"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {g.complainantPhone}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-[10px] gap-1"
                            >
                              <span>{cI.icon}</span>
                              {cI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            #{g.ward?.wardNumber} {g.ward?.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {g.assignedDept
                              ? deptMap[g.assignedDept] || g.assignedDept
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${pI.color}`}>
                              {pI.icon} {pI.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${sI.color}`}>
                              {sI.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(g.createdAt), {
                              addSuffix: false,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/grievances/${g.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
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
                  {pagination.total})
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
