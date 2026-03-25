import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import * as xlsx from "xlsx";
import { toast } from "sonner";
import api from "@/lib/api";
import { useDeleteWard, useWard, useWardDemographics } from "@/hooks/useWards";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Map,
  ArrowLeft,
  Edit,
  Users,
  Home,
  MapPin,
  Phone,
  User,
  Calendar,
  AlertTriangle,
  Building2,
  ClipboardList,
  BarChart3,
  Download,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
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

const AREA_TYPE_COLORS: Record<string, string> = {
  RESIDENTIAL: "bg-blue-100 text-blue-700",
  COMMERCIAL: "bg-amber-100 text-amber-700",
  INDUSTRIAL: "bg-slate-100 text-slate-700",
  MIXED_USE: "bg-purple-100 text-purple-700",
  SLUM: "bg-red-100 text-red-700",
  INSTITUTIONAL: "bg-green-100 text-green-700",
  AGRICULTURAL: "bg-emerald-100 text-emerald-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export default function WardDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Use replace to simulate navigation without adding to history stack
  const [, setLocation] = useLocation();
  const { data: wardRes, isLoading } = useWard(id);
  const { data: demoRes } = useWardDemographics(id);
  const { mutateAsync: deleteWard, isPending: isDeleting } = useDeleteWard();
  const [isExporting, setIsExporting] = useState(false);

  const ward = wardRes?.data;
  const demographics = demoRes?.data;

  const handleExport = async () => {
    if (!id || !ward) return;
    setIsExporting(true);
    try {
      const response = await api.get(`/admin/wards/export?id=${id}`);
      const data = response.data?.data;
      if (data && data.length > 0) {
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Ward Data");
        xlsx.writeFile(wb, `ward_${ward.wardNumber}_export.xlsx`);
        toast.success("Ward exported successfully.");
      } else {
        toast.error("No data available to export.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export ward data.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteWard(id);
      setLocation("/wards");
    } catch (error) {
      // toast is handled in the hook
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Ward Detail">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (!ward) {
    return (
      <MainLayout title="Ward Detail">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Map className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Ward not found</p>
          <Link to="/wards">
            <Button variant="outline">Back to Wards</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const councillor =
    ward.currentCouncillor || ward.councillors?.find((c: any) => c.isCurrent);
  const grievanceOpen =
    ward.grievanceStats
      ?.filter((g: any) =>
        ["OPEN", "IN_PROGRESS", "ESCALATED"].includes(g.status),
      )
      .reduce((s: number, g: any) => s + g.count, 0) || 0;

  return (
    <MainLayout title="Ward Detail">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/wards">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{ward.name}</h1>
                <Badge variant="outline" className="text-xs">
                  Ward #{ward.wardNumber}
                </Badge>
                <Badge
                  className={`text-[10px] ${ward.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                    }`}
                >
                  {ward.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {ward.zone && `Zone ${ward.zone} • `}
                {ward.areaType}
                {ward.establishedDate &&
                  ` • Since ${format(new Date(ward.establishedDate), "yyyy-MM-dd")}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <PermissionGate module="wards" action="read">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4" /> Export
              </Button>
            </PermissionGate>
            <PermissionGate module="wards" action="update">
              <Link to={`/wards/${ward.id}/edit`}>
                <Button variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" /> Edit Ward
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="wards" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Ward</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to completely delete {ward.name}?
                      This will permanently delete all its dependent
                      Demographics, Areas, and Councillors.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold">
                {ward.totalPopulation.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Population</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Home className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="text-xl font-bold">
                {ward.totalHouseholds.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Households</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <p className="text-xl font-bold">{ward.totalAreas}</p>
              <p className="text-xs text-muted-foreground">Areas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
              <p className="text-xl font-bold">
                {ward._count?.grievances || 0}
              </p>
              <p className="text-xs text-muted-foreground">Public Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardList className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold">{ward._count?.projects || 0}</p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Building2 className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="text-xl font-bold">
                {ward._count?.institutions || 0}
              </p>
              <p className="text-xs text-muted-foreground">Institutions</p>
            </CardContent>
          </Card>
        </div>

        {/* Councillor Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Ward Councillor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {councillor ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg">
                  {councillor.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{councillor.name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5 flex-wrap">
                    {councillor.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {councillor.phone}
                      </span>
                    )}
                    {councillor.partyName && (
                      <Badge variant="outline" className="text-xs">
                        {councillor.partyName}
                      </Badge>
                    )}
                    {councillor.sinceDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Since{" "}
                        {format(new Date(councillor.sinceDate), "yyyy-MM-dd")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No councillor assigned.
              </p>
            )}
            {ward.description && (
              <p className="text-sm text-muted-foreground mt-3 border-t pt-3">
                {ward.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="areas" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="areas" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Areas (
              {ward.areas?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="demographics" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Demographics
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Community (
              {ward._count?.communityGroups || 0})
            </TabsTrigger>
          </TabsList>

          {/* Areas Tab */}
          <TabsContent value="areas" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ward.areas?.map((area: any) => (
                <Card
                  key={area.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{area.name}</h3>
                        {area.pincode && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            PIN: {area.pincode}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={`text-[10px] ${AREA_TYPE_COLORS[area.areaType] || AREA_TYPE_COLORS.OTHER}`}
                      >
                        {area.areaType.replace("_", " ")}
                      </Badge>
                    </div>
                    {area.landmark && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {area.landmark}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <p className="text-lg font-bold">
                          {area.population.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Population
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">
                          {area.households.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Households
                        </p>
                      </div>
                    </div>
                    {area.maleCount > 0 && (
                      <div className="flex gap-2 text-xs">
                        <span className="text-blue-600">
                          M: {area.maleCount.toLocaleString()}
                        </span>
                        <span className="text-pink-600">
                          F: {area.femaleCount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <Progress
                      value={
                        (area.population / (ward.totalPopulation || 1)) * 100
                      }
                      className="h-1.5"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">
                      {(
                        (area.population / (ward.totalPopulation || 1)) *
                        100
                      ).toFixed(1)}
                      % of ward
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Area Summary Table */}
            {ward.areas?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Area Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Population</TableHead>
                        <TableHead className="text-right">Male</TableHead>
                        <TableHead className="text-right">Female</TableHead>
                        <TableHead className="text-right">Households</TableHead>
                        <TableHead className="text-right">% of Ward</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ward.areas.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">
                            {a.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {a.areaType.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {a.population.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {a.maleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-pink-600">
                            {a.femaleCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {a.households.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(
                              (a.population / (ward.totalPopulation || 1)) *
                              100
                            ).toFixed(1)}
                            %
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/50">
                        <TableCell>Total</TableCell>
                        <TableCell />
                        <TableCell className="text-right font-mono">
                          {ward.totalPopulation.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-600">
                          {ward.totalMale.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-pink-600">
                          {ward.totalFemale.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {ward.totalHouseholds.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          100%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Demographics Tab */}
          {/* <TabsContent value="demographics">
            {demographics?.wardLevel ? (
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Gender Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600 font-medium">
                          Male
                        </span>
                        <span className="font-mono text-sm">
                          {demographics.wardLevel.maleCount.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={
                          (demographics.wardLevel.maleCount /
                            (demographics.wardLevel.totalPopulation || 1)) *
                          100
                        }
                        className="h-2 [&>div]:bg-blue-500"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-pink-600 font-medium">
                          Female
                        </span>
                        <span className="font-mono text-sm">
                          {demographics.wardLevel.femaleCount.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={
                          (demographics.wardLevel.femaleCount /
                            (demographics.wardLevel.totalPopulation || 1)) *
                          100
                        }
                        className="h-2 [&>div]:bg-pink-500"
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Age Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {demographics.charts?.ageDistribution?.map((age: any) => (
                      <div
                        key={age.label}
                        className="flex items-center gap-3 py-1.5"
                      >
                        <span className="text-xs text-muted-foreground w-12">
                          {age.label}
                        </span>
                        <Progress
                          value={
                            (age.value /
                              (demographics.wardLevel.totalPopulation || 1)) *
                            100
                          }
                          className="h-2 flex-1"
                        />
                        <span className="font-mono text-xs w-16 text-right">
                          {age.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Social Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {demographics.charts?.categoryDistribution?.map(
                      (cat: any) => (
                        <div
                          key={cat.label}
                          className="flex items-center gap-3 py-1.5"
                        >
                          <span className="text-xs w-16">{cat.label}</span>
                          <Progress
                            value={
                              (cat.value /
                                (demographics.wardLevel.totalPopulation || 1)) *
                              100
                            }
                            className="h-2 flex-1"
                          />
                          <span className="font-mono text-xs w-16 text-right">
                            {cat.value.toLocaleString()}
                          </span>
                        </div>
                      ),
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Economic & Literacy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        BPL Households
                      </span>
                      <span className="font-mono">
                        {demographics.wardLevel.bplHouseholds.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        APL Households
                      </span>
                      <span className="font-mono">
                        {demographics.wardLevel.aplHouseholds.toLocaleString()}
                      </span>
                    </div>
                    {demographics.wardLevel.literacyRate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Literacy Rate
                        </span>
                        <span className="font-mono">
                          {demographics.wardLevel.literacyRate.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Voters
                      </span>
                      <span className="font-mono">
                        {demographics.wardLevel.totalVoters.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                No demographic data available for this ward.
              </Card>
            )}
          </TabsContent> */}
          {/* Inside TabsContent value="demographics" */}
          <TabsContent value="demographics">
            {demographics?.wardLevel ? (
              <div className="space-y-4">
                {/* Row 1: Gender + Age */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Gender Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        {
                          label: "Male",
                          value: demographics.wardLevel.maleCount,
                          color: "bg-blue-500",
                          total: demographics.wardLevel.totalPopulation,
                        },
                        {
                          label: "Female",
                          value: demographics.wardLevel.femaleCount,
                          color: "bg-pink-500",
                          total: demographics.wardLevel.totalPopulation,
                        },
                      ].map((g) => (
                        <div key={g.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{g.label}</span>
                            <span className="font-mono">
                              {g.value.toLocaleString()} (
                              {((g.value / (g.total || 1)) * 100).toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${g.color} rounded-full`}
                              style={{
                                width: `${(g.value / (g.total || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Age Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(demographics.charts?.ageDistribution || []).map(
                        (age: any) => (
                          <div
                            key={age.label}
                            className="flex items-center gap-3"
                          >
                            <span className="text-xs w-12 text-muted-foreground">
                              {age.label}
                            </span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${(age.value / (demographics.wardLevel.totalPopulation || 1)) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs w-16 text-right">
                              {age.value.toLocaleString()}
                            </span>
                          </div>
                        ),
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Religion + Caste */}
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Religion Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(() => {
                        const religionData = [
                          {
                            label: "Hindu 🕉️",
                            value: demographics.wardLevel.hinduCount || 0,
                            color: "bg-orange-500",
                          },
                          {
                            label: "Muslim ☪️",
                            value: demographics.wardLevel.muslimCount || 0,
                            color: "bg-green-600",
                          },
                          {
                            label: "Sikh 🙏",
                            value: demographics.wardLevel.sikhCount || 0,
                            color: "bg-blue-600",
                          },
                          {
                            label: "Christian ✝️",
                            value: demographics.wardLevel.christianCount || 0,
                            color: "bg-red-500",
                          },
                          {
                            label: "Buddhist ☸️",
                            value: demographics.wardLevel.buddhistCount || 0,
                            color: "bg-yellow-600",
                          },
                          {
                            label: "Jain",
                            value: demographics.wardLevel.jainCount || 0,
                            color: "bg-purple-500",
                          },
                          {
                            label: "Other",
                            value: demographics.wardLevel.otherReligionCount || 0,
                            color: "bg-gray-500",
                          },
                        ].filter((r) => r.value > 0);

                        const totalReligion = religionData.reduce((acc, r) => acc + r.value, 0) || 1;

                        return religionData.map((r) => (
                          <div
                            key={r.label}
                            className="flex items-center gap-3"
                          >
                            <span className="text-xs w-24">{r.label}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${r.color} rounded-full`}
                                style={{
                                  width: `${(r.value / totalReligion) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs w-20 text-right">
                              {r.value.toLocaleString()} (
                              {((r.value / totalReligion) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        ));
                      })()}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        Social Category (Caste)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(() => {
                        const casteData = [
                          {
                            label: "General",
                            value: demographics.wardLevel.generalCount || 0,
                            color: "bg-slate-500",
                          },
                          {
                            label: "OBC",
                            value: demographics.wardLevel.obcCount || 0,
                            color: "bg-amber-500",
                          },
                          {
                            label: "SC",
                            value: demographics.wardLevel.scCount || 0,
                            color: "bg-blue-500",
                          },
                          {
                            label: "ST",
                            value: demographics.wardLevel.stCount || 0,
                            color: "bg-emerald-500",
                          },
                          {
                            label: "Minority",
                            value: demographics.wardLevel.minorityCount || 0,
                            color: "bg-purple-500",
                          },
                        ].filter((c) => c.value > 0);

                        const totalCaste = casteData.reduce((acc, c) => acc + c.value, 0) || 1;

                        return casteData.map((c) => (
                          <div
                            key={c.label}
                            className="flex items-center gap-3"
                          >
                            <span className="text-xs w-16">{c.label}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${c.color} rounded-full`}
                                style={{
                                  width: `${(c.value / totalCaste) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs w-20 text-right">
                              {c.value.toLocaleString()} (
                              {((c.value / totalCaste) * 100).toFixed(1)}%)
                            </span>
                          </div>
                        ));
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* Row 3: Economic + Literacy + Voters */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Economic</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const bpl = demographics.wardLevel.bplHouseholds || 0;
                        const apl = demographics.wardLevel.aplHouseholds || 0;
                        const totalHouseholds = bpl + apl || 1;

                        return (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                BPL Households
                              </span>
                              <span className="font-mono font-medium">
                                {bpl.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                APL Households
                              </span>
                              <span className="font-mono font-medium">
                                {apl.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                              <div
                                className="h-full bg-red-400"
                                style={{
                                  width: `${(bpl / totalHouseholds) * 100}%`,
                                }}
                              />
                              <div className="h-full bg-green-400 flex-1" />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>
                                BPL {((bpl / totalHouseholds) * 100).toFixed(1)}%
                              </span>
                              <span>
                                APL {((apl / totalHouseholds) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Literacy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        {
                          label: "Overall",
                          value: demographics.wardLevel.literacyRate,
                        },
                        {
                          label: "Male",
                          value: demographics.wardLevel.maleLiteracyRate,
                        },
                        {
                          label: "Female",
                          value: demographics.wardLevel.femaleLiteracyRate,
                        },
                      ].map((l) => (
                        <div key={l.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              {l.label}
                            </span>
                            <span className="font-mono">
                              {l.value ? `${l.value.toFixed(1)}%` : "N/A"}
                            </span>
                          </div>
                          {l.value && (
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${l.value}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Voters & Vital Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Voters Summary */}
                      <div className="flex items-center justify-around text-center pb-2 border-b">
                        <div>
                          <p className="text-xl font-bold">{demographics.wardLevel.totalVoters.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">Total Voters</p>
                        </div>
                        <div className="w-px h-8 bg-muted" />
                        <div>
                          <p className="text-xl font-bold text-blue-600">{demographics.wardLevel.newVotersCount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">New Voters</p>
                        </div>
                      </div>

                      {/* Vital Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 text-center border border-green-100 dark:border-green-800/30">
                          <p className="text-lg font-bold text-green-600">
                            {demographics.wardLevel.totalBirths.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                            Births
                          </p>
                        </div>
                        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-center border border-red-100 dark:border-red-800/30">
                          <p className="text-lg font-bold text-red-600">
                            {demographics.wardLevel.totalDeaths.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                            Deaths
                          </p>
                        </div>
                      </div>

                      {/* Gender Split (Voters) */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-medium">
                          <span>Voter Gender Split</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${(demographics.wardLevel.maleVoters / (demographics.wardLevel.totalVoters || 1)) * 100}%`,
                            }}
                          />
                          <div
                            className="h-full bg-pink-500"
                            style={{
                              width: `${(demographics.wardLevel.femaleVoters / (demographics.wardLevel.totalVoters || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-blue-600">M: {demographics.wardLevel.maleVoters.toLocaleString()}</span>
                          <span className="text-pink-600">F: {demographics.wardLevel.femaleVoters.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {demographics.wardLevel.source && (
                        <p className="text-[9px] text-muted-foreground text-center pt-2">
                          Source: {demographics.wardLevel.source}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                No demographic data available. Edit this ward to add
                demographics.
              </Card>
            )}
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community">
            {ward.communityGroupStats?.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Groups</TableHead>
                        <TableHead className="text-right">
                          Total Members
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ward.communityGroupStats.map((cg: any) => (
                        <TableRow key={cg.type}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {cg.type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {cg.count}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {cg.totalMembers.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                No community groups in this ward.
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
