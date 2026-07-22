import { useParams, Link } from "wouter";
import { cn } from "@/lib/utils";
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
  const Icon = info.icon;
  return (
    <MainLayout title="Community Group">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
          <div className="flex items-start gap-4">
            <Link href="/community">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted border-border/60 shadow-sm shrink-0">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center p-1.5 border border-primary/20 shrink-0">
                  <Icon className="h-7 w-7 text-primary animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">{group.name}</h1>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">{info.label}</p>
                </div>
                <Badge
                  className={cn(
                    "text-[10px] sm:text-xs font-semibold border shadow-none",
                    group.isActive
                      ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground border-border/50"
                  )}
                >
                  {group.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap font-medium">
                <Badge variant="secondary" className="text-[10px] font-semibold gap-1.5 px-2 py-0.5 border">
                  <Icon className="h-3.5 w-3.5" />
                  {info.label}
                </Badge>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer">
                  <Map className="h-3.5 w-3.5 text-muted-foreground" />
                  <Link to={`/wards/${group.ward.id}`}>
                    <span>Ward #{group.ward.wardNumber} - {group.ward.name}</span>
                  </Link>
                </span>
                {group.wardArea && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {group.wardArea.name}
                    </span>
                  </>
                )}
                {group.registrationNo && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-muted-foreground font-mono">
                      <Hash className="h-3.5 w-3.5" />
                      {group.registrationNo}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <PermissionGate module="community_groups" action="update">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 text-xs font-semibold border-border/60 hover:bg-muted shadow-sm"
                disabled={toggleMut.isPending}
                onClick={() => toggleMut.mutate(group.id)}
              >
                {toggleMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : group.isActive ? (
                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                )}
                {group.isActive ? "Deactivate" : "Activate"}
              </Button>
              <Link to={`/community/${group.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs font-semibold border-border/60 hover:bg-muted shadow-sm">
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
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 h-9 px-3 shadow-sm"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-extrabold text-foreground">Delete "{group.name}"?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground">
                      This permanently removes this community group.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel className="border-border/60 hover:bg-muted">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                    >
                      {deleteMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Members",
              value: totalMembers,
              Icon: Users,
              color: "text-indigo-500",
              bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
              borderColor: "border-indigo-100 dark:border-indigo-950/50",
            },
            {
              label: "Male Members",
              value: group.maleMembers || 0,
              textIcon: "M",
              color: "text-blue-500",
              bgColor: "bg-blue-50 dark:bg-blue-950/30",
              borderColor: "border-blue-100 dark:border-blue-950/50",
            },
            {
              label: "Female Members",
              value: group.femaleMembers || 0,
              textIcon: "F",
              color: "text-pink-500",
              bgColor: "bg-pink-50 dark:bg-pink-950/30",
              borderColor: "border-pink-100 dark:border-pink-950/50",
            },
            {
              label: "Founded",
              value: group.foundedDate ? format(new Date(group.foundedDate), "yyyy") : "—",
              Icon: Calendar,
              color: "text-amber-500",
              bgColor: "bg-amber-50 dark:bg-amber-950/30",
              borderColor: "border-amber-100 dark:border-amber-950/50",
            },
          ].map((s, i) => (
            <Card key={i} className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border/50 bg-card hover:border-primary/20 rounded-2xl">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                <div className="flex justify-between items-center">
                  <div className={cn("p-2 rounded-xl border", s.bgColor, s.borderColor)}>
                    {s.Icon ? (
                      <s.Icon className={cn("h-4 w-4", s.color)} />
                    ) : (
                      <span className={cn("text-sm font-extrabold leading-none", s.color)}>{s.textIcon}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                    {s.label}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                    {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                  </h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gender Distribution */}
        {totalMembers > 0 && (
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Member Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-4 bg-muted rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                  style={{ width: `${malePercent}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-500"
                  style={{ width: `${femalePercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-3 text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Male: {group.maleMembers || 0} ({malePercent.toFixed(1)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  Female: {group.femaleMembers || 0} ({femalePercent.toFixed(1)}%)
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Head Person + Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Head Person */}
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Head / Contact Person
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {group.headName ? (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0 shadow-sm">
                    {group.headName.charAt(0)}
                  </div>
                  <div className="space-y-2 min-w-0 font-semibold text-xs sm:text-sm">
                    <div>
                      <p className="font-extrabold text-foreground truncate text-sm">
                        {group.headName}
                      </p>
                      {group.headDesignation && (
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                          {group.headDesignation}
                        </p>
                      )}
                    </div>
                    {group.headPhone && (
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="text-foreground">{group.headPhone}</span>
                      </p>
                    )}
                    {group.headEmail && (
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="text-foreground truncate">{group.headEmail}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic font-normal py-4">
                  No head person assigned.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Location + Details */}
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30 text-xs sm:text-sm font-semibold">
                <div className="flex justify-between px-6 py-3.5">
                  <span className="text-muted-foreground">Ward</span>
                  <Link to={`/wards/${group.ward.id}`}>
                    <span className="text-primary hover:underline cursor-pointer">
                      #{group.ward.wardNumber} {group.ward.name}
                    </span>
                  </Link>
                </div>
                {group.wardArea && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Area</span>
                    <span className="text-foreground">
                      {group.wardArea.name} ({group.wardArea.areaType})
                    </span>
                  </div>
                )}
                {group.address && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Address</span>
                    <span className="text-right max-w-[200px] text-foreground">
                      {group.address}
                    </span>
                  </div>
                )}
                {group.foundedDate && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Founded</span>
                    <span className="text-foreground">
                      {format(new Date(group.foundedDate), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
                {group.registrationNo && (
                  <div className="flex justify-between px-6 py-3.5">
                    <span className="text-muted-foreground">Registration #</span>
                    <span className="font-mono text-foreground font-bold">{group.registrationNo}</span>
                  </div>
                )}
                <div className="flex justify-between px-6 py-3.5">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{format(new Date(group.createdAt), "dd MMM yyyy")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {group.description && (
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap font-medium">
                {group.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Related Groups in Same Ward */}
        {group.relatedGroups && group.relatedGroups.length > 0 && (
          <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Other Groups in {group.ward.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {group.relatedGroups.map((rg: any) => {
                  const rgInfo = getTypeInfo(rg.type);
                  const RgIcon = rgInfo.icon;

                  return (
                    <Link key={rg.id} to={`/community/${rg.id}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted gap-1.5 py-1.5 px-3 border-border/70 hover:border-primary/25 rounded-lg shadow-sm"
                      >
                        <RgIcon className="h-4 w-4" />
                        <span className="font-semibold text-xs text-foreground">{rg.name}</span>
                        {rg.memberCount > 0 && (
                          <span className="text-muted-foreground ml-1 font-normal font-mono text-[10px]">
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
