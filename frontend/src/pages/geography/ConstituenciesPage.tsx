import { useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  useConstituencies,
  useGeographyStats,
  useCreateConstituency,
  useUpdateConstituency,
  useDeleteConstituency,
  useToggleConstituency,
  useDistricts,
} from "@/hooks/useConstituencies";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
  Landmark,
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
  Vote,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ConstituencyDetailPage from "./ConstituencyDetailPage";
const constituencySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Constituency name is required")
    .min(2, "Constituency name must be at least 2 characters")
    .max(100, "Constituency name must be at most 100 characters"),

  code: z
    .string()
    .trim()
    .max(50, "Code must be at most 50 characters")
    .optional()
    .or(z.literal("")),

  type: z.enum(["ASSEMBLY", "PARLIAMENTARY"], {
    required_error: "Please select constituency type",
  }),

  districtId: z.string().optional().or(z.literal("")),

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

type ConstituencyForm = z.infer<typeof constituencySchema>;

const emptyForm = {
  name: "",
  code: "",
  type: "ASSEMBLY",
  districtId: "",
  description: "",
  latitude: "",
  longitude: "",
  boundary: "",
};

export default function ConstituenciesPage() {
  const params = useParams<{ id?: string }>();
  if (params.id) {
    return <ConstituencyDetailPage id={params.id} />;
  }
  return <ConstituenciesList />;
}

function ConstituenciesList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const p: Record<string, any> = { page, limit: 10 };
    if (search) p.search = search;
    if (statusFilter !== "all") p.status = statusFilter;
    if (typeFilter !== "all") p.type = typeFilter;
    return p;
  }, [search, statusFilter, typeFilter, page]);

  const { data: res, isLoading } = useConstituencies(queryParams);
  const { data: geoStatsRes } = useGeographyStats();
  const createMut = useCreateConstituency();
  const updateMut = useUpdateConstituency();
  const deleteMut = useDeleteConstituency();
  const toggleMut = useToggleConstituency();
  const { data: districtsRes } = useDistricts();

  const [dlg, setDlg] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const constituencyForm = useForm<ConstituencyForm>({
    resolver: zodResolver(constituencySchema),
    defaultValues: {
      name: "",
      code: "",
      type: "ASSEMBLY",
      districtId: "",
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

    constituencyForm.reset({
      name: "",
      code: "",
      type: "ASSEMBLY",
      districtId: "",
      description: "",
      latitude: "" as any,
      longitude: "" as any,
      boundary: "" as any,
    });

    setDlg(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);

    constituencyForm.reset({
      name: c.name || "",
      code: c.code || "",
      type: c.type || "ASSEMBLY",
      districtId: c.districtId || "",
      description: c.description || "",
      latitude: c.latitude !== null && c.latitude !== undefined ? String(c.latitude) : "" as any,
      longitude: c.longitude !== null && c.longitude !== undefined ? String(c.longitude) : "" as any,
      boundary: c.boundary ? JSON.stringify(c.boundary, null, 2) : "" as any,
    });

    setDlg(true);
  };

  const save = async (formData: ConstituencyForm) => {
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        code: formData.code?.trim() || undefined,
        districtId: formData.districtId || null,
        description: formData.description?.trim() || null,
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
      constituencyForm.reset();
      setEditing(null);
    } catch {
      // Mutation hook handles API errors.
    }
  };

  const reset = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  return (
    <MainLayout title="Constituencies">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Landmark className="h-7 w-7 text-primary" /> Constituencies
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Configure constituencies and political representatives of your
              organization.
            </p>
          </div>
          <PermissionGate module="constituency" action="create">
            <Button
              className="gap-2 w-full sm:w-auto justify-center bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />
              Add Constituency
            </Button>
          </PermissionGate>
        </div>

        {/* Stats */}
        {geoStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                label: "Constituencies",
                value: pagination?.total ?? items.length,
                Icon: Landmark,
                color: "text-indigo-500",
                bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
                borderColor: "border-indigo-100 dark:border-indigo-950/50",
                href: "/geography/constituencies",
              },
              {
                label: "Districts",
                value: geoStats.districts || 0,
                Icon: Map,
                color: "text-blue-500",
                bgColor: "bg-blue-50 dark:bg-blue-950/30",
                borderColor: "border-blue-100 dark:border-blue-950/50",
                href: "/geography/districts",
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
                label: "Villages",
                value: geoStats.townVillages || geoStats.villages || 0,
                Icon: MapPin,
                color: "text-amber-500",
                bgColor: "bg-amber-50 dark:bg-amber-950/30",
                borderColor: "border-amber-100 dark:border-amber-950/50",
                href: "/geography/town-villages",
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
                      <div
                        className={cn(
                          "p-2 rounded-xl border",
                          s.bgColor,
                          s.borderColor,
                        )}
                      >
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
                <Select
                  value={typeFilter}
                  onValueChange={(v) => {
                    setTypeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40 h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ASSEMBLY">Assembly</SelectItem>
                    <SelectItem value="PARLIAMENTARY">Parliamentary</SelectItem>
                  </SelectContent>
                </Select>
                {(search || statusFilter !== "all" || typeFilter !== "all") && (
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
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Constituency
                    </TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Code
                    </TableHead>
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Type
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
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-b border-border/40">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j} className="py-4 px-4">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={6}
                        className="text-center py-16 text-xs text-muted-foreground"
                      >
                        <Landmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-sm">
                          No constituencies found matching your filters.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((c: any) => (
                      <TableRow
                        key={c.id}
                        className={cn(
                          "hover:bg-muted/10 transition-colors border-b border-border/40",
                          !c.isActive && "opacity-50",
                        )}
                      >
                        <TableCell className="py-4 px-4">
                          <Link to={`/geography/constituencies/${c.id}`}>
                            <p className="font-semibold text-primary hover:underline text-sm flex items-center gap-2 cursor-pointer">
                              <Landmark className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              {c.name}
                            </p>
                            {c.description && (
                              <p className="text-[10px] text-muted-foreground max-w-[220px] truncate font-medium mt-0.5">
                                {c.description}
                              </p>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          {c.code ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-bold px-2 py-0.5 border-border/80"
                            >
                              {c.code}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Badge
                            variant="outline"
                            className="text-[9px] sm:text-[10px] font-semibold uppercase border-border/80"
                          >
                            {c.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-4 text-xs font-semibold text-foreground">
                          {c.district?.name || (
                            <span className="text-muted-foreground italic">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          <Badge
                            className={cn(
                              "text-[9px] sm:text-[10px] font-semibold border shadow-none",
                              c.isActive
                                ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground border-border/50",
                            )}
                          >
                            {c.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/geography/constituencies/${c.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                title="View details"
                              >
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            </Link>
                            <PermissionGate
                              module="constituency"
                              action="update"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                disabled={toggleMut.isPending}
                                onClick={() => toggleMut.mutate(c.id)}
                                title={c.isActive ? "Deactivate" : "Activate"}
                              >
                                {c.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-muted"
                                onClick={() => openEdit(c)}
                              >
                                <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
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
                                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-extrabold text-foreground">
                                      Delete "{c.name}"?
                                    </AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2 sm:gap-0">
                                    <AlertDialogCancel className="border-border/60 hover:bg-muted">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                                      onClick={() => deleteMut.mutate(c.id)}
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
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} total)
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
              {editing ? "Edit Constituency" : "Add New Constituency"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={constituencyForm.handleSubmit(save)}
            className="space-y-4 py-2"
          >
            <div className="space-y-4">
              {/* ───────────────── NAME + CODE ───────────────── */}
              <div className="grid grid-cols-2 gap-4">
                {/* NAME */}
                <div className="space-y-2">
                  <Label
                    htmlFor="constituency-name"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Name <span className="text-destructive">*</span>
                  </Label>

                  <Input
                    id="constituency-name"
                    placeholder="E.g., Kotwali Assembly"
                    {...constituencyForm.register("name")}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                      constituencyForm.formState.errors.name &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />

                  {constituencyForm.formState.errors.name && (
                    <p className="text-xs font-medium text-destructive">
                      {constituencyForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* CODE */}
                <div className="space-y-2">
                  <Label
                    htmlFor="constituency-code"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Code
                  </Label>

                  <Input
                    id="constituency-code"
                    placeholder="E.g., K-01"
                    {...constituencyForm.register("code")}
                    onChange={(e) => {
                      constituencyForm.setValue(
                        "code",
                        e.target.value.toUpperCase(),
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                      constituencyForm.formState.errors.code &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />

                  {constituencyForm.formState.errors.code && (
                    <p className="text-xs font-medium text-destructive">
                      {constituencyForm.formState.errors.code.message}
                    </p>
                  )}
                </div>
              </div>

              {/* ───────────────── TYPE ───────────────── */}
              <div className="space-y-2">
                <Label
                  htmlFor="constituency-type"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Type <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={constituencyForm.watch("type")}
                  onValueChange={(value) => {
                    constituencyForm.setValue(
                      "type",
                      value as "ASSEMBLY" | "PARLIAMENTARY",
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    );
                  }}
                >
                  <SelectTrigger
                    id="constituency-type"
                    className={cn(
                      "w-full h-10 border-border/60 bg-muted/20",
                      constituencyForm.formState.errors.type &&
                        "border-destructive focus:ring-destructive/20",
                    )}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ASSEMBLY">Assembly</SelectItem>

                    <SelectItem value="PARLIAMENTARY">Parliamentary</SelectItem>
                  </SelectContent>
                </Select>

                {constituencyForm.formState.errors.type && (
                  <p className="text-xs font-medium text-destructive">
                    {constituencyForm.formState.errors.type.message}
                  </p>
                )}
              </div>

              {/* ───────────────── DISTRICT ───────────────── */}
              <div className="space-y-2">
                <Label
                  htmlFor="constituency-district"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  District
                </Label>

                <Select
                  value={constituencyForm.watch("districtId") || "none"}
                  onValueChange={(value) => {
                    constituencyForm.setValue(
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
                    id="constituency-district"
                    className="w-full h-10 border-border/60 bg-muted/20"
                  >
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">No district</SelectItem>

                    {(Array.isArray(districtsRes?.data)
                      ? districtsRes.data
                      : districtsRes?.data?.items || []
                    ).map((district: any) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {constituencyForm.formState.errors.districtId && (
                  <p className="text-xs font-medium text-destructive">
                    {constituencyForm.formState.errors.districtId.message}
                  </p>
                )}
              </div>

              {/* ───────────────── DESCRIPTION ───────────────── */}
              <div className="space-y-2">
                <Label
                  htmlFor="constituency-description"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Description
                </Label>

                <Textarea
                  id="constituency-description"
                  placeholder="Optional description..."
                  rows={3}
                  {...constituencyForm.register("description")}
                  className={cn(
                    "bg-muted/20 border-border/60 focus-visible:ring-primary/20 resize-none",
                    constituencyForm.formState.errors.description &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                />

                {constituencyForm.formState.errors.description && (
                  <p className="text-xs font-medium text-destructive">
                    {constituencyForm.formState.errors.description.message}
                  </p>
                )}
              </div>

              {/* ───────────────── LATITUDE + LONGITUDE ───────────────── */}
              <div className="grid grid-cols-2 gap-4">
                {/* LATITUDE */}
                <div className="space-y-2">
                  <Label
                    htmlFor="constituency-latitude"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Latitude
                  </Label>
                  <Input
                    id="constituency-latitude"
                    placeholder="E.g., 30.7333"
                    {...constituencyForm.register("latitude")}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                      constituencyForm.formState.errors.latitude &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />
                  {constituencyForm.formState.errors.latitude && (
                    <p className="text-xs font-medium text-destructive">
                      {constituencyForm.formState.errors.latitude.message as string}
                    </p>
                  )}
                </div>

                {/* LONGITUDE */}
                <div className="space-y-2">
                  <Label
                    htmlFor="constituency-longitude"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Longitude
                  </Label>
                  <Input
                    id="constituency-longitude"
                    placeholder="E.g., 76.7794"
                    {...constituencyForm.register("longitude")}
                    className={cn(
                      "h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20",
                      constituencyForm.formState.errors.longitude &&
                        "border-destructive focus-visible:ring-destructive/20",
                    )}
                  />
                  {constituencyForm.formState.errors.longitude && (
                    <p className="text-xs font-medium text-destructive">
                      {constituencyForm.formState.errors.longitude.message as string}
                    </p>
                  )}
                </div>
              </div>

              {/* ───────────────── BOUNDARY GEOJSON ───────────────── */}
              <div className="space-y-2">
                <Label
                  htmlFor="constituency-boundary"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  Boundary (GeoJSON String)
                </Label>
                <Textarea
                  id="constituency-boundary"
                  placeholder='E.g., { "type": "Polygon", "coordinates": [...] }'
                  rows={4}
                  {...constituencyForm.register("boundary")}
                  className={cn(
                    "bg-muted/20 border-border/60 focus-visible:ring-primary/20 font-mono text-xs resize-none",
                    constituencyForm.formState.errors.boundary &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                />
                {constituencyForm.formState.errors.boundary ? (
                  <p className="text-xs font-medium text-destructive">
                    {constituencyForm.formState.errors.boundary.message as string}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Must be a valid GeoJSON object (Polygon or MultiPolygon).
                  </p>
                )}
              </div>
            </div>

            {/* ───────────────── FOOTER ───────────────── */}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="border-border/60 hover:bg-muted"
                onClick={() => {
                  constituencyForm.reset();
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
