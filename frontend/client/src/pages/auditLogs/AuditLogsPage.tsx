import { useState, useMemo } from "react";
import {
  useAuditLogs,
  useAuditLogStats,
  useAuditLog,
  useExportAuditLogs,
} from "@/hooks/useAuditLogs";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  FileText,
  Search,
  Download,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  User,
  Monitor,
  Clock,
  Activity,
  ArrowRight,
} from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  CREATE:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  LOGIN:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  LOGOUT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  EXPORT:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  SEND_NOTIFICATION:
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  IMPORT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
};

function DiffView({ oldData, newData }: { oldData: any; newData: any }) {
  if (!oldData && !newData)
    return (
      <p className="text-xs text-muted-foreground italic">
        No data changes recorded
      </p>
    );
  const allKeys = [
    ...new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]),
  ];
  if (allKeys.length === 0)
    return (
      <p className="text-xs text-muted-foreground italic">
        No data changes recorded
      </p>
    );

  return (
    <div className="space-y-1.5">
      {allKeys.map((key) => {
        const ov = oldData?.[key];
        const nv = newData?.[key];
        const changed = JSON.stringify(ov) !== JSON.stringify(nv);
        return (
          <div
            key={key}
            className={`p-2 rounded text-xs font-mono ${changed ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800" : "bg-muted/50"}`}
          >
            <span className="font-semibold text-muted-foreground">{key}:</span>
            {changed ? (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="line-through text-red-500">
                  {ov !== undefined ? JSON.stringify(ov) : "—"}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-green-600 font-semibold">
                  {nv !== undefined ? JSON.stringify(nv) : "—"}
                </span>
              </div>
            ) : (
              <span className="ml-2">{JSON.stringify(nv ?? ov)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const exportFn = useExportAuditLogs();

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 30 };
    if (search) p.search = search;
    if (actionFilter !== "all") p.action = actionFilter;
    if (moduleFilter !== "all") p.module = moduleFilter;
    if (dateFrom) p.dateFrom = dateFrom.toISOString().split("T")[0];
    if (dateTo) p.dateTo = dateTo.toISOString().split("T")[0];
    return p;
  }, [search, actionFilter, moduleFilter, dateFrom, dateTo, page]);

  const { data: res, isLoading } = useAuditLogs(params);
  const { data: statsRes } = useAuditLogStats();
  const { data: detailRes } = useAuditLog(selectedId || undefined);

  const logs = res?.data || [];
  const pagination = res?.pagination;
  const stats = statsRes?.data;
  const detail = detailRes?.data;

  return (
    <MainLayout title="Audit Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Audit Logs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track every action across the platform
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportFn(params)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Total Logs",
                value: stats.total,
                Icon: FileText,
                color: "#6366f1",
              },
              {
                label: "Today",
                value: stats.todayCount,
                Icon: Clock,
                color: "#22c55e",
              },
              {
                label: "This Week",
                value: stats.weekCount,
                Icon: Activity,
                color: "#3b82f6",
              },
              {
                label: "Active Users",
                value: stats.recentUsers?.length || 0,
                Icon: User,
                color: "#f59e0b",
              },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${s.color}18` }}
                  >
                    <s.Icon className="h-5 w-5" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {s.value.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {s.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Top Modules & Actions mini chips */}
        {stats && (
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                Top Modules
              </p>
              <div className="flex gap-1 flex-wrap">
                {stats.byModule?.slice(0, 6).map((m: any) => (
                  <Badge
                    key={m.module}
                    variant="secondary"
                    className="text-[10px] cursor-pointer"
                    onClick={() => {
                      setModuleFilter(m.module);
                      setPage(1);
                    }}
                  >
                    {m.module} ({m.count})
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">
                By Action
              </p>
              <div className="flex gap-1 flex-wrap">
                {stats.byAction?.map((a: any) => (
                  <Badge
                    key={a.action}
                    className={`text-[10px] cursor-pointer ${ACTION_COLORS[a.action] || ""}`}
                    onClick={() => {
                      setActionFilter(a.action);
                      setPage(1);
                    }}
                  >
                    {a.action} ({a.count})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search description, user, IP..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={actionFilter}
                onValueChange={(v) => {
                  setActionFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {(stats?.actions || []).map((a: string) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={moduleFilter}
                onValueChange={(v) => {
                  setModuleFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-40">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {(stats?.modules || []).map((m: string) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, "dd MMM") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker
                    mode="single"
                    selected={dateFrom}
                    onSelect={(d) => {
                      setDateFrom(d);
                      setPage(1);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, "dd MMM") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker
                    mode="single"
                    selected={dateTo}
                    onSelect={(d) => {
                      setDateTo(d);
                      setPage(1);
                    }}
                  />
                </PopoverContent>
              </Popover>
              {(search ||
                actionFilter !== "all" ||
                moduleFilter !== "all" ||
                dateFrom ||
                dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSearch("");
                      setActionFilter("all");
                      setModuleFilter("all");
                      setDateFrom(undefined);
                      setDateTo(undefined);
                      setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">createdAt</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead className="max-w-[300px]">Description</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-16 text-muted-foreground"
                    >
                      <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>No audit logs found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: any) => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs whitespace-nowrap">
                        <p>{format(new Date(log.createdAt), "dd MMM yyyy")}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(log.createdAt), "hh:mm:ss a")}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {log.user?.name || "System"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {log.user?.email}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono"
                        >
                          {log.module || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">
                        {log.description || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.ipAddress || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedId(log.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {pagination.total.toLocaleString()} logs • Page{" "}
                  {pagination.page}/{pagination.totalPages}
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Audit Log Detail
            </DialogTitle>
          </DialogHeader>
          {detail ? (
            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-4 pr-4">
                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "createdAt",
                      value: format(
                        new Date(detail.createdAt),
                        "dd MMM yyyy, hh:mm:ss a",
                      ),
                    },
                    {
                      label: "User",
                      value: detail.user
                        ? `${detail.user.name} (${detail.user.email})`
                        : "System",
                    },
                    { label: "Role", value: detail.user?.role || "—" },
                    { label: "Action", value: detail.action, badge: true },
                    { label: "Module", value: detail.module || "—" },
                    {
                      label: "Record ID",
                      value: detail.recordId || "—",
                      mono: true,
                    },
                    {
                      label: "IP Address",
                      value: detail.ipAddress || "—",
                      mono: true,
                    },
                    {
                      label: "User Agent",
                      value: detail.userAgent
                        ? detail.userAgent.substring(0, 60) + "..."
                        : "—",
                    },
                  ].map((f) => (
                    <div key={f.label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">
                        {f.label}
                      </p>
                      {f.badge ? (
                        <Badge
                          className={`mt-1 text-xs ${ACTION_COLORS[f.value] || ""}`}
                        >
                          {f.value}
                        </Badge>
                      ) : (
                        <p
                          className={`text-sm font-medium mt-0.5 ${f.mono ? "font-mono text-xs" : ""}`}
                        >
                          {f.value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Description */}
                {detail.description && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">
                      Description
                    </p>
                    <p className="text-sm mt-0.5">{detail.description}</p>
                  </div>
                )}

                {/* Data Changes */}
                <div className="p-3 rounded-lg border">
                  <p className="text-xs font-semibold mb-2">Data Changes</p>
                  <DiffView oldData={detail.oldData} newData={detail.newData} />
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
