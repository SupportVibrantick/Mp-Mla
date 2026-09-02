import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

import {
  useTownVillages,
  useCreateTownVillage,
  useUpdateTownVillage,
  useDeleteTownVillage,
  useToggleTownVillage,
  useTownVillageDistricts,
  useTownVillageBlocks,
  useTownVillageConstituencies,
  type TownVillage,
  type TownVillagePayload,
} from "@/hooks/useTownVillages";
import { useGeographyStats } from "@/hooks/useConstituencies";

import { MainLayout } from "@/components/layout/MainLayout";
import { PermissionGate } from "@/components/auth/PermissionGate";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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

import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import {
  Map,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Building2,
  Home,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Globe,
  Building,
  Vote,
} from "lucide-react";

/* =========================================================
   VALIDATION
========================================================= */

const townVillageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Town/Village name is required")
    .min(2, "Name must be at least 2 characters")
    .max(150, "Name must be at most 150 characters"),

  code: z
    .string()
    .trim()
    .max(50, "Code must be at most 50 characters")
    .optional()
    .or(z.literal("")),

  districtId: z.string().min(1, "District is required"),

  blockId: z.string().optional().or(z.literal("")),

  constituencyId: z.string().optional().or(z.literal("")),

  type: z.enum(["TOWN", "VILLAGE"], {
    required_error: "Please select type",
  }),

  nature: z.enum(["URBAN", "RURAL"], {
    required_error: "Please select geography nature",
  }),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be at most 1000 characters")
    .optional()
    .or(z.literal("")),

  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Pincode must contain exactly 6 digits")
    .optional()
    .or(z.literal("")),

  latitude: z.string().optional().or(z.literal("")),

  longitude: z.string().optional().or(z.literal("")),
});

type TownVillageForm = z.infer<typeof townVillageSchema>;

/* =========================================================
   DEFAULT FORM
========================================================= */

const defaultValues: TownVillageForm = {
  name: "",
  code: "",
  districtId: "",
  blockId: "",
  constituencyId: "",
  type: "VILLAGE",
  nature: "RURAL",
  description: "",
  pincode: "",
  latitude: "",
  longitude: "",
};

/* =========================================================
   HELPERS
========================================================= */

function extractItems(res: any): any[] {
  const data = res?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

function getPagination(res: any) {
  const data = res?.data;

  if (!data || Array.isArray(data)) {
    return null;
  }

  if (data.totalPages === undefined) {
    return null;
  }

  return {
    page: Number(data.page || 1),
    totalPages: Number(data.totalPages || 1),
    total: Number(data.total || 0),
    hasNextPage: Number(data.page || 1) < Number(data.totalPages || 1),
    hasPrevPage: Number(data.page || 1) > 1,
  };
}

function districtName(item: TownVillage) {
  return item.district?.name || "—";
}

function blockName(item: TownVillage) {
  return item.block?.name || "—";
}

/* =========================================================
   PAGE
========================================================= */

export default function TownVillagesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [natureFilter, setNatureFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");

  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TownVillage | null>(null);

  /* =========================================================
     FORM
  ========================================================= */

  const form = useForm<TownVillageForm>({
    resolver: zodResolver(townVillageSchema),
    defaultValues,
  });

  const selectedDistrictId = form.watch("districtId");

  /* =========================================================
     QUERY PARAMS
  ========================================================= */

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      page,
      limit: 10,
    };

    if (search.trim()) {
      params.search = search.trim();
    }

    if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    if (typeFilter !== "all") {
      params.type = typeFilter;
    }

    if (natureFilter !== "all") {
      params.nature = natureFilter;
    }

    if (districtFilter !== "all") {
      params.districtId = districtFilter;
    }

    return params;
  }, [page, search, statusFilter, typeFilter, natureFilter, districtFilter]);

  /* =========================================================
     QUERIES
  ========================================================= */

  const {
    data: townVillagesRes,
    isLoading,
    isFetching,
    refetch,
  } = useTownVillages(queryParams);

  const { data: districtsRes } = useTownVillageDistricts();
  const { data: blocksRes } = useTownVillageBlocks(selectedDistrictId);
  const { data: constituenciesRes } = useTownVillageConstituencies();
  const { data: geoStatsRes } = useGeographyStats();

  /* =========================================================
     MUTATIONS
  ========================================================= */

  const createMut = useCreateTownVillage();
  const updateMut = useUpdateTownVillage();
  const deleteMut = useDeleteTownVillage();
  const toggleMut = useToggleTownVillage();

  /* =========================================================
     DATA
  ========================================================= */

  const items = extractItems(townVillagesRes);
  const districts = extractItems(districtsRes);
  const blocks = extractItems(blocksRes);
  const constituencyResult = constituenciesRes?.data;
  const geoStats = geoStatsRes?.data;

  const constituencies = Array.isArray(constituencyResult)
    ? constituencyResult
    : constituencyResult?.items || [];

  const pagination = getPagination(townVillagesRes);

  /* =========================================================
     FORM ACTIONS
  ========================================================= */

  const openAdd = () => {
    setEditing(null);
    form.reset(defaultValues);
    setDialogOpen(true);
  };

  const openEdit = (item: TownVillage) => {
    setEditing(item);

    form.reset({
      name: item.name || "",
      code: item.code || "",
      districtId: item.districtId || "",
      blockId: item.blockId || "",
      constituencyId: item.constituencyId || "",
      type: item.type || "VILLAGE",
      nature: item.nature || "RURAL",
      description: item.description || "",
      pincode: item.pincode || "",
      latitude:
        item.latitude !== null && item.latitude !== undefined
          ? String(item.latitude)
          : "",
      longitude:
        item.longitude !== null && item.longitude !== undefined
          ? String(item.longitude)
          : "",
    });

    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (createMut.isPending || updateMut.isPending) {
      return;
    }

    setDialogOpen(false);
    setEditing(null);
    form.reset(defaultValues);
  };

  const save = async (values: TownVillageForm) => {
    const payload: TownVillagePayload = {
      name: values.name.trim(),
      code: values.code?.trim() || null,
      districtId: values.districtId,
      blockId: values.blockId && values.blockId !== "none" ? values.blockId : null,
      constituencyId: values.constituencyId && values.constituencyId !== "none" ? values.constituencyId : null,
      type: values.type,
      nature: values.nature,
      description: values.description?.trim() || null,
      pincode: values.pincode?.trim() || null,
      latitude: values.latitude?.trim() ? Number(values.latitude) : null,
      longitude: values.longitude?.trim() ? Number(values.longitude) : null,
    };

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          data: payload,
        });
      } else {
        await createMut.mutateAsync(payload);
      }

      closeDialog();
    } catch {
      // Hook displays API error.
    }
  };

  /* =========================================================
     FILTER RESET
  ========================================================= */

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setNatureFilter("all");
    setDistrictFilter("all");
    setPage(1);
  };

  return (
    <MainLayout title="Towns & Villages">
      <div className="space-y-6">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              <Map className="h-7 w-7 text-primary" />
              Towns & Villages
            </h1>

            <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
              Manage towns, villages and their geographical hierarchy.
            </p>
          </div>

          <PermissionGate module="constituency" action="create">
            <Button
              onClick={openAdd}
              className="h-9 w-full gap-2 border-none bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 px-4 text-xs font-semibold text-white shadow-md transition-all hover:shadow-lg sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Town / Village
            </Button>
          </PermissionGate>
        </div>

        {/* =====================================================
            SUMMARY CARDS
        ===================================================== */}

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
                href: "/geography/districts",
              },
              {
                label: "Blocks",
                value: geoStats.blocks || 0,
                Icon: Map,
                color: "text-amber-500",
                bgColor: "bg-amber-50 dark:bg-amber-950/30",
                borderColor: "border-amber-100 dark:border-amber-950/50",
                href: "/geography/blocks",
              },
              {
                label: "Towns & Villages",
                value: geoStats.townVillages || 0,
                Icon: Building,
                color: "text-indigo-500",
                bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
                borderColor: "border-indigo-100 dark:border-indigo-950/50",
                href: "/geography/town-villages",
              },
              {
                label: "Wards",
                value: geoStats.wards || 0,
                Icon: MapPin,
                color: "text-emerald-500",
                bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
                borderColor: "border-emerald-100 dark:border-emerald-950/50",
                href: "/geography/wards",
              },
              {
                label: "Booths",
                value: geoStats.booths || 0,
                Icon: Vote,
                color: "text-violet-500",
                bgColor: "bg-violet-50 dark:bg-violet-950/30",
                borderColor: "border-violet-100 dark:border-violet-950/50",
                href: "/geography/booths",
              },
            ].map((s, i) => (
              <Link key={i} href={s.href}>
                <Card
                  className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer border border-border/50 bg-card hover:border-primary/30 rounded-2xl h-full"
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
              </Link>
            ))}
          </div>
        )}

        {/* =====================================================
            FILTERS
        ===================================================== */}

        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6 items-center">
              {/* Search */}
              <div className="relative lg:col-span-2 w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search town / village..."
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus-visible:ring-primary/20"
                />
              </div>

              {/* Type */}
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 border-border/60 bg-muted/10">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="TOWN">Town</SelectItem>
                  <SelectItem value="VILLAGE">Village</SelectItem>
                </SelectContent>
              </Select>

              {/* Nature */}
              <Select
                value={natureFilter}
                onValueChange={(value) => {
                  setNatureFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 border-border/60 bg-muted/10">
                  <SelectValue placeholder="Nature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Nature</SelectItem>
                  <SelectItem value="URBAN">Urban</SelectItem>
                  <SelectItem value="RURAL">Rural</SelectItem>
                </SelectContent>
              </Select>

              {/* Status */}
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 border-border/60 bg-muted/10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* District */}
              <Select
                value={districtFilter}
                onValueChange={(value) => {
                  setDistrictFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 border-border/60 bg-muted/10">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {districts.map((district: any) => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(search || statusFilter !== "all" || typeFilter !== "all" || natureFilter !== "all" || districtFilter !== "all") && (
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground gap-2"
                >
                  <RefreshCcw className="h-3 w-3" />
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* =====================================================
            TABLE
        ===================================================== */}

        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Town / Village</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Type</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Nature</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">District</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Block</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Code</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <TableRow key={index} className="border-b border-border/40">
                        {Array.from({ length: 8 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex} className="py-4 px-4">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <MapPin className="h-8 w-8 text-muted-foreground/40" />
                          <p className="font-semibold">No towns or villages found</p>
                          <p className="text-muted-foreground">Try changing your filters or add a new one.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/10 border-b border-border/40">
                        {/* Name */}
                        <TableCell className="py-4 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              {item.type === "TOWN" ? (
                                <Building2 className="h-4 w-4 text-primary" />
                              ) : (
                                <Home className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-foreground">{item.name}</div>
                              {item.pincode && (
                                <div className="text-xs text-muted-foreground">
                                  PIN: {item.pincode}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell className="py-4 px-4 align-middle">
                          <Badge
                            variant="outline"
                            className={
                              item.type === "TOWN"
                                ? "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            }
                          >
                            {item.type === "TOWN" ? "Town" : "Village"}
                          </Badge>
                        </TableCell>

                        {/* Nature */}
                        <TableCell className="py-4 px-4 align-middle">
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {item.nature === "URBAN" ? "Urban" : "Rural"}
                          </Badge>
                        </TableCell>

                        {/* District */}
                        <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-muted-foreground">{districtName(item)}</TableCell>

                        {/* Block */}
                        <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-muted-foreground">{blockName(item)}</TableCell>

                        {/* Code */}
                        <TableCell className="py-4 px-4 align-middle font-mono text-xs">
                          {item.code || "—"}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-4 px-4 align-middle">
                          <Badge
                            className={cn(
                              item.isActive
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-none dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "bg-secondary text-secondary-foreground"
                            )}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-4 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View */}
                            <Link to={`/geography/town-villages/${item.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                title="View details"
                              >
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </Link>

                            {/* Update */}
                            <PermissionGate
                              module="constituency"
                              action="update"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                disabled={toggleMut.isPending}
                                onClick={() => toggleMut.mutate(item.id)}
                                title={
                                  item.isActive ? "Deactivate" : "Activate"
                                }
                              >
                                {item.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                onClick={() => openEdit(item)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </PermissionGate>

                            {/* Delete */}
                            <PermissionGate
                              module="constituency"
                              action="delete"
                            >
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-extrabold text-foreground">
                                      Delete Town/Village "{item.name}"?
                                    </AlertDialogTitle>
                                  </AlertDialogHeader>

                                  <AlertDialogFooter className="gap-2 sm:gap-0">
                                    <AlertDialogCancel className="border-border/60 hover:bg-muted">
                                      Cancel
                                    </AlertDialogCancel>

                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                                      onClick={() => deleteMut.mutate(item.id)}
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
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editing ? "Edit Town / Village" : "Add New Town / Village"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(save)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tv-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tv-name"
                  placeholder="E.g., Rampur"
                  {...form.register("name")}
                  className={cn(
                    "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                    form.formState.errors.name && "border-destructive focus-visible:ring-destructive/20"
                  )}
                />
                {form.formState.errors.name && (
                  <p className="text-xs font-medium text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tv-code" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</Label>
                <Input
                  id="tv-code"
                  placeholder="E.g., RPR"
                  {...form.register("code")}
                  onChange={(e) => form.setValue("code", e.target.value.toUpperCase())}
                  className={cn(
                    "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                    form.formState.errors.code && "border-destructive focus-visible:ring-destructive/20"
                  )}
                />
                {form.formState.errors.code && (
                  <p className="text-xs font-medium text-destructive">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type <span className="text-destructive">*</span></Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(val: any) => form.setValue("type", val, { shouldValidate: true })}
                >
                  <SelectTrigger className="h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOWN">Town</SelectItem>
                    <SelectItem value="VILLAGE">Village</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.type && (
                  <p className="text-xs font-medium text-destructive">
                    {form.formState.errors.type.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Geography Nature <span className="text-destructive">*</span></Label>
                <Select
                  value={form.watch("nature")}
                  onValueChange={(val: any) => form.setValue("nature", val, { shouldValidate: true })}
                >
                  <SelectTrigger className="h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Select nature" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URBAN">Urban</SelectItem>
                    <SelectItem value="RURAL">Rural</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.nature && (
                  <p className="text-xs font-medium text-destructive">
                    {form.formState.errors.nature.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">District <span className="text-destructive">*</span></Label>
                <Select
                  value={form.watch("districtId")}
                  onValueChange={(val) => {
                    form.setValue("districtId", val, { shouldValidate: true });
                    form.setValue("blockId", ""); // Reset block on district change
                  }}
                >
                  <SelectTrigger className="h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.districtId && (
                  <p className="text-xs font-medium text-destructive">
                    {form.formState.errors.districtId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Block</Label>
                <Select
                  value={form.watch("blockId") || "none"}
                  onValueChange={(val) => form.setValue("blockId", val === "none" ? "" : val)}
                  disabled={!selectedDistrictId}
                >
                  <SelectTrigger className="h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder={selectedDistrictId ? "Select block" : "Select district first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Block (Urban / Town)</SelectItem>
                    {blocks.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Constituency</Label>
              <Select
                value={form.watch("constituencyId") || "none"}
                onValueChange={(val) => form.setValue("constituencyId", val === "none" ? "" : val)}
              >
                <SelectTrigger className="h-10 border-border/60 bg-muted/10">
                  <SelectValue placeholder="Select constituency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {constituencies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tv-pincode" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pincode</Label>
                <Input
                  id="tv-pincode"
                  placeholder="140301"
                  {...form.register("pincode")}
                  className={cn(
                    "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                    form.formState.errors.pincode && "border-destructive focus-visible:ring-destructive/20"
                  )}
                />
                {form.formState.errors.pincode && (
                  <p className="text-xs font-medium text-destructive">
                    {form.formState.errors.pincode.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tv-lat" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Latitude</Label>
                <Input
                  id="tv-lat"
                  placeholder="30.7"
                  {...form.register("latitude")}
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tv-lng" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Longitude</Label>
                <Input
                  id="tv-lng"
                  placeholder="76.7"
                  {...form.register("longitude")}
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tv-description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
              <Textarea
                id="tv-description"
                placeholder="Notes or description..."
                rows={2}
                {...form.register("description")}
                className="bg-muted/20 border-border/60 focus-visible:ring-primary/20 resize-none text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                className="border-border/60 hover:bg-muted"
                onClick={closeDialog}
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
