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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  Vote,
} from "lucide-react";
import DistrictDetailPage from "./DistrictDetailPage";

const districtSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "District name is required")
    .min(2, "District name must be at least 2 characters")
    .max(100, "District name must be at most 100 characters"),

  code: z
    .string()
    .trim()
    .max(50, "Code must be at most 50 characters")
    .optional()
    .or(z.literal("")),

  state: z
    .string()
    .trim()
    .min(1, "State name is required")
    .min(2, "State name must be at least 2 characters")
    .max(100, "State name must be at most 100 characters"),

  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .or(z.literal("")),

  latitude: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? parseFloat(val) : null)),

  longitude: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? parseFloat(val) : null)),

  boundary: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val) return true;
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, "Boundary must be a valid GeoJSON string")
    .transform((val) => (val ? JSON.parse(val) : null)),
});

type DistrictForm = z.infer<typeof districtSchema>;

export default function DistrictsPage() {
  const params = useParams<{ id?: string }>();
  if (params.id) {
    return <DistrictDetailPage id={params.id} />;
  }
  return <DistrictsList />;
}

function DistrictsList() {
  const { toast } = useToast();
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

  const districtForm = useForm<DistrictForm>({
    resolver: zodResolver(districtSchema),
    defaultValues: {
      name: "",
      code: "",
      state: "",
      description: "",
      latitude: "" as any,
      longitude: "" as any,
      boundary: "" as any,
    },
  });

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
    districtForm.reset({
      name: "",
      code: "",
      state: "",
      description: "",
      latitude: "" as any,
      longitude: "" as any,
      boundary: "" as any,
    });
    setDlg(true);
  };

  const openEdit = (d: any) => {
    setEditing(d);
    districtForm.reset({
      name: d.name || "",
      code: d.code || "",
      state: d.state || "",
      description: d.description || "",
      latitude: d.latitude !== null && d.latitude !== undefined ? String(d.latitude) : "" as any,
      longitude: d.longitude !== null && d.longitude !== undefined ? String(d.longitude) : "" as any,
      boundary: d.boundary ? JSON.stringify(d.boundary, null, 2) : "" as any,
    });
    setDlg(true);
  };

  const save = async (formData: DistrictForm) => {
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        code: formData.code?.trim() || undefined,
        state: formData.state.trim(),
        description: formData.description?.trim() || null,
      };

      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setDlg(false);
      districtForm.reset();
      setEditing(null);
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
                label: "Towns & Villages",
                value: geoStats.townVillages || 0,
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
                label: "Booths",
                value: geoStats.booths || 0,
                Icon: Vote,
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
                      <TableCell colSpan={5} className="py-10 text-center text-xs text-muted-foreground">
                        No districts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((d: any) => (
                      <TableRow key={d.id} className="hover:bg-muted/10 border-b border-border/40">
                        <TableCell className="py-4 px-4 align-middle font-bold text-foreground">
                          {d.name}
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle font-mono text-xs">
                          {d.code || "-"}
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-muted-foreground">
                          {d.state}
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <Badge
                            variant={d.isActive ? "default" : "secondary"}
                            className={cn(
                              d.isActive && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-none dark:bg-emerald-950/30 dark:text-emerald-400"
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

          <form
            onSubmit={districtForm.handleSubmit(save)}
            className="space-y-4 py-2"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="district-name"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="district-name"
                    placeholder="E.g., Mohali"
                    {...districtForm.register("name")}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                      districtForm.formState.errors.name &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />
                  {districtForm.formState.errors.name && (
                    <p className="text-xs font-medium text-destructive">
                      {districtForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="district-code"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Code
                  </Label>
                  <Input
                    id="district-code"
                    placeholder="E.g., MHL"
                    {...districtForm.register("code")}
                    onChange={(e) => {
                      districtForm.setValue("code", e.target.value.toUpperCase(), {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                      districtForm.formState.errors.code &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />
                  {districtForm.formState.errors.code && (
                    <p className="text-xs font-medium text-destructive">
                      {districtForm.formState.errors.code.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="district-state"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  State <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="district-state"
                  placeholder="E.g., Punjab"
                  {...districtForm.register("state")}
                  className={cn(
                    "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                    districtForm.formState.errors.state &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                />
                {districtForm.formState.errors.state && (
                  <p className="text-xs font-medium text-destructive">
                    {districtForm.formState.errors.state.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="district-description"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Description
                </Label>
                <Textarea
                  id="district-description"
                  placeholder="Optional description or notes..."
                  rows={2}
                  {...districtForm.register("description")}
                  className={cn(
                    "bg-muted/20 border-border/60 focus-visible:ring-primary/20 resize-none",
                    districtForm.formState.errors.description &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                />
                {districtForm.formState.errors.description && (
                  <p className="text-xs font-medium text-destructive">
                    {districtForm.formState.errors.description.message}
                  </p>
                )}
              </div>

              {/* ───────────────── LATITUDE + LONGITUDE ───────────────── */}
              <div className="grid grid-cols-2 gap-4">
                {/* LATITUDE */}
                <div className="space-y-2">
                  <Label
                    htmlFor="district-latitude"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Latitude
                  </Label>
                  <Input
                    id="district-latitude"
                    placeholder="E.g., 30.7333"
                    {...districtForm.register("latitude")}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                      districtForm.formState.errors.latitude &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />
                  {districtForm.formState.errors.latitude && (
                    <p className="text-xs font-medium text-destructive">
                      {districtForm.formState.errors.latitude.message}
                    </p>
                  )}
                </div>

                {/* LONGITUDE */}
                <div className="space-y-2">
                  <Label
                    htmlFor="district-longitude"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Longitude
                  </Label>
                  <Input
                    id="district-longitude"
                    placeholder="E.g., 76.7794"
                    {...districtForm.register("longitude")}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                      districtForm.formState.errors.longitude &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />
                  {districtForm.formState.errors.longitude && (
                    <p className="text-xs font-medium text-destructive">
                      {districtForm.formState.errors.longitude.message}
                    </p>
                  )}
                </div>
              </div>

              {/* ───────────────── BOUNDARY GEOJSON ───────────────── */}
              <div className="space-y-2">
                <Label
                  htmlFor="district-boundary"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Boundary (GeoJSON String)
                </Label>
                <Textarea
                  id="district-boundary"
                  placeholder='E.g., { "type": "Polygon", "coordinates": [...] }'
                  rows={3}
                  {...districtForm.register("boundary")}
                  className={cn(
                    "bg-muted/20 border-border/60 focus-visible:ring-primary/20 font-mono text-xs resize-none",
                    districtForm.formState.errors.boundary &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                />
                {districtForm.formState.errors.boundary ? (
                  <p className="text-xs font-medium text-destructive">
                    {districtForm.formState.errors.boundary.message as any}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Must be a valid GeoJSON object (Polygon or MultiPolygon).
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                className="border-border/60 hover:bg-muted"
                onClick={() => {
                  districtForm.reset();
                  setEditing(null);
                  setDlg(false);
                }}
                disabled={createMut.isPending || updateMut.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/95 text-white"
                disabled={createMut.isPending || updateMut.isPending}
              >
                {(createMut.isPending || updateMut.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
