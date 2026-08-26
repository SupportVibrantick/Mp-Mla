import { useMemo, useState } from "react";

import { Link } from "wouter";

import { cn } from "@/lib/utils";

import {
  usePollingLocations,
  useCreatePollingLocation,
  useUpdatePollingLocation,
  useDeletePollingLocation,
  useTogglePollingLocation,
} from "@/hooks/usePollingLocations";

import {
  useGeographyStats,
} from "@/hooks/useConstituencies";

import {
  useForm,
} from "react-hook-form";

import {
  zodResolver,
} from "@hookform/resolvers/zod";

import { z } from "zod";

import { PermissionGate } from "@/components/auth/PermissionGate";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Label,
} from "@/components/ui/label";

import {
  Skeleton,
} from "@/components/ui/skeleton";

import {
  Textarea,
} from "@/components/ui/textarea";

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
  MainLayout,
} from "@/components/layout/MainLayout";

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
  Vote,
  Accessibility,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import PollingLocationDetailPage from "./PollingLocationDetailPage";

/* =========================================================
   VALIDATION
========================================================= */

const pollingLocationSchema =
  z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Polling location name must be at least 2 characters.",
      )
      .max(
        150,
        "Polling location name must be at most 150 characters.",
      ),

    code: z
      .string()
      .trim()
      .max(
        50,
        "Code must be at most 50 characters.",
      )
      .optional()
      .or(z.literal("")),

    buildingName: z
      .string()
      .trim()
      .max(
        200,
        "Building name must be at most 200 characters.",
      )
      .optional()
      .or(z.literal("")),

    address: z
      .string()
      .trim()
      .max(
        500,
        "Address must be at most 500 characters.",
      )
      .optional()
      .or(z.literal("")),

    pincode: z
      .string()
      .trim()
      .refine(
        (value) =>
          !value ||
          /^\d{6}$/.test(value),
        "Pincode must contain exactly 6 digits.",
      )
      .optional()
      .or(z.literal("")),

    landmark: z
      .string()
      .trim()
      .max(
        200,
        "Landmark must be at most 200 characters.",
      )
      .optional()
      .or(z.literal("")),

    latitude: z
      .string()
      .trim()
      .refine(
        (value) => {
          if (!value) return true;

          const n = Number(value);

          return (
            Number.isFinite(n) &&
            n >= -90 &&
            n <= 90
          );
        },
        "Latitude must be between -90 and 90.",
      )
      .optional()
      .or(z.literal("")),

    longitude: z
      .string()
      .trim()
      .refine(
        (value) => {
          if (!value) return true;

          const n = Number(value);

          return (
            Number.isFinite(n) &&
            n >= -180 &&
            n <= 180
          );
        },
        "Longitude must be between -180 and 180.",
      )
      .optional()
      .or(z.literal("")),

    description: z
      .string()
      .trim()
      .max(
        1000,
        "Description must be at most 1000 characters.",
      )
      .optional()
      .or(z.literal("")),

    isAccessible: z.boolean(),
  });

type PollingLocationForm =
  z.infer<
    typeof pollingLocationSchema
  >;

/* =========================================================
   EMPTY FORM
========================================================= */

const emptyForm: PollingLocationForm = {
  name: "",
  code: "",
  buildingName: "",
  address: "",
  pincode: "",
  landmark: "",
  latitude: "",
  longitude: "",
  description: "",
  isAccessible: true,
};

/* =========================================================
   PAGE
========================================================= */

export default function PollingLocationsPage({
  id,
}: {
  id?: string;
}) {
  /*
   * Keep this identical to Constituency architecture:
   *
   * /geography/polling-locations
   *       -> list
   *
   * /geography/polling-locations/:id
   *       -> detail
   */

  if (id) {
    return (
      <PollingLocationDetailPage />
    );
  }

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [accessibilityFilter, setAccessibilityFilter] =
    useState("all");

  const [page, setPage] =
    useState(1);

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<any>(null);

  /* =======================================================
     QUERY
  ======================================================= */

  const queryParams = useMemo(() => {
    const params: Record<
      string,
      any
    > = {
      page,
      limit: 10,
    };

    if (search.trim()) {
      params.search =
        search.trim();
    }

    if (
      statusFilter !== "all"
    ) {
      params.status =
        statusFilter;
    }

    /*
     * Accessibility is kept client-side
     * because your current backend route
     * was only specified with search/status.
     */
    return params;
  }, [
    page,
    search,
    statusFilter,
  ]);

  const {
    data: response,
    isLoading,
  } =
    usePollingLocations(
      queryParams,
    );

  const {
    data: statsResponse,
  } =
    useGeographyStats();

  const createMutation =
    useCreatePollingLocation();

  const updateMutation =
    useUpdatePollingLocation();

  const deleteMutation =
    useDeletePollingLocation();

  const toggleMutation =
    useTogglePollingLocation();

  /* =======================================================
     FORM
  ======================================================= */

  const form =
    useForm<PollingLocationForm>({
      resolver:
        zodResolver(
          pollingLocationSchema,
        ),

      defaultValues:
        emptyForm,
    });

  /* =======================================================
     RESPONSE NORMALIZATION
  ======================================================= */

  const result =
    response?.data;

  let items =
    Array.isArray(result)
      ? result
      : result?.items || [];

  if (
    accessibilityFilter !==
    "all"
  ) {
    items = items.filter(
      (item: any) =>
        accessibilityFilter ===
        "ACCESSIBLE"
          ? item.isAccessible
          : !item.isAccessible,
    );
  }

  const pagination =
    result?.totalPages !==
    undefined
      ? {
          page: result.page,
          totalPages:
            result.totalPages,
          total: result.total,
          hasNextPage:
            result.page <
            result.totalPages,
          hasPrevPage:
            result.page > 1,
        }
      : null;

  const geoStats =
    statsResponse?.data;

  /* =======================================================
     DIALOG
  ======================================================= */

  const openAdd = () => {
    setEditing(null);

    form.reset({
      ...emptyForm,
    });

    setDialogOpen(true);
  };

  const openEdit = (
    location: any,
  ) => {
    setEditing(location);

    form.reset({
      name:
        location.name || "",

      code:
        location.code || "",

      buildingName:
        location.buildingName ||
        "",

      address:
        location.address || "",

      pincode:
        location.pincode || "",

      landmark:
        location.landmark || "",

      latitude:
        location.latitude !=
        null
          ? String(
              location.latitude,
            )
          : "",

      longitude:
        location.longitude !=
        null
          ? String(
              location.longitude,
            )
          : "",

      description:
        location.description ||
        "",

      isAccessible:
        location.isAccessible !==
        false,
    });

    setDialogOpen(true);
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const save = async (
    data: PollingLocationForm,
  ) => {
    try {
      const payload = {
        name: data.name.trim(),

        code:
          data.code?.trim() ||
          undefined,

        buildingName:
          data.buildingName?.trim() ||
          undefined,

        address:
          data.address?.trim() ||
          undefined,

        pincode:
          data.pincode?.trim() ||
          undefined,

        landmark:
          data.landmark?.trim() ||
          undefined,

        latitude:
          data.latitude
            ? Number(
                data.latitude,
              )
            : null,

        longitude:
          data.longitude
            ? Number(
                data.longitude,
              )
            : null,

        description:
          data.description?.trim() ||
          undefined,

        isAccessible:
          data.isAccessible,
      };

      if (editing) {
        await updateMutation.mutateAsync(
          {
            id: editing.id,
            data: payload,
          },
        );
      } else {
        await createMutation.mutateAsync(
          payload,
        );
      }

      setDialogOpen(false);

      form.reset(emptyForm);

      setEditing(null);
    } catch {
      /*
       * Mutation hook handles
       * error toast.
       */
    }
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setAccessibilityFilter(
      "all",
    );
    setPage(1);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <MainLayout title="Polling Locations">
      <div className="space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <MapPin className="h-7 w-7 text-primary" />

              Polling Locations
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Configure polling locations,
              accessibility and assigned
              polling booths.
            </p>
          </div>

          <PermissionGate
            module="constituency"
            action="create"
          >
            <Button
              className="gap-2 w-full sm:w-auto justify-center bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white font-semibold shadow-md hover:shadow-lg transition-all h-9 text-xs px-4 border-none"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />

              Add Polling Location
            </Button>
          </PermissionGate>
        </div>

        {/* =================================================
            STATS
        ================================================= */}

        {geoStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                label:
                  "Polling Locations",

                value:
                  pagination?.total ??
                  items.length,

                Icon: MapPin,

                color:
                  "text-indigo-500",

                bgColor:
                  "bg-indigo-50 dark:bg-indigo-950/30",

                borderColor:
                  "border-indigo-100 dark:border-indigo-950/50",
              },

              {
                label:
                  "Active",

                value:
                  items.filter(
                    (x: any) =>
                      x.isActive,
                  ).length,

                Icon: ToggleRight,

                color:
                  "text-emerald-500",

                bgColor:
                  "bg-emerald-50 dark:bg-emerald-950/30",

                borderColor:
                  "border-emerald-100 dark:border-emerald-950/50",
              },

              {
                label:
                  "Accessible",

                value:
                  items.filter(
                    (x: any) =>
                      x.isAccessible,
                  ).length,

                Icon: Accessibility,

                color:
                  "text-blue-500",

                bgColor:
                  "bg-blue-50 dark:bg-blue-950/30",

                borderColor:
                  "border-blue-100 dark:border-blue-950/50",
              },

              {
                label:
                  "Assigned Booths",

                value:
                  geoStats.booths ||
                  0,

                Icon: Vote,

                color:
                  "text-violet-500",

                bgColor:
                  "bg-violet-50 dark:bg-violet-950/30",

                borderColor:
                  "border-violet-100 dark:border-violet-950/50",
              },

              {
                label:
                  "Locations with Buildings",

                value:
                  items.filter(
                    (x: any) =>
                      !!x.buildingName,
                  ).length,

                Icon: Building2,

                color:
                  "text-amber-500",

                bgColor:
                  "bg-amber-50 dark:bg-amber-950/30",

                borderColor:
                  "border-amber-100 dark:border-amber-950/50",
              },
            ].map(
              (
                stat,
                index,
              ) => (
                <Card
                  key={index}
                  className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl"
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                    <div className="flex justify-between items-center">
                      <div
                        className={cn(
                          "p-2 rounded-xl border",
                          stat.bgColor,
                          stat.borderColor,
                        )}
                      >
                        <stat.Icon
                          className={cn(
                            "h-4 w-4",
                            stat.color,
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                        {stat.label}
                      </p>

                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                        {stat.value}
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        )}

        {/* =================================================
            FILTERS
        ================================================= */}

        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Input
                  placeholder="Search by location name, code or building..."
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) => {
                    setSearch(
                      event.target
                        .value,
                    );

                    setPage(
                      1,
                    );
                  }}
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex gap-2.5 flex-wrap w-full lg:w-auto">
                <Select
                  value={
                    statusFilter
                  }
                  onValueChange={(
                    value,
                  ) => {
                    setStatusFilter(
                      value,
                    );

                    setPage(
                      1,
                    );
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      All Status
                    </SelectItem>

                    <SelectItem value="ACTIVE">
                      Active
                    </SelectItem>

                    <SelectItem value="INACTIVE">
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={
                    accessibilityFilter
                  }
                  onValueChange={(
                    value,
                  ) => {
                    setAccessibilityFilter(
                      value,
                    );

                    setPage(
                      1,
                    );
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40 h-10 border-border/60 bg-muted/10">
                    <SelectValue placeholder="Accessibility" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      All Locations
                    </SelectItem>

                    <SelectItem value="ACCESSIBLE">
                      Accessible
                    </SelectItem>

                    <SelectItem value="NOT_ACCESSIBLE">
                      Not Accessible
                    </SelectItem>
                  </SelectContent>
                </Select>

                {(search ||
                  statusFilter !==
                    "all" ||
                  accessibilityFilter !==
                    "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={
                      resetFilters
                    }
                    className="text-xs h-10 px-3 text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* =================================================
            TABLE
        ================================================= */}

        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Polling Location
                    </TableHead>

                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Code
                    </TableHead>

                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Building
                    </TableHead>

                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Booths
                    </TableHead>

                    <TableHead className="h-12 px-4 text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">
                      Accessibility
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
                    Array.from({
                      length: 5,
                    }).map(
                      (
                        _,
                        index,
                      ) => (
                        <TableRow
                          key={
                            index
                          }
                        >
                          {Array.from(
                            {
                              length: 7,
                            },
                          ).map(
                            (
                              _,
                              cell,
                            ) => (
                              <TableCell
                                key={
                                  cell
                                }
                                className="py-4 px-4"
                              >
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ),
                          )}
                        </TableRow>
                      ),
                    )
                  ) : items.length ===
                    0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={
                          7
                        }
                        className="text-center py-16 text-xs text-muted-foreground"
                      >
                        <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />

                        <p className="font-medium text-sm">
                          No polling locations found matching your filters.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map(
                      (
                        location: any,
                      ) => (
                        <TableRow
                          key={
                            location.id
                          }
                          className={cn(
                            "hover:bg-muted/10 transition-colors border-b border-border/40",
                            !location.isActive &&
                              "opacity-50",
                          )}
                        >
                          {/* LOCATION */}

                          <TableCell className="py-4 px-4">
                            <Link
                              to={`/geography/polling-locations/${location.id}`}
                            >
                              <p className="font-semibold text-primary hover:underline text-sm flex items-center gap-2 cursor-pointer">
                                <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />

                                {
                                  location.name
                                }
                              </p>

                              {location.description && (
                                <p className="text-[10px] text-muted-foreground max-w-[220px] truncate font-medium mt-0.5">
                                  {
                                    location.description
                                  }
                                </p>
                              )}
                            </Link>
                          </TableCell>

                          {/* CODE */}

                          <TableCell className="py-4 px-4">
                            {location.code ? (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] font-bold px-2 py-0.5 border-border/80"
                              >
                                {
                                  location.code
                                }
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                —
                              </span>
                            )}
                          </TableCell>

                          {/* BUILDING */}

                          <TableCell className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />

                              <span className="text-xs font-semibold">
                                {location.buildingName ||
                                  "—"}
                              </span>
                            </div>
                          </TableCell>

                          {/* BOOTHS */}

                          <TableCell className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold"
                            >
                              <Vote className="h-3 w-3 mr-1" />

                              {location
                                ._count
                                ?.booths ??
                                location.boothCount ??
                                0}
                            </Badge>
                          </TableCell>

                          {/* ACCESSIBILITY */}

                          <TableCell className="py-4 px-4">
                            <Badge
                              className={cn(
                                "text-[9px] sm:text-[10px] font-semibold border shadow-none",
                                location.isAccessible
                                  ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground border-border/50",
                              )}
                            >
                              {location.isAccessible
                                ? "Accessible"
                                : "Not Accessible"}
                            </Badge>
                          </TableCell>

                          {/* STATUS */}

                          <TableCell className="py-4 px-4">
                            <Badge
                              className={cn(
                                "text-[9px] sm:text-[10px] font-semibold border shadow-none",
                                location.isActive
                                  ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground border-border/50",
                              )}
                            >
                              {location.isActive
                                ? "Active"
                                : "Inactive"}
                            </Badge>
                          </TableCell>

                          {/* ACTIONS */}

                          <TableCell className="py-4 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/geography/polling-locations/${location.id}`}
                              >
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
                                  disabled={
                                    toggleMutation.isPending
                                  }
                                  onClick={() =>
                                    toggleMutation.mutate(
                                      location.id,
                                    )
                                  }
                                  title={
                                    location.isActive
                                      ? "Deactivate"
                                      : "Activate"
                                  }
                                >
                                  {location.isActive ? (
                                    <ToggleRight className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted"
                                  onClick={() =>
                                    openEdit(
                                      location,
                                    )
                                  }
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                              </PermissionGate>

                              <PermissionGate
                                module="constituency"
                                action="delete"
                              >
                                <AlertDialog>
                                  <AlertDialogTrigger
                                    asChild
                                  >
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
                                        Delete "
                                        {
                                          location.name
                                        }
                                        "?
                                      </AlertDialogTitle>
                                    </AlertDialogHeader>

                                    <AlertDialogFooter className="gap-2 sm:gap-0">
                                      <AlertDialogCancel className="border-border/60 hover:bg-muted">
                                        Cancel
                                      </AlertDialogCancel>

                                      <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                                        disabled={
                                          deleteMutation.isPending
                                        }
                                        onClick={() =>
                                          deleteMutation.mutate(
                                            location.id,
                                          )
                                        }
                                      >
                                        {deleteMutation.isPending ? (
                                          <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />

                                            Deleting
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
                      ),
                    )
                  )}
                </TableBody>
              </Table>
            </div>

            {/* PAGINATION */}

            {pagination &&
              pagination.totalPages >
                1 && (
                <div className="flex items-center justify-between px-4 py-3.5 border-t border-border/40">
                  <p className="text-xs text-muted-foreground font-semibold">
                    Page{" "}
                    {
                      pagination.page
                    }{" "}
                    of{" "}
                    {
                      pagination.totalPages
                    }{" "}
                    (
                    {
                      pagination.total
                    }{" "}
                    total)
                  </p>

                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted"
                      disabled={
                        !pagination.hasPrevPage
                      }
                      onClick={() =>
                        setPage(
                          (p) =>
                            p -
                            1,
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted"
                      disabled={
                        !pagination.hasNextPage
                      }
                      onClick={() =>
                        setPage(
                          (p) =>
                            p +
                            1,
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* =================================================
          ADD / EDIT DIALOG
      ================================================= */}

      <Dialog
        open={dialogOpen}
        onOpenChange={
          setDialogOpen
        }
      >
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {editing
                ? "Edit Polling Location"
                : "Add New Polling Location"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(
              save,
            )}
            className="space-y-4 py-2"
          >
            {/* NAME + CODE */}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Name"
                required
                error={
                  form.formState
                    .errors
                    .name
                }
              >
                <Input
                  placeholder="E.g., Government Senior Secondary School"
                  {...form.register(
                    "name",
                  )}
                  className="h-10 bg-muted/20 border-border/60"
                />
              </FormField>

              <FormField
                label="Code"
                error={
                  form.formState
                    .errors
                    .code
                }
              >
                <Input
                  placeholder="E.g., PL-001"
                  {...form.register(
                    "code",
                  )}
                  onChange={(
                    event,
                  ) => {
                    form.setValue(
                      "code",
                      event.target.value.toUpperCase(),
                      {
                        shouldDirty:
                          true,
                        shouldValidate:
                          true,
                      },
                    );
                  }}
                  className="h-10 bg-muted/20 border-border/60"
                />
              </FormField>
            </div>

            {/* BUILDING + LANDMARK */}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Building Name"
                error={
                  form.formState
                    .errors
                    .buildingName
                }
              >
                <Input
                  placeholder="E.g., Block A"
                  {...form.register(
                    "buildingName",
                  )}
                  className="h-10 bg-muted/20 border-border/60"
                />
              </FormField>

              <FormField
                label="Landmark"
                error={
                  form.formState
                    .errors
                    .landmark
                }
              >
                <Input
                  placeholder="E.g., Near Bus Stand"
                  {...form.register(
                    "landmark",
                  )}
                  className="h-10 bg-muted/20 border-border/60"
                />
              </FormField>
            </div>

            {/* ADDRESS */}

            <FormField
              label="Address"
              error={
                form.formState
                  .errors
                  .address
              }
            >
              <Input
                placeholder="Complete polling location address"
                {...form.register(
                  "address",
                )}
                className="h-10 bg-muted/20 border-border/60"
              />
            </FormField>

            {/* PIN + COORDINATES */}

            <div className="grid grid-cols-3 gap-4">
              <FormField
                label="Pincode"
                error={
                  form.formState
                    .errors
                    .pincode
                }
              >
                <Input
                  placeholder="110001"
                  maxLength={
                    6
                  }
                  inputMode="numeric"
                  {...form.register(
                    "pincode",
                  )}
                  onChange={(
                    event,
                  ) => {
                    form.setValue(
                      "pincode",
                      event.target.value.replace(
                        /\D/g,
                        "",
                      ),
                      {
                        shouldDirty:
                          true,
                        shouldValidate:
                          true,
                      },
                    );
                  }}
                  className="h-10 bg-muted/20 border-border/60"
                />
              </FormField>

              <FormField
                label="Latitude"
                error={
                  form.formState
                    .errors
                    .latitude
                }
              >
                <Input
                  placeholder="28.6139"
                  {...form.register(
                    "latitude",
                  )}
                  className="h-10 bg-muted/20 border-border/60"
                />
              </FormField>

              <FormField
                label="Longitude"
                error={
                  form.formState
                    .errors
                    .longitude
                }
              >
                <Input
                  placeholder="77.2090"
                  {...form.register(
                    "longitude",
                  )}
                  className="h-10 bg-muted/20 border-border/60"
                />
              </FormField>
            </div>

            {/* DESCRIPTION */}

            <FormField
              label="Description"
              error={
                form.formState
                  .errors
                  .description
              }
            >
              <Textarea
                placeholder="Additional polling location information..."
                {...form.register(
                  "description",
                )}
                className="min-h-[90px] bg-muted/20 border-border/60"
              />
            </FormField>

            {/* ACCESSIBILITY */}

            <div className="flex items-center justify-between rounded-xl border bg-muted/10 p-4">
              <div>
                <Label className="text-sm font-semibold">
                  Accessible Polling Location
                </Label>

                <p className="text-xs text-muted-foreground mt-1">
                  Mark this location if it
                  provides suitable
                  accessibility facilities.
                </p>
              </div>

              <input
                type="checkbox"
                checked={
                  form.watch(
                    "isAccessible",
                  )
                }
                onChange={(
                  event,
                ) =>
                  form.setValue(
                    "isAccessible",
                    event.target
                      .checked,
                    {
                      shouldDirty:
                        true,
                    },
                  )
                }
                className="h-4 w-4"
              />
            </div>

            {/* FOOTER */}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="border-border/60"
                onClick={() =>
                  setDialogOpen(
                    false,
                  )
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {createMutation.isPending ||
                updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editing ? (
                  "Update Location"
                ) : (
                  "Create Location"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: any;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}

        {required && (
          <span className="text-destructive ml-1">
            *
          </span>
        )}
      </Label>

      {children}

      {error && (
        <p className="text-xs font-medium text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}