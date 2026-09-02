import { Link, useLocation } from "wouter";

import {
  useTownVillage,
  useToggleTownVillage,
  useDeleteTownVillage,
} from "@/hooks/useTownVillages";
import { useParams } from "wouter";

import { MainLayout } from "@/components/layout/MainLayout";
import { PermissionGate } from "@/components/auth/PermissionGate";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  MapPin,
  Building2,
  Home,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Map,
  Landmark,
} from "lucide-react";

export default function TownVillageDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [, navigate] = useLocation();

  const { data: res, isLoading, isError } = useTownVillage(id);

  const toggleMut = useToggleTownVillage();
  const deleteMut = useDeleteTownVillage();

  const item = res?.data;

  if (isLoading) {
    return (
      <MainLayout title="Town / Village">
        <div className="space-y-6">
          <Skeleton className="h-10 w-72" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48 lg:col-span-2" />
          </div>

          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (isError || !item) {
    return (
      <MainLayout title="Town / Village">
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <MapPin className="h-10 w-10 text-muted-foreground" />

          <h2 className="text-lg font-semibold">Town / Village not found</h2>

          <Button asChild>
            <Link to="/geography/town-villages">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Towns & Villages
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const typeLabel = item.type === "TOWN" ? "Town" : "Village";

  const natureLabel = item.nature === "URBAN" ? "Urban" : "Rural";

  return (
    <MainLayout title={item.name}>
      <div className="space-y-6">
        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/geography/town-villages")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div>
              <div className="flex items-center gap-2">
                {item.type === "TOWN" ? (
                  <Building2 className="h-6 w-6 text-primary" />
                ) : (
                  <Home className="h-6 w-6 text-primary" />
                )}

                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {item.name}
                </h1>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{typeLabel}</Badge>

                <Badge variant="secondary">{natureLabel}</Badge>

                <Badge
                  className={
                    item.isActive
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {item.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <PermissionGate module="constituency" action="update">
              {/* <Button
                variant="outline"
                onClick={() =>
                  navigate(`/geography/town-villages/${item.id}?edit=true`)
                }
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button> */}

              <Button
                variant="outline"
                disabled={toggleMut.isPending}
                onClick={() => toggleMut.mutate(item.id)}
              >
                {item.isActive ? (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </Button>
            </PermissionGate>

            <PermissionGate module="constituency" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {typeLabel}?</AlertDialogTitle>
                  </AlertDialogHeader>

                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete <strong>{item.name}</strong>
                    ?
                  </p>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>

                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteMut.isPending}
                      onClick={async () => {
                        await deleteMut.mutateAsync(item.id);

                        navigate("/geography/town-villages");
                      }}
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
        </div>

        {/* MAIN INFORMATION */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* TYPE CARD */}

          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 rounded-2xl bg-primary/10 p-5">
                {item.type === "TOWN" ? (
                  <Building2 className="h-10 w-10 text-primary" />
                ) : (
                  <Home className="h-10 w-10 text-primary" />
                )}
              </div>

              <h2 className="text-xl font-bold">{item.name}</h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {typeLabel} · {natureLabel}
              </p>

              {item.code && (
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  Code: {item.code}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ADMINISTRATIVE HIERARCHY */}

          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />

                <h2 className="font-semibold">Administrative Hierarchy</h2>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Info
                  label="District"
                  value={item.district?.name || "Not assigned"}
                />

                <Info
                  label="Block"
                  value={item.block?.name || "Not assigned"}
                />

                <Info
                  label="Constituency"
                  value={item.constituency?.name || "Not assigned"}
                />

                <Info label="Pincode" value={item.pincode || "Not available"} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LOCATION */}

        <Card>
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />

              <h2 className="font-semibold">Location</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Info
                label="Latitude"
                value={
                  item.latitude !== null && item.latitude !== undefined
                    ? String(item.latitude)
                    : "Not available"
                }
              />

              <Info
                label="Longitude"
                value={
                  item.longitude !== null && item.longitude !== undefined
                    ? String(item.longitude)
                    : "Not available"
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* DESCRIPTION */}

        {item.description && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 font-semibold">Description</h2>

              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
