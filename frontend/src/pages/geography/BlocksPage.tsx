import { useMemo, useState } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

import {
  useBlocks,
  useCreateBlock,
  useUpdateBlock,
  useDeleteBlock,
  useToggleBlock,
} from "@/hooks/useBlocks";
import { useDistricts } from "@/hooks/useConstituencies";

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
  Map,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ============================================================
   Validation
============================================================ */

const blockSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Block name is required")
    .min(2, "Block name must be at least 2 characters")
    .max(100, "Block name must be at most 100 characters"),

  code: z
    .string()
    .trim()
    .max(50, "Code must be at most 50 characters")
    .optional()
    .or(z.literal("")),

  districtId: z.string().min(1, "Please select a district"),
});

type BlockForm = z.infer<typeof blockSchema>;

/* ============================================================
   Constants
============================================================ */

const emptyForm: BlockForm = {
  name: "",
  code: "",
  districtId: "",
};

/* ============================================================
   Page
============================================================ */

export default function BlocksPage() {
  /* ==========================================================
     State
  ========================================================== */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [dlg, setDlg] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  /* ==========================================================
     Query Params
  ========================================================== */

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

  /* ==========================================================
     Queries
  ========================================================== */

  const { data: blocksRes, isLoading, isFetching } = useBlocks(queryParams);

  const { data: districtsRes } = useDistricts();

  /* ==========================================================
     Mutations
  ========================================================== */

  const createMut = useCreateBlock();
  const updateMut = useUpdateBlock();
  const deleteMut = useDeleteBlock();
  const toggleMut = useToggleBlock();

  /* ==========================================================
     Form
  ========================================================== */

  const blockForm = useForm<BlockForm>({
    resolver: zodResolver(blockSchema),
    defaultValues: emptyForm,
  });

  /* ==========================================================
     Normalize Blocks Response
  ========================================================== */

  const result = blocksRes;

  const items: any[] = Array.isArray(result) ? result : result?.items || [];

  /* ==========================================================
     Pagination
  ========================================================== */

  const pagination =
    result?.totalPages !== undefined
      ? {
          page: Number(result.page) || page,
          totalPages: Number(result.totalPages) || 1,
          total: Number(result.total) || 0,
          hasNextPage:
            typeof result.hasNextPage === "boolean"
              ? result.hasNextPage
              : page < Number(result.totalPages),

          hasPrevPage:
            typeof result.hasPrevPage === "boolean"
              ? result.hasPrevPage
              : page > 1,
        }
      : null;

  const total = pagination?.total ?? items.length;

  /* ==========================================================
     Districts
  ========================================================== */

  const districtResult = districtsRes?.data ?? districtsRes;

  const districts: any[] = Array.isArray(districtResult)
    ? districtResult
    : districtResult?.items || [];

  /* ==========================================================
     Statistics
  ========================================================== */

  const activeCount = useMemo(() => {
    return items.filter(
      (block) => block.isActive === true || block.status === "ACTIVE",
    ).length;
  }, [items]);

  const inactiveCount = useMemo(() => {
    return items.filter(
      (block) => block.isActive === false || block.status === "INACTIVE",
    ).length;
  }, [items]);

  /* ==========================================================
     Helpers
  ========================================================== */

  const isActive = (block: any) => {
    if (typeof block.isActive === "boolean") {
      return block.isActive;
    }

    return block.status === "ACTIVE";
  };

  /* ==========================================================
     Open Add
  ========================================================== */

  const openAdd = () => {
    setEditing(null);

    blockForm.reset({
      name: "",
      code: "",
      districtId: "",
    });

    setDlg(true);
  };

  /* ==========================================================
     Open Edit
  ========================================================== */

  const openEdit = (block: any) => {
    setEditing(block);

    blockForm.reset({
      name: block.name || "",
      code: block.code || "",
      districtId: block.districtId || "",
    });

    setDlg(true);
  };

  /* ==========================================================
     Save
  ========================================================== */

  const save = async (formData: BlockForm) => {
    try {
      const payload = {
        name: formData.name.trim(),

        code: formData.code?.trim() || undefined,

        districtId: formData.districtId,
      };

      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          data: payload,
        });
      } else {
        await createMut.mutateAsync(payload);
      }

      setDlg(false);
      setEditing(null);
      blockForm.reset(emptyForm);
    } catch {
      /*
       * API error is already handled by
       * the mutation hook.
       */
    }
  };

  /* ==========================================================
     Reset Filters
  ========================================================== */

  const reset = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  /* ==========================================================
     Render
  ========================================================== */

  return (
    <MainLayout title="Blocks">
      <div className="space-y-6">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Map className="h-7 w-7 text-primary" />
              Blocks
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Configure administrative blocks and their district relationships.
            </p>
          </div>

          <PermissionGate module="constituency" action="create">
            <Button
              className="gap-2 w-full sm:w-auto justify-center bg-linear-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />
              Add Block
            </Button>
          </PermissionGate>
        </div>

        {/* ====================================================
            STATS
        ==================================================== */}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Total */}

          <Link href="/geography/blocks">
            <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer border border-border/50 bg-card hover:border-primary/30 rounded-2xl h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                <div className="flex justify-between items-center">
                  <div className="p-2 rounded-xl border border-indigo-100 dark:border-indigo-950/50 bg-indigo-50 dark:bg-indigo-950/30">
                    <Map className="h-4 w-4 text-indigo-500" />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                    Blocks
                  </p>

                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                    {isLoading ? <Skeleton className="h-7 w-16" /> : total}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Districts */}

          <Link href="/geography/districts">
            <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer border border-border/50 bg-card hover:border-primary/30 rounded-2xl h-full">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                <div className="flex justify-between items-center">
                  <div className="p-2 rounded-xl border border-blue-100 dark:border-blue-950/50 bg-blue-50 dark:bg-blue-950/30">
                    <Building2 className="h-4 w-4 text-blue-500" />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                    Districts
                  </p>

                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                    {districts.length}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Active */}

          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
              <div className="flex justify-between items-center">
                <div className="p-2 rounded-xl border border-emerald-100 dark:border-emerald-950/50 bg-emerald-50 dark:bg-emerald-950/30">
                  <ToggleRight className="h-4 w-4 text-emerald-500" />
                </div>
              </div>

              <div>
                <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                  Active
                </p>

                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                  {isLoading ? <Skeleton className="h-7 w-16" /> : activeCount}
                </h3>
              </div>
            </CardContent>
          </Card>

          {/* Inactive */}

          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
              <div className="flex justify-between items-center">
                <div className="p-2 rounded-xl border border-amber-100 dark:border-amber-950/50 bg-amber-50 dark:bg-amber-950/30">
                  <ToggleLeft className="h-4 w-4 text-amber-500" />
                </div>
              </div>

              <div>
                <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                  Inactive
                </p>

                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                  {isLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    inactiveCount
                  )}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ====================================================
            FILTERS
        ==================================================== */}

        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search */}

              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Input
                  placeholder="Search by block name or code..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus-visible:ring-primary/20"
                />
              </div>

              {/* Filters */}

              <div className="flex gap-2.5 flex-wrap w-full lg:w-auto">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
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

        {/* ====================================================
            TABLE
        ==================================================== */}

        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Block
                    </TableHead>

                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Code
                    </TableHead>

                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      District
                    </TableHead>

                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Status
                    </TableHead>

                    <TableHead className="h-12 px-4 text-right text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {/* Loading */}

                  {isLoading ? (
                    Array.from({
                      length: 5,
                    }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({
                          length: 5,
                        }).map((_, j) => (
                          <TableCell key={j} className="py-4 px-4">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    /* Empty */

                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={5}
                        className="text-center py-16 text-xs text-muted-foreground"
                      >
                        <Map className="h-10 w-10 mx-auto mb-3 opacity-30" />

                        <p className="font-medium text-sm">
                          No blocks found matching your filters.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    /* Rows */

                    items.map((block: any) => {
                      const active = isActive(block);

                      return (
                        <TableRow
                          key={block.id}
                          className={cn(
                            "hover:bg-muted/10 transition-colors border-b border-border/40",
                            !active && "opacity-60",
                          )}
                        >
                          {/* Block */}

                          <TableCell className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />

                              <div>
                                <p className="font-semibold text-foreground text-sm">
                                  {block.name}
                                </p>

                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                  Administrative Block
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Code */}

                          <TableCell className="py-4 px-4">
                            {block.code ? (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] font-bold px-2 py-0.5 border-border/80"
                              >
                                {block.code}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                —
                              </span>
                            )}
                          </TableCell>

                          {/* District */}

                          <TableCell className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />

                              <span className="text-xs font-semibold text-foreground">
                                {block.district?.name ||
                                  districts.find(
                                    (district) =>
                                      district.id === block.districtId,
                                  )?.name || (
                                    <span className="text-muted-foreground italic">
                                      —
                                    </span>
                                  )}
                              </span>
                            </div>
                          </TableCell>

                          {/* Status */}

                          <TableCell className="py-4 px-4">
                            <Badge
                              className={cn(
                                "text-[9px] sm:text-[10px] font-semibold border shadow-none",

                                active
                                  ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground border-border/50",
                              )}
                            >
                              {active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>

                          {/* Actions */}

                          <TableCell className="py-4 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Toggle */}

                              <PermissionGate
                                module="constituency"
                                action="update"
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted"
                                  disabled={toggleMut.isPending}
                                  onClick={() => toggleMut.mutate(block.id)}
                                  title={active ? "Deactivate" : "Activate"}
                                >
                                  {active ? (
                                    <ToggleRight className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>

                                {/* Edit */}

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted"
                                  onClick={() => openEdit(block)}
                                  title="Edit block"
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
                                      title="Delete block"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>

                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="font-extrabold text-foreground">
                                        Delete "{block.name}"?
                                      </AlertDialogTitle>
                                    </AlertDialogHeader>

                                    <AlertDialogFooter className="gap-2 sm:gap-0">
                                      <AlertDialogCancel className="border-border/60 hover:bg-muted">
                                        Cancel
                                      </AlertDialogCancel>

                                      <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                                        disabled={deleteMut.isPending}
                                        onClick={() =>
                                          deleteMut.mutate(block.id)
                                        }
                                      >
                                        {deleteMut.isPending && (
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        )}
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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

            {/* ==================================================
                PAGINATION
            ================================================== */}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3.5 border-t border-border/40">
                <p className="text-xs text-muted-foreground font-semibold">
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} total)
                </p>

                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted"
                    disabled={!pagination.hasPrevPage || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted"
                    disabled={!pagination.hasNextPage || isFetching}
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

      {/* ======================================================
          ADD / EDIT DIALOG
      ====================================================== */}

      <Dialog
        open={dlg}
        onOpenChange={(open) => {
          setDlg(open);

          if (!open) {
            setEditing(null);
            blockForm.reset(emptyForm);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editing ? "Edit Block" : "Add New Block"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={blockForm.handleSubmit(save)}
            className="space-y-4 py-2"
          >
            <div className="space-y-4">
              {/* NAME + CODE */}

              <div className="grid grid-cols-2 gap-4">
                {/* NAME */}

                <div className="space-y-2">
                  <Label
                    htmlFor="block-name"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Name <span className="text-destructive">*</span>
                  </Label>

                  <Input
                    id="block-name"
                    placeholder="E.g., Kotwali"
                    {...blockForm.register("name")}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",

                      blockForm.formState.errors.name &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />

                  {blockForm.formState.errors.name && (
                    <p className="text-xs font-medium text-destructive">
                      {blockForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* CODE */}

                <div className="space-y-2">
                  <Label
                    htmlFor="block-code"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Code
                  </Label>

                  <Input
                    id="block-code"
                    placeholder="E.g., KOT-01"
                    {...blockForm.register("code")}
                    onChange={(e) => {
                      blockForm.setValue("code", e.target.value.toUpperCase(), {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",

                      blockForm.formState.errors.code &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />

                  {blockForm.formState.errors.code && (
                    <p className="text-xs font-medium text-destructive">
                      {blockForm.formState.errors.code.message}
                    </p>
                  )}
                </div>
              </div>

              {/* DISTRICT */}

              <div className="space-y-2">
                <Label
                  htmlFor="block-district"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  District <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={blockForm.watch("districtId") || "none"}
                  onValueChange={(value) => {
                    blockForm.setValue(
                      "districtId",
                      value === "none" ? "" : value,
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    );
                  }}
                >
                  <SelectTrigger
                    id="block-district"
                    className={cn(
                      "w-full h-10 border-border/60 bg-muted/20",

                      blockForm.formState.errors.districtId &&
                        "border-destructive focus:ring-destructive/20",
                    )}
                  >
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">Select district</SelectItem>

                    {districts.map((district: any) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}

                        {district.code ? ` (${district.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {blockForm.formState.errors.districtId && (
                  <p className="text-xs font-medium text-destructive">
                    {blockForm.formState.errors.districtId.message}
                  </p>
                )}
              </div>
            </div>

            {/* FOOTER */}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="border-border/60 hover:bg-muted"
                onClick={() => {
                  blockForm.reset(emptyForm);
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
