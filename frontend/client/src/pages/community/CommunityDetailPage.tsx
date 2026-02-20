import { useParams, Link } from "wouter";
import {
  useCommunityGroup,
  useDeleteCommunityGroup,
  useToggleCommunityGroup,
  getTypeInfo,
} from "@/hooks/useCommunityGroups";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Hash,
  User,
  Map,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useCommunityGroup(id);
  const deleteMut = useDeleteCommunityGroup();
  const toggleMut = useToggleCommunityGroup();

  const group = res?.data;

  if (isLoading) {
    return (
      <MainLayout title="Community Group">
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (!group) {
    return (
      <MainLayout title="Community Group">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Users className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Group not found</p>
          <Link to="/community">
            <Button variant="outline">Back to Groups</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const info = getTypeInfo(group.type);
  const totalMembers = group.memberCount || 0;
  const malePercent = totalMembers
    ? ((group.maleMembers || 0) / totalMembers) * 100
    : 0;
  const femalePercent = totalMembers
    ? ((group.femaleMembers || 0) / totalMembers) * 100
    : 0;

  const handleDelete = async () => {
    await deleteMut.mutateAsync(group.id);
    navigate("/community");
  };

  return (
    <MainLayout title="Community Group">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/community">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-3xl">{info.icon}</span>
                <h1 className="text-2xl font-bold">{group.name}</h1>
                <Badge
                  className={`text-[10px] ${
                    group.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {group.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {info.label}
                </Badge>
                <span className="flex items-center gap-1">
                  <Map className="h-3.5 w-3.5" />#{group.ward.wardNumber}{" "}
                  {group.ward.name}
                </span>
                {group.wardArea && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {group.wardArea.name}
                  </span>
                )}
                {group.registrationNo && (
                  <span className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" />
                    {group.registrationNo}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <PermissionGate module="community_groups" action="update">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={toggleMut.isPending}
                onClick={() => toggleMut.mutate(group.id)}
              >
                {toggleMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : group.isActive ? (
                  <ToggleRight className="h-3.5 w-3.5" />
                ) : (
                  <ToggleLeft className="h-3.5 w-3.5" />
                )}
                {group.isActive ? "Deactivate" : "Activate"}
              </Button>
              <Link to={`/community/${group.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="community_groups" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive border-destructive/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{group.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes this community group.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {deleteMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">
                {totalMembers.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <span className="text-blue-600 font-bold text-lg block mb-1">
                M
              </span>
              <p className="text-2xl font-bold">
                {(group.maleMembers || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Male</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <span className="text-pink-600 font-bold text-lg block mb-1">
                F
              </span>
              <p className="text-2xl font-bold">
                {(group.femaleMembers || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Female</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-bold">
                {group.foundedDate
                  ? format(new Date(group.foundedDate), "yyyy")
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Founded</p>
            </CardContent>
          </Card>
        </div>

        {/* Gender Distribution */}
        {totalMembers > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Member Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${malePercent}%` }}
                />
                <div
                  className="h-full bg-pink-500"
                  style={{ width: `${femalePercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  Male: {group.maleMembers || 0} ({malePercent.toFixed(1)}%)
                </span>
                <span>
                  Female: {group.femaleMembers || 0} ({femalePercent.toFixed(1)}
                  %)
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Head Person + Details */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Head Person */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Head / Contact Person
              </CardTitle>
            </CardHeader>
            <CardContent>
              {group.headName ? (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                    {group.headName.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {group.headName}
                    </p>
                    {group.headDesignation && (
                      <p className="text-xs text-muted-foreground">
                        {group.headDesignation}
                      </p>
                    )}
                    {group.headPhone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {group.headPhone}
                      </p>
                    )}
                    {group.headEmail && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> {group.headEmail}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No head person assigned.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Location + Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ward</span>
                <Link to={`/wards/${group.ward.id}`}>
                  <span className="text-primary hover:underline cursor-pointer">
                    #{group.ward.wardNumber} {group.ward.name}
                  </span>
                </Link>
              </div>
              {group.wardArea && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Area</span>
                  <span>
                    {group.wardArea.name} ({group.wardArea.areaType})
                  </span>
                </div>
              )}
              {group.address && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-right max-w-[200px]">
                    {group.address}
                  </span>
                </div>
              )}
              {group.foundedDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Founded</span>
                  <span>
                    {format(new Date(group.foundedDate), "dd MMM yyyy")}
                  </span>
                </div>
              )}
              {group.registrationNo && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Registration #</span>
                  <span className="font-mono">{group.registrationNo}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(group.createdAt), "dd MMM yyyy")}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {group.description && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {group.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Related Groups in Same Ward */}
        {group.relatedGroups && group.relatedGroups.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Other Groups in {group.ward.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {group.relatedGroups.map((rg: any) => {
                  const rgInfo = getTypeInfo(rg.type);
                  return (
                    <Link key={rg.id} to={`/community/${rg.id}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted gap-1 py-1.5"
                      >
                        <span>{rgInfo.icon}</span>
                        {rg.name}
                        {rg.memberCount > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({rg.memberCount})
                          </span>
                        )}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
