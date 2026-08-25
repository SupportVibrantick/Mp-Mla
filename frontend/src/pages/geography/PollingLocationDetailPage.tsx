import { Link, useLocation } from "wouter";

import { cn } from "@/lib/utils";
import { useParams } from "wouter";

import {
  usePollingLocation,
  usePollingLocationBooths,
  useTogglePollingLocation,
  useDeletePollingLocation,
} from "@/hooks/usePollingLocations";

import { MainLayout } from "@/components/layout/MainLayout";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Building2,
  Vote,
  Accessibility,
  Navigation,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { PermissionGate } from "@/components/auth/PermissionGate";

export default function PollingLocationDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [, navigate] = useLocation();

  const { data: locationResponse, isLoading } = usePollingLocation(id);

  const { data: boothsResponse, isLoading: boothsLoading } =
    usePollingLocationBooths(id);

  const toggleMutation = useTogglePollingLocation();

  const deleteMutation = useDeletePollingLocation();

  const location = locationResponse?.data;

  const boothResult = boothsResponse?.data;

  const booths = Array.isArray(boothResult)
    ? boothResult
    : boothResult?.items || [];

  /* =======================================================
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <MainLayout title="Polling Location">
        <div className="space-y-6 max-w-6xl mx-auto">
          <Skeleton className="h-10 w-72" />

          <Skeleton className="h-11 w-full max-w-3xl" />

          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!location) {
    return (
      <MainLayout title="Polling Location">
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <MapPin className="h-12 w-12 text-muted-foreground opacity-30" />

          <p className="text-sm text-muted-foreground font-medium">
            Polling location not found.
          </p>

          <Link to="/geography/polling-locations">
            <Button variant="outline" size="sm">
              Back to list
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(location.id);

      navigate("/geography/polling-locations");
    } catch {
      // hook handles error
    }
  };

  /* =======================================================
     TOGGLE
  ======================================================= */

  const handleToggle = async () => {
    await toggleMutation.mutateAsync(location.id);
  };

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <MainLayout title={`${location.name} - Polling Location`}>
      <div className="space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Link to="/geography/polling-locations">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-9 w-9 border-border/60 hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-foreground">
                  {location.name}
                </h1>

                <Badge
                  className={cn(
                    "text-[9px] sm:text-[10px] font-semibold border shadow-none",

                    location.isActive
                      ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground border-border/50",
                  )}
                >
                  {location.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-2 flex-wrap">
                {location.buildingName && (
                  <>
                    Building:
                    <span className="font-bold text-foreground">
                      {location.buildingName}
                    </span>
                  </>
                )}
                {location.code && (
                  <>
                    • Code:
                    <span className="font-mono text-foreground">
                      {location.code}
                    </span>
                  </>
                )}
                • Accessibility:
                <Badge
                  variant={location.isAccessible ? "outline" : "secondary"}
                  className="h-5 px-1.5 py-0"
                >
                  {location.isAccessible ? "Accessible" : "Not Accessible"}
                </Badge>
              </p>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="flex items-center gap-2 flex-wrap">
            <PermissionGate module="constituency" action="update">
              <Link to={`/geography/polling-locations?edit=${location.id}`}>
                <Button variant="outline" size="sm" className="h-9 text-xs">
                  <Edit className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Edit
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 text-xs",

                  location.isActive
                    ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
                )}
                disabled={toggleMutation.isPending}
                onClick={handleToggle}
              >
                {location.isActive ? (
                  <>
                    <ToggleRight className="h-3.5 w-3.5 mr-1.5" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-3.5 w-3.5 mr-1.5" />
                    Activate
                  </>
                )}
              </Button>
            </PermissionGate>

            <PermissionGate module="constituency" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-extrabold text-foreground">
                      Delete "{location.name}
                      "?
                    </AlertDialogTitle>
                  </AlertDialogHeader>

                  <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel className="border-border/60 hover:bg-muted">
                      Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                      disabled={deleteMutation.isPending}
                      onClick={handleDelete}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        </div>

        {/* =================================================
            TABS
        ================================================= */}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-xl bg-muted/40 p-1 rounded-xl h-11">
            <TabsTrigger
              value="overview"
              className="rounded-lg text-xs font-semibold py-1.5"
            >
              Overview
            </TabsTrigger>

            <TabsTrigger
              value="booths"
              className="rounded-lg text-xs font-semibold py-1.5"
            >
              Booths
            </TabsTrigger>

            <TabsTrigger
              value="location"
              className="rounded-lg text-xs font-semibold py-1.5"
            >
              Location
            </TabsTrigger>
          </TabsList>

          {/* =================================================
              OVERVIEW
          ================================================= */}

          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-foreground text-sm border-b pb-2">
                  Polling Location Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <Info label="Location Name" value={location.name} />

                  <Info
                    label="Polling Location Code"
                    value={location.code || "No code set"}
                    mono
                  />

                  <Info
                    label="Building Name"
                    value={location.buildingName || "N/A"}
                  />

                  <Info label="Landmark" value={location.landmark || "N/A"} />

                  <Info label="Address" value={location.address || "N/A"} />

                  <Info
                    label="Pincode"
                    value={location.pincode || "N/A"}
                    mono
                  />

                  <Info
                    label="Accessibility"
                    value={
                      location.isAccessible ? "Accessible" : "Not Accessible"
                    }
                  />

                  <Info
                    label="Status"
                    value={location.isActive ? "Active" : "Inactive"}
                  />
                </div>

                {location.description && (
                  <div className="pt-2">
                    <span className="text-muted-foreground font-semibold text-xs block mb-1">
                      Description
                    </span>

                    <p className="text-foreground text-xs leading-relaxed bg-muted/20 p-3 rounded-xl border">
                      {location.description}
                    </p>
                  </div>
                )}

                {/* QUICK STATS */}

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 rounded-xl border bg-muted/5 flex items-center gap-3">
                    <Vote className="h-8 w-8 text-emerald-500" />

                    <div>
                      <span className="text-xs text-muted-foreground font-semibold">
                        Assigned Booths
                      </span>

                      <h5 className="text-xl font-extrabold text-foreground">
                        {booths.length}
                      </h5>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-muted/5 flex items-center gap-3">
                    <Accessibility
                      className={cn(
                        "h-8 w-8",

                        location.isAccessible
                          ? "text-blue-500"
                          : "text-muted-foreground",
                      )}
                    />

                    <div>
                      <span className="text-xs text-muted-foreground font-semibold">
                        Accessibility
                      </span>

                      <h5 className="text-xl font-extrabold text-foreground">
                        {location.isAccessible ? "Yes" : "No"}
                      </h5>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =================================================
              BOOTHS
          ================================================= */}

          <TabsContent value="booths" className="mt-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead>Booth Number</TableHead>

                      <TableHead>Booth Name</TableHead>

                      <TableHead>Code</TableHead>

                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {boothsLoading ? (
                      Array.from({
                        length: 4,
                      }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={4}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : booths.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-16 text-xs text-muted-foreground"
                        >
                          <Vote className="h-10 w-10 mx-auto mb-3 opacity-30" />

                          <p className="font-medium text-sm">
                            No booths assigned to this polling location.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      booths.map((booth: any) => (
                        <TableRow
                          key={booth.id}
                          className="border-b border-border/40"
                        >
                          <TableCell className="font-semibold">
                            {booth.boothNumber ?? "—"}
                          </TableCell>

                          <TableCell>{booth.boothName || "—"}</TableCell>

                          <TableCell>
                            {booth.code ? (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                {booth.code}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[9px] font-semibold border shadow-none",

                                booth.isActive
                                  ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground border-border/50",
                              )}
                            >
                              {booth.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =================================================
              LOCATION
          ================================================= */}

          <TabsContent value="location" className="mt-4 space-y-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-bold text-foreground text-sm border-b pb-2">
                  Geographic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Info
                    label="Latitude"
                    value={
                      location.latitude != null
                        ? String(location.latitude)
                        : "Not configured"
                    }
                    mono
                  />

                  <Info
                    label="Longitude"
                    value={
                      location.longitude != null
                        ? String(location.longitude)
                        : "Not configured"
                    }
                    mono
                  />
                </div>

                {location.latitude != null && location.longitude != null && (
                  <div className="rounded-xl border bg-muted/20 p-5">
                    <div className="flex items-center gap-3">
                      <Navigation className="h-5 w-5 text-primary" />

                      <div>
                        <p className="text-sm font-bold">Coordinates</p>

                        <p className="font-mono text-xs text-muted-foreground mt-1">
                          {location.latitude}, {location.longitude}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

/* =========================================================
   INFO
========================================================= */

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-muted-foreground font-semibold text-xs block">
        {label}
      </span>

      <span
        className={cn(
          "text-foreground font-bold mt-1 block",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}
