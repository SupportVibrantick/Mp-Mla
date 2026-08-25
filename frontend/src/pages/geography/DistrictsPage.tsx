import { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  useDistrictsGeo,
  useCreateDistrict,
  useUpdateDistrict,
  useDeleteDistrict,
  useToggleDistrict,
} from "@/hooks/useDistrictsGeography";
import { useGeographyStats } from "@/hooks/useConstituencies";
import { toast } from "sonner";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
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
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Globe,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Map,
  MapPin,
  Building,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import DistrictDetailPage from "./DistrictDetailPage";

const emptyForm = {
  name: "",
  code: "",
  state: "",
  description: "",
};

export default function DistrictsPage() {
  const params = useParams<{ id?: string }>();
  if (params.id) {
    return <DistrictDetailPage id={params.id} />;
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const p: Record<string, any> = { page, limit: 10 };
    if (search) p.search = search;
    if (statusFilter !== "all") p.status = statusFilter;
    return p;
  }, [search, statusFilter, page]);

  const { data: res, isLoading } = useDistrictsGeo(queryParams);
  const { data: geoStatsRes } = useGeographyStats();
  const createMut = useCreateDistrict();
  const updateMut = useUpdateDistrict();
  const deleteMut = useDeleteDistrict();
  const toggleMut = useToggleDistrict();

  const [dlg, setDlg] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const result = res?.data;
  const items: any[] = Array.isArray(result) ? result : result?.items || [];
  const pagination =
    result?.totalPages !== undefined
      ? {
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
          hasNextPage: result.page < result.totalPages,
          hasPrevPage: result.page > 1,
        }
      : null;

  const geoStats = geoStatsRes?.data;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDlg(true);
  };

  const openEdit = (d: any) => {
    setEditing(d);
    setForm({
      name: d.name || "",
      code: d.code || "",
      state: d.state || "",
      description: d.description || "",
    });
    setDlg(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter the district name.");
      return;
    }
    if (form.name.trim().length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    if (!form.state.trim()) {
      toast.error("Please enter the state.");
      return;
    }
    if (form.code && form.code.length > 50) {
      toast.error("Code must be at most 50 characters.");
      return;
    }
    if (form.description && form.description.length > 500) {
      toast.error("Description must be at most 500 characters.");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code || undefined,
        state: form.state.trim(),
        description: form.description || null,
      };
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setDlg(false);
    } catch {
      // errors handled by hook onError toasts
    }
  };

  const reset = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  return (
    <MainLayout title="Districts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Globe className="h-7 w-7 text-primary" /> Districts
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Manage the districts of your constituency. Click a district to view sub-geographies.
            </p>
          </div>
          <PermissionGate module="constituency" action="create">
            <Button
              className="gap-2 w-full sm:w-auto justify-center bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />
              Add District
            </Button>
          </PermissionGate>
        </div>

        {/* Stats */}
        {geoStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                label: "Districts",
                value: geoStats.districts || 0,
                Icon: Globe,
                color: "text-sky-500",
                bgColor: "bg-sky-50 dark:bg-sky-950/30",
                borderColor: "border-sky-100 dark:border-sky-950/50",
              },
              {
                label: "Blocks",
                value: geoStats.blocks || 0,
                Icon: Map,
                color: "text-amber-500",
                bgColor: "bg-amber-50 dark:bg-amber-950/30",
                borderColor: "border-amber-100 dark:border-amber-950/50",
              },
              {
                label: "Municipal Areas",
                value: geoStats.municipalAreas || 0,
                Icon: Building,
                color: "text-indigo-500",
                bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
                borderColor: "border-indigo-100 dark:border-indigo-950/50",
              },
              {
                label: "Wards",
                value: geoStats.wards || 0,
                Icon: MapPin,
                color: "text-emerald-500",
                bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
                borderColor: "border-emerald-100 dark:border-emerald-950/50",
              },
              {
                label: "Villages",
                value: geoStats.villages || 0,
                Icon: MapPin,
                color: "text-violet-500",
                bgColor: "bg-violet-50 dark:bg-violet-950/30",
                borderColor: "border-violet-100 dark:border-violet-950/50",
              },
            ].map((s, i) => (
              <Card
                key={i}
                className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl"
              >
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                  <div className="flex justify-between items-center">
                    <div className={cn("p-2 rounded-xl border", s.bgColor, s.borderColor)}>
                      <s.Icon className={cn("h-4 w-4", s.color)} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                      {s.label}
                    </p>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                      {s.value}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex gap-2.5 flex-wrap w-full lg:w-auto">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {(search || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reset}
                    className="text-xs h-10 px-3 text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">District</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Code</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">State</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j} className="py-4 px-4">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="text-center py-16 text-xs text-muted-foreground">
                        <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-sm">No districts found matching your filters.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((d: any) => (
                      <TableRow
                        key={d.id}
                        className={cn(
                          "hover:bg-muted/10 transition-colors border-b border-border/40",
                          !d.isActive && "opacity-50"
                        )}
                      >
                        <TableCell className="py-4 px-4">
                          <Link to={`/geography/districts/${d.id}`}>
                            <p className="font-semibold text-primary hover:underline text-sm flex items-center gap-2 cursor-pointer">
                              <Globe className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                              {d.name}
                            </p>
                            {d.description && (
                              <p className="text-[10px] text-muted-foreground max-w-[220px] truncate font-medium mt-0.5">
                                {d.description}
                              </p>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          {d.code ? (
                            <Badge variant="outline" className="font-mono text-[10px] font-bold px-2 py-0.5 border-border/80">
                              {d.code}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-xs font-semibold text-foreground">
                          {d.state || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Badge
                            className={cn(
                              "text-[9px] sm:text-[10px] font-semibold border shadow-none",
                              d.isActive
                                ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground border-border/50"
                            )}
                          >
                            {d.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/geography/districts/${d.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" title="View details">
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </Link>
                            <PermissionGate module="constituency" action="update">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                disabled={toggleMut.isPending}
                                onClick={() => toggleMut.mutate(d.id)}
                                title={d.isActive ? "Deactivate" : "Activate"}
                              >
                                {d.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={() => openEdit(d)}>
                                <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate module="constituency" action="delete">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-extrabold text-foreground">
                                      Delete "{d.name}"?
                                    </AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2 sm:gap-0">
                                    <AlertDialogCancel className="border-border/60 hover:bg-muted">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                                      onClick={() => deleteMut.mutate(d.id)}
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-border/40">
                <p className="text-xs text-muted-foreground font-semibold">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted"
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

      {/* Add/Edit Dialog */}
      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editing ? "Edit District" : "Add New District"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="E.g., Mohali"
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="E.g., MHL"
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                State <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.state}
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                placeholder="E.g., Punjab"
                className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="District description or notes"
                className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="border-border/60 hover:bg-muted" onClick={() => setDlg(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/95 text-white"
              onClick={save}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

