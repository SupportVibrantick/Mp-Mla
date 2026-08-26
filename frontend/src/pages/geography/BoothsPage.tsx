import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { useToast } from "@/hooks/use-toast";

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

const boothFormSchema = z.object({
  constituencyId: z
    .string()
    .trim()
    .min(1, "Constituency is required"),

  wardId: z
    .string()
    .optional()
    .or(z.literal("")),

  townVillageId: z
    .string()
    .optional()
    .or(z.literal("")),

  pollingLocationId: z
    .string()
    .optional()
    .or(z.literal("")),

  boothNumber: z
    .string()
    .trim()
    .min(1, "Booth number is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Booth number must be a positive integer",
    })
    .transform((val) => parseInt(val, 10)),

  boothName: z
    .string()
    .trim()
    .min(1, "Booth name is required")
    .min(2, "Booth name must be at least 2 characters")
    .max(100, "Booth name must be at most 100 characters"),

  code: z
    .string()
    .trim()
    .max(50, "Code must be at most 50 characters")
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
});

type BoothFormValues = z.infer<typeof boothFormSchema>;

function extractItems(result: any): any[] {
  if (Array.isArray(result)) {
    return result;
  }

  return result?.items || [];
}

export default function BoothsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const boothForm = useForm<BoothFormValues>({
    resolver: zodResolver(boothFormSchema),
    defaultValues: {
      constituencyId: "",
      wardId: "",
      townVillageId: "",
      pollingLocationId: "",
      boothNumber: "" as any,
      boothName: "",
      code: "",
      latitude: "" as any,
      longitude: "" as any,
    },
  });

  const selectedConstituencyId = boothForm.watch("constituencyId");

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
    boothForm.reset({
      constituencyId: "",
      wardId: "",
      townVillageId: "",
      pollingLocationId: "",
      boothNumber: "" as any,
      boothName: "",
      code: "",
      latitude: "" as any,
      longitude: "" as any,
    });
    setDialogOpen(true);
  };

  const openEdit = (booth: any) => {
    setEditing(booth);
    boothForm.reset({
      constituencyId: booth.constituencyId || booth.constituency?.id || "",
      wardId: booth.wardId || booth.ward?.id || "",
      townVillageId: booth.townVillageId || booth.townVillage?.id || "",
      pollingLocationId: booth.pollingLocationId || booth.pollingLocation?.id || "",
      boothNumber: booth.boothNumber?.toString() || "" as any,
      boothName: booth.boothName || "",
      code: booth.code || "",
      latitude: booth.latitude !== null && booth.latitude !== undefined ? booth.latitude.toString() : "" as any,
      longitude: booth.longitude !== null && booth.longitude !== undefined ? booth.longitude.toString() : "" as any,
    });
    setDialogOpen(true);
  };

  const save = async (formData: BoothFormValues) => {
    try {
      const payload = {
        ...formData,
        boothName: formData.boothName.trim(),
        code: formData.code?.trim() || null,
        wardId: formData.wardId || null,
        townVillageId: formData.townVillageId || null,
        pollingLocationId: formData.pollingLocationId || null,
      };

      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          data: payload,
        });
      } else {
        await createMut.mutateAsync(payload);
      }

      setDialogOpen(false);
      boothForm.reset();
      setEditing(null);
    } catch {
      // handled by hooks onError toasts
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <MainLayout title="Polling Booths">
      <div className="space-y-6">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              <MapPin className="h-7 w-7 text-primary" />
              Polling Booths
            </h1>

            <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
              Manage polling booths, assign them to wards/villages, and map coordinates.
            </p>
          </div>

          <PermissionGate module="constituency" action="create">
            <Button
              onClick={openAdd}
              className="h-9 w-full gap-2 border-none bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 px-4 text-xs font-semibold text-white shadow-md transition-all hover:shadow-lg sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Booth
            </Button>
          </PermissionGate>
        </div>

        {/* =====================================================
            FILTERS
        ===================================================== */}

        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search booths by name or number..."
                className="pl-9 h-10 bg-muted/30 border-border/60 focus-visible:ring-primary/20"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-48 h-10 border-border/60 bg-muted/10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Booth</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Constituency</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Ward</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Town / Village</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Polling Location</TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index} className="border-b border-border/40">
                        {Array.from({ length: 7 }).map((_, idx) => (
                          <TableCell key={idx} className="py-4 px-4">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : booths.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                        No booths found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    booths.map((booth) => (
                      <TableRow key={booth.id} className="hover:bg-muted/10 border-b border-border/40">
                        {/* Name & Number */}
                        <TableCell className="py-4 px-4 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-primary/10 p-2 font-mono text-xs font-bold text-primary">
                              #{booth.boothNumber}
                            </div>
                            <div>
                              <div className="font-bold text-foreground">{booth.boothName}</div>
                              {booth.code && (
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  {booth.code}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Constituency */}
                        <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-muted-foreground">
                          {booth.constituency?.name || "—"}
                        </TableCell>

                        {/* Ward */}
                        <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-muted-foreground">
                          {booth.ward
                            ? `Ward ${booth.ward.wardNumber}: ${booth.ward.name}`
                            : "—"}
                        </TableCell>

                        {/* Town / Village */}
                        <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-muted-foreground">
                          {booth.townVillage?.name || "—"}
                        </TableCell>

                        {/* Polling Location */}
                        <TableCell className="py-4 px-4 align-middle text-xs font-semibold text-muted-foreground">
                          {booth.pollingLocation?.name || "—"}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-4 px-4 align-middle">
                          <Badge
                            className={cn(
                              booth.isActive
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-none dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "bg-secondary text-secondary-foreground"
                            )}
                          >
                            {booth.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-4 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <PermissionGate module="constituency" action="update">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                disabled={toggleMut.isPending}
                                onClick={() => toggleMut.mutate(booth.id)}
                                title={booth.isActive ? "Deactivate" : "Activate"}
                              >
                                {booth.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                onClick={() => openEdit(booth)}
                                title="Edit"
                              >
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
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-extrabold text-foreground">
                                      Delete Booth #{booth.boothNumber}?
                                    </AlertDialogTitle>
                                  </AlertDialogHeader>

                                  <AlertDialogFooter className="gap-2 sm:gap-0">
                                    <AlertDialogCancel className="border-border/60 hover:bg-muted">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
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

      {/* ===================================================
          CREATE / EDIT DIALOG
      =================================================== */}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editing ? "Edit Booth" : "Add New Booth"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={boothForm.handleSubmit(save)} className="space-y-5 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booth-number" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Booth Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="booth-number"
                  placeholder="E.g. 101"
                  {...boothForm.register("boothNumber")}
                  className={cn(
                    "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                    boothForm.formState.errors.boothNumber && "border-destructive focus-visible:ring-destructive/20"
                  )}
                />
                {boothForm.formState.errors.boothNumber && (
                  <p className="text-xs font-medium text-destructive">
                    {boothForm.formState.errors.boothNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="booth-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Booth Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="booth-name"
                  placeholder="E.g. Government School"
                  {...boothForm.register("boothName")}
                  className={cn(
                    "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                    boothForm.formState.errors.boothName && "border-destructive focus-visible:ring-destructive/20"
                  )}
                />
                {boothForm.formState.errors.boothName && (
                  <p className="text-xs font-medium text-destructive">
                    {boothForm.formState.errors.boothName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booth-code" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booth Code</Label>
              <Input
                id="booth-code"
                placeholder="E.g. BOOTH-101"
                {...boothForm.register("code")}
                onChange={(e) => boothForm.setValue("code", e.target.value.toUpperCase())}
                className={cn(
                  "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                  boothForm.formState.errors.code && "border-destructive focus-visible:ring-destructive/20"
                )}
              />
              {boothForm.formState.errors.code && (
                <p className="text-xs font-medium text-destructive">
                  {boothForm.formState.errors.code.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Constituency <span className="text-destructive">*</span>
              </Label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                value={boothForm.watch("constituencyId")}
                onChange={(e) => {
                  boothForm.setValue("constituencyId", e.target.value, { shouldValidate: true });
                  boothForm.setValue("wardId", "");
                  boothForm.setValue("townVillageId", "");
                  boothForm.setValue("pollingLocationId", "");
                }}
              >
                <option value="">Select constituency</option>
                {constituencies.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.code ? ` (${c.code})` : ""}
                  </option>
                ))}
              </select>
              {boothForm.formState.errors.constituencyId && (
                <p className="text-xs font-medium text-destructive">
                  {boothForm.formState.errors.constituencyId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ward</Label>
                <BoothWardSelect
                  constituencyId={selectedConstituencyId}
                  value={boothForm.watch("wardId") || ""}
                  onChange={(val) => boothForm.setValue("wardId", val)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Town/Village</Label>
                <BoothTownVillageSelect
                  constituencyId={selectedConstituencyId}
                  value={boothForm.watch("townVillageId") || ""}
                  onChange={(val) => boothForm.setValue("townVillageId", val)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Polling Location</Label>
                <BoothPollingLocationSelect
                  constituencyId={selectedConstituencyId}
                  value={boothForm.watch("pollingLocationId") || ""}
                  onChange={(val) => boothForm.setValue("pollingLocationId", val)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booth-latitude" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Latitude</Label>
                <Input
                  id="booth-latitude"
                  placeholder="30.7046"
                  {...boothForm.register("latitude")}
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booth-longitude" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Longitude</Label>
                <Input
                  id="booth-longitude"
                  placeholder="76.7179"
                  {...boothForm.register("longitude")}
                  className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  boothForm.reset();
                  setEditing(null);
                  setDialogOpen(false);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/95 text-white"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? "Update Booth" : "Create Booth"}
              </Button>
            </DialogFooter>
          </form>
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
