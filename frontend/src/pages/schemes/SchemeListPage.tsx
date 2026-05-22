import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useSchemes,
  useSchemeStats,
  getSchemeStatusInfo,
  SCHEME_STATUSES,
  SCHEME_LEVELS,
} from "@/hooks/useSchemes";
import { useDepartments } from "@/hooks/useDepartments";
import { formatCurrency } from "@/hooks/useFunds";
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
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function SchemeListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (statusFilter !== "all") p.status = statusFilter;
    if (levelFilter !== "all") p.level = levelFilter;
    return p;
  }, [search, statusFilter, levelFilter, page]);

  const { data: sRes, isLoading } = useSchemes(params);
  const { data: statsRes } = useSchemeStats();
  const schemes = sRes?.data || [];
  const pagination = sRes?.pagination;
  const stats = statsRes?.data;

  return (
    <MainLayout title="Schemes">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Government Schemes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Central, State & Local welfare schemes
            </p>
          </div>
          <PermissionGate module="schemes" action="create">
            <Link to="/schemes/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Scheme
              </Button>
            </Link>
          </PermissionGate>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              {
                label: "Total Schemes",
                value: stats.total,
                icon: FileText,
                color: "#6366f1",
              },
              {
                label: "Active",
                value: stats.active,
                icon: FileText,
                color: "#22c55e",
              },
              {
                label: "Beneficiaries",
                value: stats.totalBeneficiaries.toLocaleString(),
                icon: Users,
                color: "#3b82f6",
              },
              {
                label: "Disbursed",
                value: formatCurrency(stats.totalDisbursed),
                icon: Target,
                color: "#f59e0b",
              },
              {
                label: "Coverage",
                value: `${stats.overallCoverage}%`,
                icon: Target,
                color: "#8b5cf6",
              },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${s.color}20` }}
                  >
                    <s.icon className="h-4 w-4" style={{ color: s.color }} />
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schemes..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {SCHEME_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={levelFilter}
                  onValueChange={(v) => {
                    setLevelFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {SCHEME_LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.icon} {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <TableHead>Scheme</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-center">Beneficiaries</TableHead>
                    <TableHead className="text-center">Coverage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : schemes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No schemes found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    schemes.map((s: any) => {
                      const stInfo = getSchemeStatusInfo(s.status);
                      return (
                        <TableRow key={s.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Link to={`/schemes/${s.id}`}>
                              <span className="font-medium text-primary hover:underline cursor-pointer">
                                {s.name}
                              </span>
                            </Link>
                            {s.wardCount > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                {s.wardCount} wards covered
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.departmentName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {s.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(s.budget)}
                          </TableCell>
                          <TableCell className="text-center">
                            <p className="font-mono text-sm">
                              {s.totalBeneficiaries.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              / {s.totalTarget.toLocaleString()}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress
                                value={s.coverage}
                                className="h-1.5 w-16"
                              />
                              <span className="text-xs font-mono">
                                {s.coverage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${stInfo.color}`}>
                              {stInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/schemes/${s.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <PermissionGate module="schemes" action="update">
                                <Link to={`/schemes/${s.id}/edit`}>
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
                  Page {pagination.page}/{pagination.totalPages}
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
