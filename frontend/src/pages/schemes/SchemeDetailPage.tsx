import { useParams, Link, useLocation } from "wouter";
import {
  useScheme,
  useDeleteScheme,
  getSchemeStatusInfo,
} from "@/hooks/useSchemes";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MainLayout } from "@/components/layout/MainLayout";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Users,
  Calendar,
  Globe,
  Hash,
  Building2,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";

export default function SchemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useScheme(id);
  const deleteMut = useDeleteScheme();

  const s = res?.data;
  if (isLoading)
    return (
      <MainLayout title="Scheme">
        <div className="space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  if (!s)
    return (
      <MainLayout title="Scheme">
        <div className="flex flex-col items-center justify-center h-64">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p>Not found</p>
        </div>
      </MainLayout>
    );

  const stInfo = getSchemeStatusInfo(s.status);

  return (
    <MainLayout title="Scheme">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/schemes">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{s.name}</h1>
                <Badge className={`text-[10px] ${stInfo.color}`}>
                  {stInfo.label}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {s.level}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {s.department}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <PermissionGate module="schemes" action="update">
              <Link to={`/schemes/${s.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="schemes" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive"
                      onClick={async () => {
                        await deleteMut.mutateAsync(s.id);
                        navigate("/schemes");
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Code",
              value: s.code || "—",
              icon: Hash,
              color: "#6366f1",
            },
            {
              label: "Department",
              value: s.department,
              icon: Building2,
              color: "#3b82f6",
            },
            {
              label: "Applications",
              value: s._count?.applications?.toLocaleString() || "0",
              icon: Users,
              color: "#f59e0b",
            },
            {
              label: "Status",
              value: stInfo.label,
              icon: FileCheck,
              color: "#22c55e",
            },
          ].map((c, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <c.icon
                  className="h-5 w-5 mx-auto mb-1"
                  style={{ color: c.color }}
                />
                <p className="text-2xl font-bold truncate">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scheme Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {s.description && (
                <div>
                  <p className="text-muted-foreground text-xs">Description</p>
                  <p className="mt-0.5">{s.description}</p>
                </div>
              )}
              {s.eligibility && (
                <div>
                  <p className="text-muted-foreground text-xs">Eligibility</p>
                  <p className="mt-0.5">{s.eligibility}</p>
                </div>
              )}
              {s.benefits && (
                <div>
                  <p className="text-muted-foreground text-xs">Benefits</p>
                  <p className="mt-0.5">{s.benefits}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {s.startDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span>{format(new Date(s.startDate), "dd MMM yyyy")}</span>
                </div>
              )}
              {s.endDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date</span>
                  <span>{format(new Date(s.endDate), "dd MMM yyyy")}</span>
                </div>
              )}
              {s.requiredDocuments && Array.isArray(s.requiredDocuments) && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    Required Documents
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {s.requiredDocuments.map((doc: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {doc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {s.applicationUrl && (
                <a
                  href={s.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Apply Online
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Applications Link */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Scheme Applications</p>
                <p className="text-sm text-muted-foreground">
                  View and manage beneficiary applications for this scheme
                </p>
              </div>
            </div>
            <Link to={`/schemes/applications?schemeId=${s.id}`}>
              <Button variant="outline" size="sm">
                View Applications
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}