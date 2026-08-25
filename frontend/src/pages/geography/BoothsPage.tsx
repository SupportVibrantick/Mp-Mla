import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { cn } from "@/lib/utils";

import {
  useBooths,
  useCreateBooth,
  useUpdateBooth,
  useDeleteBooth,
  useToggleBooth,
  useBoothConstituencies,
  useBoothWards,
  useBoothTownVillages,
  useBoothPollingLocations,
} from "@/hooks/useBooths";

import { MainLayout } from "@/components/layout/MainLayout";
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

import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  Building2,
  Map,
  Landmark,
  Navigation,
} from "lucide-react";

// import BoothDetailPage from "./BoothDetailPage";

const emptyForm = {
  boothNumber: "",
  boothName: "",
  code: "",
  constituencyId: "",
  wardId: "",
  townVillageId: "",
  pollingLocationId: "",
  latitude: "",
  longitude: "",
};

function extractItems(result: any): any[] {
  if (Array.isArray(result)) {
    return result;
  }

  return result?.items || [];
}

export default function BoothsPage() {
  // const params = useParams<{ id?: string }>();

  // if (params.id) {
  //   return <BoothDetailPage id={params.id} />;
  // }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);

  const [editing, setEditing] = useState<any>(null);

  const [form, setForm] = useState({ ...emptyForm });

  /* =====================================================
     QUERIES
  ===================================================== */

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

    return params;
  }, [page, search, statusFilter]);

  const { data: boothRes, isLoading } = useBooths(queryParams);

  const { data: constituencyRes } = useBoothConstituencies();

  const constituencies = extractItems(constituencyRes?.data);

  const result = boothRes?.data;

  const booths = extractItems(result);

  const pagination =
    result?.totalPages !== undefined
      ? {
          page: result.page || page,
          totalPages: result.totalPages,
          total: result.total || 0,
          hasNextPage: (result.page || page) < result.totalPages,
          hasPrevPage: (result.page || page) > 1,
        }
      : null;

  /* =====================================================
     MUTATIONS
  ===================================================== */

  const createMut = useCreateBooth();
  const updateMut = useUpdateBooth();
  const deleteMut = useDeleteBooth();
  const toggleMut = useToggleBooth();

  /* =====================================================
     FORM
  ===================================================== */

  const openAdd = () => {
    setEditing(null);

    setForm({
      ...emptyForm,
    });

    setDialogOpen(true);
  };

  const openEdit = (booth: any) => {
    setEditing(booth);

    setForm({
      boothNumber: booth.boothNumber?.toString() || "",

      boothName: booth.boothName || "",

      code: booth.code || "",

      constituencyId: booth.constituencyId || booth.constituency?.id || "",

      wardId: booth.wardId || booth.ward?.id || "",

      townVillageId: booth.townVillageId || booth.townVillage?.id || "",

      pollingLocationId:
        booth.pollingLocationId || booth.pollingLocation?.id || "",

      latitude: booth.latitude?.toString() || "",

      longitude: booth.longitude?.toString() || "",
    });

    setDialogOpen(true);
  };

  const save = async () => {
    const boothNumber = Number(form.boothNumber);

    if (!Number.isInteger(boothNumber) || boothNumber <= 0) {
      return;
    }

    if (!form.boothName.trim()) {
      return;
    }

    if (!form.constituencyId) {
      return;
    }

    const payload: any = {
      boothNumber,
      boothName: form.boothName.trim(),
      code: form.code.trim() || undefined,
      constituencyId: form.constituencyId,
      wardId: form.wardId || undefined,
      townVillageId: form.townVillageId || undefined,
      pollingLocationId: form.pollingLocationId || undefined,
    };

    if (form.latitude.trim()) {
      payload.latitude = Number(form.latitude);
    }

    if (form.longitude.trim()) {
      payload.longitude = Number(form.longitude);
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          data: payload,
        });
      } else {
        await createMut.mutateAsync(payload);
      }

      setDialogOpen(false);
    } catch {
      // handled by mutation
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <MainLayout title="Booths">
      <div className="space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <MapPin className="h-7 w-7 text-primary" />
              Booths
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Manage polling booths across constituencies, wards, towns/villages
              and polling locations.
            </p>
          </div>

          <PermissionGate module="constituency" action="create">
            <Button
              onClick={openAdd}
              className="gap-2 w-full sm:w-auto h-9 text-xs bg-linear-to-r from-slate-900 via-slate-950 to-indigo-950 text-white"
            >
              <Plus className="h-4 w-4" />
              Add Booth
            </Button>
          </PermissionGate>
        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/30">
                  <MapPin className="h-5 w-5 text-sky-500" />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Booths
                  </p>

                  <h3 className="text-xl font-bold">
                    {pagination?.total ?? booths.length}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30">
                  <Landmark className="h-5 w-5 text-indigo-500" />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Constituencies
                  </p>

                  <h3 className="text-xl font-bold">{constituencies.length}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    Linked Wards
                  </p>

                  <h3 className="text-xl font-bold">
                    {
                      new Set(booths.map((b: any) => b.wardId).filter(Boolean))
                        .size
                    }
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                  <Navigation className="h-5 w-5 text-amber-500" />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    With Location
                  </p>

                  <h3 className="text-xl font-bold">
                    {booths.filter((b: any) => b.pollingLocationId).length}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =================================================
            FILTERS
        ================================================= */}

        <Card className="border-border/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Input
                  placeholder="Search booth number, name or code..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-10 bg-muted/30"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full lg:w-40 h-10">
                  <SelectValue />
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
                  className="h-10 text-xs"
                  onClick={resetFilters}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* =================================================
            TABLE
        ================================================= */}

        <Card className="border-border/50 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Booth</TableHead>

                    <TableHead>Code</TableHead>

                    <TableHead>Constituency</TableHead>

                    <TableHead>Ward / Town/Village</TableHead>

                    <TableHead>Status</TableHead>

                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    Array.from({
                      length: 5,
                    }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({
                          length: 6,
                        }).map((_, cell) => (
                          <TableCell key={cell}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : booths.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />

                        <p className="font-medium text-sm">No booths found.</p>

                        <p className="text-xs text-muted-foreground mt-1">
                          Try changing your filters or create a new booth.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    booths.map((booth: any) => (
                      <TableRow
                        key={booth.id}
                        className={cn(
                          "border-b border-border/40",
                          !booth.isActive && "opacity-50",
                        )}
                      >
                        {/* Booth */}

                        <TableCell>
                          <Link to={`/geography/booths/${booth.id}`}>
                            <div className="cursor-pointer">
                              <p className="font-semibold text-primary hover:underline flex items-center gap-2 text-sm">
                                <MapPin className="h-3.5 w-3.5 text-sky-500" />
                                Booth {booth.boothNumber}
                              </p>

                              <p className="text-xs text-muted-foreground mt-0.5">
                                {booth.boothName}
                              </p>
                            </div>
                          </Link>
                        </TableCell>

                        {/* Code */}

                        <TableCell>
                          {booth.code ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {booth.code}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>

                        {/* Constituency */}

                        <TableCell className="text-xs font-semibold">
                          {booth.constituency?.name ||
                            booth.constituencyName ||
                            "—"}
                        </TableCell>

                        {/* Ward/Village */}

                        <TableCell>
                          <div className="text-xs">
                            {booth.ward?.name && (
                              <p className="font-semibold">{booth.ward.name}</p>
                            )}

                            {booth.townVillage?.name && (
                              <p className="text-muted-foreground">
                                {booth.townVillage.name}
                              </p>
                            )}

                            {!booth.ward?.name &&
                              !booth.townVillage?.name &&
                              "—"}
                          </div>
                        </TableCell>

                        {/* Status */}

                        <TableCell>
                          <Badge
                            className={cn(
                              "text-[10px]",
                              booth.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {booth.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>

                        {/* Actions */}

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link to={`/geography/booths/${booth.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>

                            <PermissionGate
                              module="constituency"
                              action="update"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={toggleMut.isPending}
                                onClick={() => toggleMut.mutate(booth.id)}
                              >
                                {booth.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(booth)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </PermissionGate>

                            <PermissionGate
                              module="constituency"
                              action="delete"
                            >
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Booth {booth.boothNumber}?
                                    </AlertDialogTitle>
                                  </AlertDialogHeader>

                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>

                                    <AlertDialogAction
                                      className="bg-destructive text-white"
                                      onClick={() => deleteMut.mutate(booth.id)}
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
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground font-semibold">
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} total)
                </p>

                <div className="flex gap-2">
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

      {/* ===================================================
          CREATE / EDIT DIALOG
      =================================================== */}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Booth" : "Add New Booth"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Booth Number <span className="text-destructive">*</span>
                </Label>

                <Input
                  type="number"
                  min="1"
                  value={form.boothNumber}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      boothNumber: e.target.value,
                    }))
                  }
                  placeholder="E.g. 101"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Booth Name <span className="text-destructive">*</span>
                </Label>

                <Input
                  value={form.boothName}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      boothName: e.target.value,
                    }))
                  }
                  placeholder="E.g. Government School"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Booth Code</Label>

              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="E.g. BOOTH-101"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Constituency <span className="text-destructive">*</span>
              </Label>

              <select
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                value={form.constituencyId}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    constituencyId: e.target.value,
                    wardId: "",
                    townVillageId: "",
                    pollingLocationId: "",
                  }))
                }
              >
                <option value="">Select constituency</option>

                {constituencies.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.code ? ` (${c.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ward</Label>

                <BoothWardSelect
                  constituencyId={form.constituencyId}
                  value={form.wardId}
                  onChange={(value) =>
                    setForm((p) => ({
                      ...p,
                      wardId: value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Town/Village</Label>

                <BoothTownVillageSelect
                  constituencyId={form.constituencyId}
                  value={form.townVillageId}
                  onChange={(value) =>
                    setForm((p) => ({
                      ...p,
                      townVillageId: value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Polling Location</Label>

                <BoothPollingLocationSelect
                  constituencyId={form.constituencyId}
                  value={form.pollingLocationId}
                  onChange={(value) =>
                    setForm((p) => ({
                      ...p,
                      pollingLocationId: value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>

                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      latitude: e.target.value,
                    }))
                  }
                  placeholder="30.7046"
                />
              </div>

              <div className="space-y-2">
                <Label>Longitude</Label>

                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      longitude: e.target.value,
                    }))
                  }
                  placeholder="76.7179"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>

            <Button onClick={save} disabled={isSaving} className="text-white">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}

              {editing ? "Update Booth" : "Create Booth"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

/* =========================================================
   WARD SELECT
========================================================= */

function BoothWardSelect({
  constituencyId,
  value,
  onChange,
}: {
  constituencyId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { data, isLoading } = useBoothWards(constituencyId);

  const wards = extractItems(data?.data);

  return (
    <select
      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
      value={value}
      disabled={!constituencyId || isLoading}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select ward</option>

      {wards.map((ward: any) => (
        <option key={ward.id} value={ward.id}>
          {ward.wardNumber ? `Ward ${ward.wardNumber}: ` : ""}
          {ward.name}
        </option>
      ))}
    </select>
  );
}

/* =========================================================
  TOWN/VILLAGE SELECT
========================================================= */

function BoothTownVillageSelect({
  constituencyId,
  value,
  onChange,
}: {
  constituencyId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { data, isLoading } = useBoothTownVillages(constituencyId);

  const townVillages = extractItems(data?.data);

  return (
    <select
      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
      value={value}
      disabled={!constituencyId || isLoading}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select town/village</option>

      {townVillages.map((townVillage: any) => (
        <option key={townVillage.id} value={townVillage.id}>
          {townVillage.name}
        </option>
      ))}
    </select>
  );
}

/* =========================================================
   POLLING LOCATION SELECT
========================================================= */

function BoothPollingLocationSelect({
  constituencyId,
  value,
  onChange,
}: {
  constituencyId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { data, isLoading } = useBoothPollingLocations(constituencyId);

  const locations = extractItems(data?.data);

  return (
    <select
      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
      value={value}
      disabled={!constituencyId || isLoading}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select location</option>

      {locations.map((location: any) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </select>
  );
}
