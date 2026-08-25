import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn, getImageUrl } from "@/lib/utils";
import {
  useConstituency,
  useToggleConstituency,
  useDeleteConstituency,
  useRepresentative,
  useUpsertRepresentative,
  useUploadRepresentativePhoto,
  useDeleteRepresentativePhoto,
  useConstituencyWards,
  useLinkUnlinkWard,
  useConstituencyTownVillages,
  useLinkUnlinkTownVillage,
  useConstituencyBooths,
  useAllWardsOptions,
  useAllTownVillagesOptions,
  useDistricts,
} from "@/hooks/useConstituencies";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  User,
  MapPin,
  Map,
  Vote,
  Phone,
  Mail,
  Home,
  Plus,
  Link as LinkIcon,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

const emptyRepForm = {
  name: "",
  title: "",
  // photoUrl: "",
  partyName: "",
  termStartDate: "",
  termEndDate: "",
  officePhone: "",
  officeEmail: "",
  officeAddress: "",
};

export default function ConstituencyDetailPage({ id }: { id: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useConstituency(id);
  const c = res?.data;
  const toggleMut = useToggleConstituency();
  const deleteMut = useDeleteConstituency();

  // Representative
  // Representative
  const { data: repRes, isLoading: repLoading } = useRepresentative(id);

  const representative = repRes?.data;

  const upsertRep = useUpsertRepresentative(id);

  const uploadRepresentativePhoto = useUploadRepresentativePhoto(id);

  const deleteRepresentativePhoto = useDeleteRepresentativePhoto(id);

  const [repEditing, setRepEditing] = useState(false);

  const [repForm, setRepForm] = useState({ ...emptyRepForm });

  const [repPhoto, setRepPhoto] = useState<File | null>(null);

  const [repPhotoPreview, setRepPhotoPreview] = useState("");

  const [repPhotoError, setRepPhotoError] = useState("");

  // Wards
  const { data: wardsRes, isLoading: wardsLoading } = useConstituencyWards(id);
  const wards = wardsRes?.data || [];
  const wardLink = useLinkUnlinkWard(id);
  const { data: allWardsRes } = useAllWardsOptions();
  const allWards = allWardsRes || [];
  const availableWards = allWards.filter(
    (w: any) => !wards.some((mapped: any) => mapped.id === w.id),
  );
  const [selectedWardId, setSelectedWardId] = useState("");

  // Villages
  const { data: townVillagesRes, isLoading: townVillagesLoading } =
    useConstituencyTownVillages(id);
  const townVillages = townVillagesRes?.data || [];
  const townVillageLink = useLinkUnlinkTownVillage(id);
  const { data: allTownVillagesRes } = useAllTownVillagesOptions();
  const allTownVillages = allTownVillagesRes || [];
  const availableTownVillages = allTownVillages.filter(
    (v: any) => !townVillages.some((mapped: any) => mapped.id === v.id),
  );
  const [selectedTownVillageId, setSelectedTownVillageId] = useState("");

  // Booths
  const { data: boothsRes, isLoading: boothsLoading } =
    useConstituencyBooths(id);
  const booths = boothsRes?.data?.items || boothsRes?.data || [];

  const { data: districtsRes } = useDistricts();
  const districts = Array.isArray(districtsRes?.data)
    ? districtsRes.data
    : districtsRes?.data?.items || [];

  useEffect(() => {
    return () => {
      if (repPhotoPreview) {
        URL.revokeObjectURL(repPhotoPreview);
      }
    };
  }, [repPhotoPreview]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-11 w-full max-w-3xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!c) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <MapPin className="h-12 w-12 text-muted-foreground opacity-30" />
        <p className="text-sm text-muted-foreground font-medium">
          Constituency not found.
        </p>
        <Link to="/geography/constituencies">
          <Button variant="outline" size="sm">
            Back to list
          </Button>
        </Link>
      </div>
    );
  }

  const openRepEdit = () => {
    setRepForm({
      name: representative?.name || "",
      title: representative?.title || "",
      partyName: representative?.partyName || "",

      termStartDate: representative?.termStartDate
        ? representative.termStartDate.split("T")[0]
        : "",

      termEndDate: representative?.termEndDate
        ? representative.termEndDate.split("T")[0]
        : "",

      officePhone: representative?.officePhone || "",

      officeEmail: representative?.officeEmail || "",

      officeAddress: representative?.officeAddress || "",
    });

    setRepPhoto(null);
    setRepPhotoPreview("");
    setRepPhotoError("");

    setRepEditing(true);
  };

  const handleRepresentativePhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    setRepPhotoError("");

    if (!file) {
      setRepPhoto(null);
      setRepPhotoPreview("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setRepPhotoError("Only JPG, PNG, and WEBP images are allowed.");

      event.target.value = "";
      setRepPhoto(null);
      setRepPhotoPreview("");

      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setRepPhotoError("Representative photo must be 5MB or smaller.");

      event.target.value = "";
      setRepPhoto(null);
      setRepPhotoPreview("");

      return;
    }

    setRepPhoto(file);

    const previewUrl = URL.createObjectURL(file);

    setRepPhotoPreview(previewUrl);
  };

  const handleSaveRepresentative = async () => {
    const name = repForm.name.trim();
    const title = repForm.title.trim();

    if (!name) {
      toast({
        title: "Validation Error",
        description: "Representative name is required.",
        variant: "destructive",
      });

      return;
    }

    if (!title) {
      toast({
        title: "Validation Error",
        description: "Representative title is required.",
        variant: "destructive",
      });

      return;
    }

    if (repPhotoError) {
      toast({
        title: "Invalid Photo",
        description: repPhotoError,
        variant: "destructive",
      });

      return;
    }

    try {
      // --------------------------------------------------
      // 1. Save profile information
      // --------------------------------------------------

      await upsertRep.mutateAsync({
        name,
        title,

        partyName: repForm.partyName.trim() || undefined,

        termStartDate: repForm.termStartDate || undefined,

        termEndDate: repForm.termEndDate || undefined,

        officePhone: repForm.officePhone.trim() || undefined,

        officeEmail: repForm.officeEmail.trim() || undefined,

        officeAddress: repForm.officeAddress.trim() || undefined,
      });

      // --------------------------------------------------
      // 2. Upload photo only when user selected one
      // --------------------------------------------------

      if (repPhoto) {
        const formData = new FormData();

        formData.append("file", repPhoto);

        await uploadRepresentativePhoto.mutateAsync(formData);
      }

      // --------------------------------------------------
      // 3. Reset
      // --------------------------------------------------

      setRepPhoto(null);
      setRepPhotoPreview("");
      setRepPhotoError("");
      setRepEditing(false);
    } catch (error) {
      // Mutation already displays the API error.
      // Keep the form open so user can correct/retry.
      console.error("Failed to save representative:", error);
    }
  };
  return (
    <MainLayout title={`${c.name} Details`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 border-border/60 hover:bg-muted"
              onClick={() => navigate("/geography/constituencies")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-foreground">
                  {c.name}
                </h1>
                <Badge
                  variant={c.isActive ? "default" : "secondary"}
                  className={cn(
                    c.isActive &&
                      "bg-emerald-100/50 text-emerald-700 border-emerald-200/30 dark:bg-emerald-950/20 dark:text-emerald-400",
                  )}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge
                  variant="outline"
                  className="uppercase text-[10px] font-bold"
                >
                  {c.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                District:{" "}
                <span className="font-bold text-foreground">
                  {c.district?.name || "N/A"}
                </span>
                {c.code && (
                  <>
                    {" "}
                    • Code:{" "}
                    <span className="font-mono text-foreground">{c.code}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => navigate(`/geography/constituencies?edit=${c.id}`)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 text-xs",
                c.isActive
                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50",
              )}
              disabled={toggleMut.isPending}
              onClick={() => toggleMut.mutate(c.id)}
            >
              {c.isActive ? (
                <>
                  <ToggleRight className="h-3.5 w-3.5 mr-1.5" /> Deactivate
                </>
              ) : (
                <>
                  <ToggleLeft className="h-3.5 w-3.5 mr-1.5" /> Activate
                </>
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-9 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
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
                    onClick={async () => {
                      await deleteMut.mutateAsync(c.id);
                      navigate("/geography/constituencies");
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl bg-muted/40 p-1 rounded-xl h-11">
            <TabsTrigger
              value="overview"
              className="rounded-lg text-xs font-semibold py-1.5"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="representative"
              className="rounded-lg text-xs font-semibold py-1.5"
            >
              Representative
            </TabsTrigger>
            <TabsTrigger
              value="wards"
              className="rounded-lg text-xs font-semibold py-1.5"
            >
              Wards
            </TabsTrigger>
            <TabsTrigger
              value="town-villages"
              className="rounded-lg text-xs font-semibold py-1.5"
            >
              Towns/Villages
            </TabsTrigger>
            <TabsTrigger
              value="booths"
              className="rounded-lg text-xs font-semibold py-1.5"
            >
              Booths
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-foreground text-sm border-b pb-2">
                  Administrative Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground font-semibold text-xs block">
                      Constituency Name
                    </span>
                    <span className="text-foreground font-bold mt-1 block">
                      {c.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold text-xs block">
                      Constituency Code
                    </span>
                    <span className="text-foreground font-mono font-bold mt-1 block">
                      {c.code || "No code set"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold text-xs block">
                      Electoral Type
                    </span>
                    <span className="text-foreground font-bold mt-1 block uppercase">
                      {c.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold text-xs block">
                      District
                    </span>
                    <span className="text-foreground font-bold mt-1 block">
                      {c.district?.name || "N/A"}
                    </span>
                  </div>
                </div>

                {c.description && (
                  <div className="pt-2">
                    <span className="text-muted-foreground font-semibold text-xs block mb-1">
                      Description
                    </span>
                    <p className="text-foreground text-xs leading-relaxed bg-muted/20 p-3 rounded-xl border">
                      {c.description}
                    </p>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4">
                  {[
                    {
                      label: "Wards",
                      value: wards.length,
                      Icon: Map,
                      color: "text-primary",
                    },
                    {
                      label: "Towns/Villages",
                      value: townVillages.length,
                      Icon: MapPin,
                      color: "text-indigo-500",
                    },
                    {
                      label: "Booths",
                      value: booths.length,
                      Icon: Vote,
                      color: "text-emerald-500",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="p-4 rounded-xl border bg-muted/5 flex items-center gap-3"
                    >
                      <s.Icon className={cn("h-8 w-8", s.color)} />
                      <div>
                        <span className="text-xs text-muted-foreground font-semibold">
                          {s.label}
                        </span>
                        <h5 className="text-xl font-extrabold text-foreground">
                          {s.value}
                        </h5>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Representative */}
          <TabsContent value="representative" className="mt-4 space-y-4">
            {repEditing ? (
              <Card className="border border-border/50 bg-card rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-foreground text-sm border-b pb-2">
                  {representative
                    ? "Edit Representative Profile"
                    : "Add Representative Profile"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <Label>
                      Representative Name{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={repForm.name}
                      onChange={(e) =>
                        setRepForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="E.g., Mayank Goyal"
                      className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Title (e.g., MLA / MP){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={repForm.title}
                      onChange={(e) =>
                        setRepForm((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="E.g., Member of Legislative Assembly"
                      className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Representative Photo</Label>

                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="shrink-0">
                        {repPhotoPreview || representative?.photoUrl ? (
                          <img
                            src={
                              repPhotoPreview ||
                              getImageUrl(representative?.photoUrl)
                            }
                            alt={representative?.name || "Representative"}
                            className="h-20 w-20 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border">
                            <User className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Upload */}
                      <div className="flex-1 space-y-2">
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="h-10 bg-muted/20 border-border/60"
                          onChange={handleRepresentativePhotoChange}
                        />

                        {repPhotoError ? (
                          <p className="text-xs text-destructive">
                            {repPhotoError}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            JPG, PNG or WEBP. Maximum 5MB.
                          </p>
                        )}

                        {representative?.photoUrl &&
                          !repPhoto &&
                          !repPhotoPreview && (
                            <p className="text-[11px] text-muted-foreground">
                              Select a new image to replace the current photo.
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Political Party</Label>
                    <Input
                      value={repForm.partyName}
                      onChange={(e) =>
                        setRepForm((p) => ({ ...p, partyName: e.target.value }))
                      }
                      placeholder="E.g., Indian National Congress"
                      className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Term Start Date</Label>
                    <Input
                      type="date"
                      value={repForm.termStartDate}
                      onChange={(e) =>
                        setRepForm((p) => ({
                          ...p,
                          termStartDate: e.target.value,
                        }))
                      }
                      className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Term End Date</Label>
                    <Input
                      type="date"
                      value={repForm.termEndDate}
                      onChange={(e) =>
                        setRepForm((p) => ({
                          ...p,
                          termEndDate: e.target.value,
                        }))
                      }
                      className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Office Phone</Label>
                    <Input
                      value={repForm.officePhone}
                      onChange={(e) =>
                        setRepForm((p) => ({
                          ...p,
                          officePhone: e.target.value,
                        }))
                      }
                      placeholder="+91 XXXXX XXXXX"
                      className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Office Email</Label>
                    <Input
                      type="email"
                      value={repForm.officeEmail}
                      onChange={(e) =>
                        setRepForm((p) => ({
                          ...p,
                          officeEmail: e.target.value,
                        }))
                      }
                      placeholder="office@representative.org"
                      className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Office Address</Label>
                    <Input
                      value={repForm.officeAddress}
                      onChange={(e) =>
                        setRepForm((p) => ({
                          ...p,
                          officeAddress: e.target.value,
                        }))
                      }
                      placeholder="Full office address"
                      className="h-10 bg-muted/20 border-border/60 focus-visible:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end border-t pt-4">
                  <Button
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={() => setRepEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-primary hover:bg-primary/95 text-white h-9 text-xs"
                    onClick={handleSaveRepresentative}
                    disabled={
                      upsertRep.isPending ||
                      uploadRepresentativePhoto.isPending ||
                      deleteRepresentativePhoto.isPending
                    }
                  >
                    Save Profile
                  </Button>
                </div>
              </Card>
            ) : representative ? (
              <Card className="border border-border/50 bg-card rounded-2xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center shrink-0">
                    {representative.photoUrl ? (
                      <img
                        src={getImageUrl(representative.photoUrl)}
                        alt={representative.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 dark:border-indigo-950/50 shadow-sm"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 border border-indigo-100 dark:border-indigo-950/50">
                        <User className="h-10 w-10" />
                      </div>
                    )}
                    <Badge className="mt-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-950/50">
                      {representative.partyName || "Independent"}
                    </Badge>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div>
                        <h2 className="text-xl font-extrabold text-foreground">
                          {representative.name}
                        </h2>
                        <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                          {representative.title}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={openRepEdit}
                      >
                        <Edit className="h-3 w-3 mr-1" /> Edit Profile
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="text-muted-foreground font-medium">
                          Term:
                        </span>
                        <span className="font-bold text-foreground">
                          {representative.termStartDate
                            ? new Date(
                                representative.termStartDate,
                              ).toLocaleDateString()
                            : "N/A"}{" "}
                          -{" "}
                          {representative.termEndDate
                            ? new Date(
                                representative.termEndDate,
                              ).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground font-medium">
                          Phone:
                        </span>
                        <span className="font-bold text-foreground">
                          {representative.officePhone || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-muted-foreground font-medium">
                          Email:
                        </span>
                        <span className="font-bold text-foreground truncate">
                          {representative.officeEmail || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-muted-foreground font-medium">
                          Address:
                        </span>
                        <span className="font-bold text-foreground truncate">
                          {representative.officeAddress || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="border border-dashed border-border/60 bg-muted/5 rounded-2xl p-10 text-center space-y-4">
                <User className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-bold text-foreground text-sm">
                    No Representative Profile Configured
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add profile information for the political representative
                    governing this constituency.
                  </p>
                </div>
                <Button
                  className="bg-primary hover:bg-primary/95 text-white h-9 text-xs"
                  onClick={openRepEdit}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Representative Profile
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Wards */}
          <TabsContent value="wards" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1.5 flex-1 max-w-sm w-full">
                <Label className="text-xs font-bold text-muted-foreground">
                  Select Ward to Link
                </Label>
                <select
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus-visible:ring-primary focus-visible:outline-none"
                  value={selectedWardId}
                  onChange={(e) => setSelectedWardId(e.target.value)}
                >
                  <option value="">Choose unlinked ward...</option>
                  {availableWards.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      Ward {w.wardNumber}: {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                className="h-9 text-xs bg-primary hover:bg-primary/95 text-white gap-1.5"
                disabled={!selectedWardId || wardLink.link.isPending}
                onClick={() =>
                  wardLink.link
                    .mutateAsync(selectedWardId)
                    .then(() => setSelectedWardId(""))
                }
              >
                <LinkIcon className="h-3.5 w-3.5" /> Link Ward
              </Button>
            </div>

            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
              {wardsLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : wards.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground">
                  No wards mapped to this constituency.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead>Ward Number</TableHead>
                      <TableHead>Ward Name</TableHead>
                      <TableHead>Municipal Area</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wards.map((w: any) => (
                      <TableRow key={w.id} className="hover:bg-muted/10">
                        <TableCell className="font-bold">
                          Ward {w.wardNumber}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {w.name}
                        </TableCell>
                        <TableCell className="text-xs">
                          {w.townVillage?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              w.status === "ACTIVE" ? "default" : "secondary"
                            }
                          >
                            {w.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-600"
                            disabled={wardLink.unlink.isPending}
                            onClick={() => wardLink.unlink.mutate(w.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Towns / Villages */}
          <TabsContent value="town-villages" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1.5 flex-1 max-w-sm w-full">
                <Label className="text-xs font-bold text-muted-foreground">
                  Select Town/Village to Link
                </Label>
                <select
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus-visible:ring-primary focus-visible:outline-none"
                  value={selectedTownVillageId}
                  onChange={(e) => setSelectedTownVillageId(e.target.value)}
                >
                  <option value="">Choose unlinked town/village...</option>
                  {availableTownVillages.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.type || "Town/Village"})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                className="h-9 text-xs bg-primary hover:bg-primary/95 text-white gap-1.5"
                disabled={
                  !selectedTownVillageId || townVillageLink.link.isPending
                }
                onClick={() =>
                  townVillageLink.link
                    .mutateAsync(selectedTownVillageId)
                    .then(() => setSelectedTownVillageId(""))
                }
              >
                <LinkIcon className="h-3.5 w-3.5" /> Link Town/Village
              </Button>
            </div>

            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
              {townVillagesLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : townVillages.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground">
                  No towns/villages mapped to this constituency.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/20">
                      <TableHead>Town/Village Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Block</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {townVillages.map((v: any) => (
                      <TableRow key={v.id} className="hover:bg-muted/10">
                        <TableCell className="font-semibold">
                          {v.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {v.code || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {v.type || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {v.block?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={v.isActive ? "default" : "secondary"}>
                            {v.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-600"
                            disabled={townVillageLink.unlink.isPending}
                            onClick={() => townVillageLink.unlink.mutate(v.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Booths */}
          <TabsContent value="booths" className="mt-4">
            <Card className="border border-border/50 bg-card rounded-2xl shadow-sm overflow-hidden">
              {boothsLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : booths.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground">
                  No booths assigned to this constituency yet.
                </div>
              ) : (
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
                    {booths.map((b: any) => (
                      <TableRow key={b.id} className="hover:bg-muted/10">
                        <TableCell className="font-bold">
                          Booth {b.boothNumber}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {b.boothName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {b.code || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={b.isActive ? "default" : "secondary"}>
                            {b.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
