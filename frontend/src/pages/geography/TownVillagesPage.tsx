import { useMemo, useState } from "react";
import { Link } from "wouter";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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

      blockId: values.blockId || null,

      constituencyId: values.constituencyId || null,

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

  /* =========================================================
     RENDER
  ========================================================= */

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {pagination?.total ?? items.length}
                </p>
              </div>

              <div className="rounded-xl bg-primary/10 p-3">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Towns
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {items.filter((x) => x.type === "TOWN").length}
                </p>
              </div>

              <div className="rounded-xl bg-blue-500/10 p-3">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Villages
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {items.filter((x) => x.type === "VILLAGE").length}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-500/10 p-3">
                <Home className="h-5 w-5 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Active
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {items.filter((x) => x.isActive).length}
                </p>
              </div>

              <div className="rounded-xl bg-green-500/10 p-3">
                <ToggleRight className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =====================================================
            FILTERS
        ===================================================== */}

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
              {/* Search */}

              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search town / village..."
                  className="pl-9"
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
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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

            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="gap-2"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* =====================================================
            TABLE
        ===================================================== */}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">Town / Village</TableHead>

                    <TableHead>Type</TableHead>

                    <TableHead>Nature</TableHead>

                    <TableHead>District</TableHead>

                    <TableHead>Block</TableHead>

                    <TableHead>Code</TableHead>

                    <TableHead>Status</TableHead>

                    <TableHead className="px-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 8 }).map((_, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <MapPin className="h-8 w-8 text-muted-foreground/40" />

                          <p className="font-medium">
                            No towns or villages found
                          </p>

                          <p className="text-sm text-muted-foreground">
                            Try changing your filters or add a new one.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id} className="group">
                        {/* Name */}

                        <TableCell className="px-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                              {item.type === "TOWN" ? (
                                <Building2 className="h-4 w-4 text-primary" />
                              ) : (
                                <Home className="h-4 w-4 text-primary" />
                              )}
                            </div>

                            <div>
                              <div className="font-semibold">{item.name}</div>

                              {item.pincode && (
                                <div className="text-xs text-muted-foreground">
                                  PIN: {item.pincode}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Type */}

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.type === "TOWN"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }
                          >
                            {item.type === "TOWN" ? "Town" : "Village"}
                          </Badge>
                        </TableCell>

                        {/* Nature */}

                        <TableCell>
                          <Badge variant="secondary">
                            {item.nature === "URBAN" ? "Urban" : "Rural"}
                          </Badge>
                        </TableCell>

                        {/* District */}

                        <TableCell>{districtName(item)}</TableCell>

                        {/* Block */}

                        <TableCell>{blockName(item)}</TableCell>

                        {/* Code */}

                        <TableCell>
                          <span className="font-mono text-xs">
                            {item.code || "—"}
                          </span>
                        </TableCell>

                        {/* Status */}

                        <TableCell>
                          <Badge
                            className={
                              item.isActive
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>

                        {/* Actions */}

                        <TableCell className="px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View */}

                            <Link to={`/geography/town-villages/${item.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                title="View details"
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
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
                                className="h-8 w-8 rounded-lg"
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
                                className="h-8 w-8 rounded-lg"
                                onClick={() => openEdit(item)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4 text-muted-foreground" />
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
                                    className="h-8 w-8 rounded-lg"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete{" "}
                                      {item.type === "TOWN"
                                        ? "Town"
                                        : "Village"}{" "}
                                      "{item.name}"?
                                    </AlertDialogTitle>
                                  </AlertDialogHeader>

                                  <p className="text-sm text-muted-foreground">
                                    This action cannot be undone from this
                                    screen. Any related records protected by the
                                    backend will prevent unsafe deletion.
                                  </p>

                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>

                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      disabled={deleteMut.isPending}
                                      onClick={() => deleteMut.mutate(item.id)}
                                    >
                                      {deleteMut.isPending ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        "Delete"
                                      )}
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

            {/* =================================================
                PAGINATION
            ================================================= */}

            {pagination && (
              <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing page{" "}
                  <span className="font-medium text-foreground">
                    {pagination.page}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {pagination.totalPages}
                  </span>{" "}
                  · {pagination.total} records
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* =====================================================
            CREATE / EDIT DIALOG
        ===================================================== */}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Town / Village" : "Add Town / Village"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(save)} className="space-y-5">
              {/* =================================================
                  BASIC INFORMATION
              ================================================= */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Name */}

                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Name <span className="text-destructive">*</span>
                  </Label>

                  <Input
                    {...form.register("name")}
                    placeholder="Enter town or village name"
                  />

                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Code */}

                <div className="space-y-2">
                  <Label>Code</Label>

                  <Input
                    {...form.register("code")}
                    placeholder="Optional code"
                  />

                  {form.formState.errors.code && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.code.message}
                    </p>
                  )}
                </div>

                {/* Type */}

                <div className="space-y-2">
                  <Label>
                    Type <span className="text-destructive">*</span>
                  </Label>

                  <Select
                    value={form.watch("type")}
                    onValueChange={(value) =>
                      form.setValue("type", value as "TOWN" | "VILLAGE", {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="VILLAGE">Village</SelectItem>

                      <SelectItem value="TOWN">Town</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.formState.errors.type && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.type.message}
                    </p>
                  )}
                </div>

                {/* Nature */}

                <div className="space-y-2">
                  <Label>
                    Nature <span className="text-destructive">*</span>
                  </Label>

                  <Select
                    value={form.watch("nature")}
                    onValueChange={(value) =>
                      form.setValue("nature", value as "URBAN" | "RURAL", {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="RURAL">Rural</SelectItem>

                      <SelectItem value="URBAN">Urban</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.formState.errors.nature && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.nature.message}
                    </p>
                  )}
                </div>

                {/* Pincode */}

                <div className="space-y-2">
                  <Label>Pincode</Label>

                  <Input
                    {...form.register("pincode")}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 160001"
                  />

                  {form.formState.errors.pincode && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.pincode.message}
                    </p>
                  )}
                </div>
              </div>

              {/* =================================================
                  HIERARCHY
              ================================================= */}

              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Geography Hierarchy</h3>

                  <p className="text-xs text-muted-foreground">
                    Select the administrative hierarchy for this town/village.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* District */}

                  <div className="space-y-2">
                    <Label>
                      District <span className="text-destructive">*</span>
                    </Label>

                    <Select
                      value={form.watch("districtId") || undefined}
                      onValueChange={(value) => {
                        form.setValue("districtId", value, {
                          shouldValidate: true,
                        });

                        form.setValue("blockId", "");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>

                      <SelectContent>
                        {districts.map((district: any) => (
                          <SelectItem key={district.id} value={district.id}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {form.formState.errors.districtId && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.districtId.message}
                      </p>
                    )}
                  </div>

                  {/* Block */}

                  <div className="space-y-2">
                    <Label>Block</Label>

                    <Select
                      value={form.watch("blockId") || undefined}
                      onValueChange={(value) => form.setValue("blockId", value)}
                      disabled={!selectedDistrictId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedDistrictId
                              ? "Select block"
                              : "Select district first"
                          }
                        />
                      </SelectTrigger>

                      <SelectContent>
                        {blocks.map((block: any) => (
                          <SelectItem key={block.id} value={block.id}>
                            {block.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Constituency */}

                  <div className="space-y-2 sm:col-span-2">
                    <Label>Constituency</Label>

                    <Select
                      value={form.watch("constituencyId") || undefined}
                      onValueChange={(value) =>
                        form.setValue("constituencyId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select constituency" />
                      </SelectTrigger>

                      <SelectContent>
                        {constituencies.map((constituency: any) => (
                          <SelectItem
                            key={constituency.id}
                            value={constituency.id}
                          >
                            {constituency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* =================================================
                  LOCATION
              ================================================= */}

              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Location</h3>

                  <p className="text-xs text-muted-foreground">
                    Optional geographical coordinates.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Latitude</Label>

                    <Input
                      {...form.register("latitude")}
                      placeholder="e.g. 30.7333"
                    />

                    {form.formState.errors.latitude && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.latitude.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Longitude</Label>

                    <Input
                      {...form.register("longitude")}
                      placeholder="e.g. 76.7794"
                    />

                    {form.formState.errors.longitude && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.longitude.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* =================================================
                  DESCRIPTION
              ================================================= */}

              <div className="space-y-2">
                <Label>Description</Label>

                <Textarea
                  {...form.register("description")}
                  placeholder="Enter description..."
                  rows={4}
                />

                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              {/* =================================================
                  FOOTER
              ================================================= */}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={createMut.isPending || updateMut.isPending}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                >
                  {createMut.isPending || updateMut.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editing ? (
                    "Update Town / Village"
                  ) : (
                    "Create Town / Village"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
