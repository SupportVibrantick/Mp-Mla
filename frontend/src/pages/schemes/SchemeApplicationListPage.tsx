import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  useSchemeApplications,
  useSchemes,
  getSchemeApplicationStatusInfo,
  SCHEME_APPLICATION_STATUSES,
} from "@/hooks/useSchemes";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent } from "@/components/ui/card";
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
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { format } from "date-fns";

export default function SchemeApplicationListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [schemeFilter, setSchemeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p: Record<string, any> = { page, limit: 20 };
    if (search) p.search = search;
    if (statusFilter !== "all") p.status = statusFilter;
    if (schemeFilter !== "all") p.schemeId = schemeFilter;
    return p;
  }, [search, statusFilter, schemeFilter, page]);

  const { data: sRes, isLoading } = useSchemeApplications(params);
  const { data: schemesRes } = useSchemes({ limit: 100 });
  const applications = sRes?.data || [];
  const pagination = sRes?.pagination;
  const schemes = schemesRes?.data || [];

  return (
    <MainLayout title="Scheme Applications">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Scheme Applications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage beneficiary applications across all schemes
            </p>
          </div>
          <PermissionGate module="scheme_applications" action="create">
            <Link to="/schemes/applications/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Application
              </Button>
            </Link>
          </PermissionGate>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, application #..."
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
                  value={schemeFilter}
                  onValueChange={(v) => {
                    setSchemeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schemes</SelectItem>
                    {schemes.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
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
                    {SCHEME_APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
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
                    <TableHead>Application #</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Scheme</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
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
                  ) : applications.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground"
                      >
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No applications found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((a: any) => {
                      const stInfo = getSchemeApplicationStatusInfo(a.status);
                      return (
                        <TableRow key={a.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Link to={`/schemes/applications/${a.id}`}>
                              <span className="font-mono text-xs text-primary hover:underline cursor-pointer">
                                {a.applicationNumber}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {a.beneficiaryName}
                                </p>
                                {a.beneficiaryPhone && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {a.beneficiaryPhone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {a.scheme?.name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {a.ward
                              ? `#${a.ward.wardNumber} ${a.ward.name}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {a.assignedTo?.name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${stInfo.color}`}>
                              {stInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(a.createdAt), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to={`/schemes/applications/${a.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <PermissionGate
                                module="scheme_applications"
                                action="update"
                              >
                                <Link
                                  to={`/schemes/applications/${a.id}/edit`}
                                >
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