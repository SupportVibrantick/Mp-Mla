import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useParams } from "wouter";

import { useBooth, useToggleBooth, useDeleteBooth } from "@/hooks/useBooths";

import { MainLayout } from "@/components/layout/MainLayout";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  Map,
  Landmark,
  Building2,
  Navigation,
  ToggleLeft,
  ToggleRight,
  Hash,
  Globe2,
} from "lucide-react";

export default function BoothDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [, navigate] = useLocation();

  const { data: boothRes, isLoading } = useBooth(id);

  const booth = boothRes?.data;

  const toggleMut = useToggleBooth();

  const deleteMut = useDeleteBooth();

  if (isLoading) {
    return (
      <MainLayout title="Booth Details">
        <div className="space-y-6 max-w-6xl mx-auto">
          <Skeleton className="h-10 w-72" />

          <Skeleton className="h-11 w-full max-w-3xl" />

          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!booth) {
    return (
      <MainLayout title="Booth">
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <MapPin className="h-12 w-12 text-muted-foreground opacity-30" />

          <p className="text-sm text-muted-foreground font-medium">
            Booth not found.
          </p>

          <Link to="/geography/booths">
            <Button variant="outline" size="sm">
              Back to list
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const constituency = booth.constituency;

  const ward = booth.ward;

  const townVillage = booth.townVillage;

  const pollingLocation = booth.pollingLocation;

  return (
    <MainLayout title={`${booth.boothName} Details`}>
      <div className="space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 border-border/60"
              onClick={() => navigate("/geography/booths")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold">
                  Booth {booth.boothNumber}
                </h1>

                <Badge
                  className={cn(
                    booth.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {booth.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {booth.boothName}

                {booth.code && (
                  <>
                    {" • "}
                    <span className="font-mono">{booth.code}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => navigate(`/geography/booths?edit=${booth.id}`)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 text-xs",
                booth.isActive ? "text-amber-600" : "text-emerald-600",
              )}
              disabled={toggleMut.isPending}
              onClick={() => toggleMut.mutate(booth.id)}
            >
              {booth.isActive ? (
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

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-9 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete Booth {booth.boothNumber}?
                  </AlertDialogTitle>
                </AlertDialogHeader>

                <p className="text-sm text-muted-foreground">
                  This action will remove the booth from the constituency
                  geography.
                </p>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>

                  <AlertDialogAction
                    className="bg-destructive text-white"
                    disabled={deleteMut.isPending}
                    onClick={async () => {
                      await deleteMut.mutateAsync(booth.id);

                      navigate("/geography/booths");
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* =================================================
            TABS
        ================================================= */}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-muted/40 p-1 rounded-xl h-11">
            <TabsTrigger value="overview" className="text-xs font-semibold">
              Overview
            </TabsTrigger>

            <TabsTrigger value="geography" className="text-xs font-semibold">
              Geography
            </TabsTrigger>

            <TabsTrigger value="location" className="text-xs font-semibold">
              Polling Location
            </TabsTrigger>

            <TabsTrigger value="coordinates" className="text-xs font-semibold">
              Coordinates
            </TabsTrigger>
          </TabsList>

          {/* =================================================
              OVERVIEW
          ================================================= */}

          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card className="border-border/50 rounded-2xl">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-bold text-sm border-b pb-2">
                  Booth Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InfoItem
                    label="Booth Number"
                    value={`Booth ${booth.boothNumber}`}
                    icon={Hash}
                  />

                  <InfoItem
                    label="Booth Name"
                    value={booth.boothName}
                    icon={MapPin}
                  />

                  <InfoItem
                    label="Booth Code"
                    value={booth.code || "No code set"}
                    icon={Hash}
                  />

                  <InfoItem
                    label="Constituency"
                    value={constituency?.name || "N/A"}
                    icon={Landmark}
                  />

                  <InfoItem
                    label="Ward"
                    value={ward?.name || "Not linked"}
                    icon={Map}
                  />

                  <InfoItem
                    label="Town/Village"
                    value={townVillage?.name || "Not linked"}
                    icon={Globe2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* QUICK STATS */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickStat
                label="Booth Number"
                value={booth.boothNumber}
                icon={Hash}
              />

              <QuickStat
                label="Polling Location"
                value={pollingLocation ? "Assigned" : "Not Assigned"}
                icon={Navigation}
              />

              <QuickStat
                label="Coordinates"
                value={
                  booth.latitude !== null && booth.longitude !== null
                    ? "Available"
                    : "Not Available"
                }
                icon={MapPin}
              />
            </div>
          </TabsContent>

          {/* =================================================
              GEOGRAPHY
          ================================================= */}

          <TabsContent value="geography" className="mt-4">
            <Card className="border-border/50 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Geography Level</TableHead>

                    <TableHead>Name</TableHead>

                    <TableHead>Code</TableHead>

                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <GeographyRow
                    level="Constituency"
                    name={constituency?.name}
                    code={constituency?.code}
                    active={constituency?.isActive}
                  />

                  <GeographyRow
                    level="Ward"
                    name={ward?.name}
                    code={ward?.code}
                    active={ward?.isActive}
                  />

                  <GeographyRow
                    level="Town/Village"
                    name={townVillage?.name}
                    code={townVillage?.code}
                    active={townVillage?.isActive}
                  />
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* =================================================
              POLLING LOCATION
          ================================================= */}

          <TabsContent value="location" className="mt-4">
            {pollingLocation ? (
              <Card className="border-border/50 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                      <Navigation className="h-6 w-6 text-amber-500" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        Polling Location
                      </p>

                      <h2 className="text-xl font-extrabold">
                        {pollingLocation.name}
                      </h2>

                      {pollingLocation.address && (
                        <p className="text-sm text-muted-foreground">
                          {pollingLocation.address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <InfoValue
                      label="Location Code"
                      value={pollingLocation.code || "—"}
                    />

                    <InfoValue
                      label="Accessibility"
                      value={
                        pollingLocation.isAccessible
                          ? "Accessible"
                          : "Not Accessible"
                      }
                    />

                    <InfoValue
                      label="Status"
                      value={pollingLocation.isActive ? "Active" : "Inactive"}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed rounded-2xl">
                <CardContent className="p-12 text-center">
                  <Navigation className="h-12 w-12 mx-auto opacity-30" />

                  <h3 className="font-bold mt-4">No Polling Location</h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    This booth is not linked to a polling location.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* =================================================
              COORDINATES
          ================================================= */}

          <TabsContent value="coordinates" className="mt-4">
            <Card className="border-border/50 rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-bold text-sm border-b pb-2">
                  Booth Coordinates
                </h3>

                {booth.latitude !== null && booth.longitude !== null ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                    <InfoValue
                      label="Latitude"
                      value={String(booth.latitude)}
                    />

                    <InfoValue
                      label="Longitude"
                      value={String(booth.longitude)}
                    />
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <MapPin className="h-10 w-10 mx-auto opacity-30" />

                    <p className="text-sm font-semibold mt-3">
                      Coordinates not configured
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Add latitude and longitude to map this booth.
                    </p>
                  </div>
                )}

                {booth.boundary && (
                  <div className="mt-6">
                    <Label className="text-xs font-semibold">Boundary</Label>

                    <pre className="mt-2 p-4 rounded-xl bg-muted/30 border overflow-auto text-xs">
                      {JSON.stringify(booth.boundary, null, 2)}
                    </pre>
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
   COMPONENTS
========================================================= */

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />

      <div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
          {label}
        </span>

        <span className="text-sm font-bold text-foreground mt-1 block">
          {value}
        </span>
      </div>
    </div>
  );
}

function InfoValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border bg-muted/5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>

      <p className="text-sm font-bold mt-1">{value}</p>
    </div>
  );
}

function QuickStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: any;
}) {
  return (
    <Card className="rounded-2xl border-border/50">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 rounded-xl bg-muted/40">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {label}
          </span>

          <h4 className="text-lg font-extrabold mt-0.5">{value}</h4>
        </div>
      </CardContent>
    </Card>
  );
}

function GeographyRow({
  level,
  name,
  code,
  active,
}: {
  level: string;
  name?: string;
  code?: string;
  active?: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="font-semibold">{level}</TableCell>

      <TableCell>{name || "Not linked"}</TableCell>

      <TableCell className="font-mono text-xs">{code || "—"}</TableCell>

      <TableCell>
        {name ? (
          <Badge
            className={
              active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-muted text-muted-foreground"
            }
          >
            {active ? "Active" : "Inactive"}
          </Badge>
        ) : (
          <Badge variant="outline">Not linked</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
