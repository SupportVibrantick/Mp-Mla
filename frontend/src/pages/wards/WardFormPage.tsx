import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useParams, useLocation, Link } from "wouter";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useWard,
  useCreateWard,
  useUpdateWard,
  useCreateArea,
  useUpdateArea,
  useDeleteArea,
  useCreateCouncillor,
  useUpdateCouncillor,
  useWardDemographics,
} from "@/hooks/useWards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  ArrowLeft,
  Save,
  Map,
  Plus,
  Trash2,
  Edit,
  MapPin,
  Loader2,
  User,
  BarChart3,
  Users,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faOm,
  faStarAndCrescent,
  faKhanda,
  faCross,
  faDharmachakra,
  faHandsPraying,
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/hooks/use-toast";

// ─── Schemas ────────────────────────────────────────────

const wardSchema = z.object({
  wardNumber: z.coerce.number().int().positive("Ward number required"),
  name: z.string().min(1, "Ward name required"),
  zone: z.string().optional(),
  areaType: z.string().default("Urban"),
  status: z
    .enum(["ACTIVE", "INACTIVE", "PROPOSED", "MERGED", "DELIMITATION_PENDING"])
    .default("ACTIVE"),
  pincode: z.string().optional(),
  description: z.string().optional(),
  establishedDate: z.string().optional(),
  constituencyId: z.string().optional().nullable(),
  townVillageId: z.string().optional().nullable(),
});

type WardFormValues = z.infer<typeof wardSchema>;

const AREA_TYPES = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "INDUSTRIAL",
  "MIXED_USE",
  "AGRICULTURAL",
  "INSTITUTIONAL",
  "SLUM",
  "CANTONMENT",
  "OTHER",
];

// ─── Area type ──────────────────────────────────────────

interface AreaFormData {
  id?: string;
  name: string;
  areaType: string;
  population: number;
  households: number;
  maleCount: number;
  femaleCount: number;
  pincode: string;
  landmark: string;
  description: string;
  isNew?: boolean;
}

const emptyArea: AreaFormData = {
  name: "",
  areaType: "RESIDENTIAL",
  population: 0,
  households: 0,
  maleCount: 0,
  femaleCount: 0,
  pincode: "",
  landmark: "",
  description: "",
};

// ─── Demographics type ──────────────────────────────────
// This holds the detailed demographic survey data for the ward.
// It maps 1:1 to the Demographics model fields in the backend.

interface DemoFormData {
  // Age
  age0to6: number;
  age7to18: number;
  age19to35: number;
  age36to60: number;
  age60plus: number;
  // Caste
  generalCount: number;
  obcCount: number;
  scCount: number;
  stCount: number;
  minorityCount: number;
  otherCount: number;
  // Religion
  hinduCount: number;
  muslimCount: number;
  sikhCount: number;
  christianCount: number;
  buddhistCount: number;
  jainCount: number;
  otherReligionCount: number;
  // Economic
  bplHouseholds: number;
  aplHouseholds: number;
  // Literacy
  literacyRate: number;
  maleLiteracyRate: number;
  femaleLiteracyRate: number;
  // Voters
  totalVoters: number;
  maleVoters: number;
  femaleVoters: number;
  newVotersCount: number;
  // Vital Stats
  totalBirths: number;
  totalDeaths: number;
  // Meta
  source: string;
  surveyDate: string;
}
const emptyDemoForm: DemoFormData = {
  age0to6: 0,
  age7to18: 0,
  age19to35: 0,
  age36to60: 0,
  age60plus: 0,
  generalCount: 0,
  obcCount: 0,
  scCount: 0,
  stCount: 0,
  minorityCount: 0,
  otherCount: 0,
  hinduCount: 0,
  muslimCount: 0,
  sikhCount: 0,
  christianCount: 0,
  buddhistCount: 0,
  jainCount: 0,
  otherReligionCount: 0,
  bplHouseholds: 0,
  aplHouseholds: 0,
  literacyRate: 0,
  maleLiteracyRate: 0,
  femaleLiteracyRate: 0,
  totalVoters: 0,
  maleVoters: 0,
  femaleVoters: 0,
  newVotersCount: 0,
  totalBirths: 0,
  totalDeaths: 0,
  source: "",
  surveyDate: "",
};

// ─── Component ──────────────────────────────────────────

export default function WardFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;
  const [constituencies, setConstituencies] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [townVillages, setTownVillages] = useState<any[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");

  useEffect(() => {
    const fetchConstituencies = async () => {
      try {
        const res = await api.get(
          "/admin/constituency/constituencies/list?limit=100",
        );
        const list = res.data?.data;
        setConstituencies(Array.isArray(list) ? list : list?.items || []);
      } catch (err) {
        console.error(err);
      }
    };
    const fetchDistricts = async () => {
      try {
        const res = await api.get("/admin/constituency/districts?limit=100");
        const list = res.data?.data;
        setDistricts(Array.isArray(list) ? list : list?.items || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchConstituencies();
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (!selectedDistrictId) {
      setTownVillages([]);
      return;
    }
    const fetchTownVillages = async () => {
      try {
        const res = await api.get(
          `/admin/constituency/districts/${selectedDistrictId}/town-villages`,
        );
        setTownVillages(res.data?.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTownVillages();
  }, [selectedDistrictId]);

  // ─── API Hooks ────────────────────────────────────────

  const { data: wardRes, isLoading: wardLoading } = useWard(id);
  const { data: demoRes } = useWardDemographics(id);
  const createWardMut = useCreateWard();
  const updateWardMut = useUpdateWard();
  const createAreaMut = useCreateArea();
  const updateAreaMut = useUpdateArea();
  const deleteAreaMut = useDeleteArea();
  const createCouncillorMut = useCreateCouncillor();
  const updateCouncillorMut = useUpdateCouncillor();

  const ward = wardRes?.data;

  // ─── Ward Form (react-hook-form) ──────────────────────

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
  } = useForm<WardFormValues>({
    resolver: zodResolver(wardSchema),
    defaultValues: {
      wardNumber: 0,
      name: "",
      zone: "",
      areaType: "Urban",
      status: "ACTIVE",
      description: "",
      constituencyId: "",
      townVillageId: "",
    },
  });

  // ─── Councillor State ─────────────────────────────────

  const [councillorForm, setCouncillorForm] = useState({
    name: "",
    phone: "",
    email: "",
    partyName: "",
    designation: "Ward Councillor",
    sinceDate: "",
  });
  const [councillorId, setCouncillorId] = useState<string | null>(null);

  // ─── Areas State ──────────────────────────────────────

  const [localAreas, setLocalAreas] = useState<AreaFormData[]>([]);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editingAreaIdx, setEditingAreaIdx] = useState<number | null>(null);
  const [areaForm, setAreaForm] = useState<AreaFormData>({ ...emptyArea });
  const [deleteAreaDialog, setDeleteAreaDialog] = useState<{
    open: boolean;
    idx: number | null;
  }>({ open: false, idx: null });

  // ─── Demographics State ───────────────────────────────
  // This is the missing piece. demoForm holds ward-level
  // demographics that gets sent as `demographics` in the payload.

  const [demoForm, setDemoForm] = useState<DemoFormData>({ ...emptyDemoForm });

  // ─── Populate on Edit ─────────────────────────────────

  useEffect(() => {
    if (!ward || !isEdit) return;

    // Ward fields
    reset({
      wardNumber: ward.wardNumber,
      name: ward.name,
      zone: ward.zone || "",
      areaType: ward.areaType || "Urban",
      status: ward.status,
      pincode: ward.pincode || "",
      description: ward.description || "",
      establishedDate: ward.establishedDate
        ? ward.establishedDate.split("T")[0]
        : "",
      constituencyId: ward.constituencyId || "",
      townVillageId: ward.townVillageId || "",
    });

    if (ward.townVillageId) {
      api
        .get(`/admin/constituency/town-villages/${ward.townVillageId}`)
        .then((res) => {
          const townVillage = res.data?.data;
          if (townVillage?.districtId)
            setSelectedDistrictId(townVillage.districtId);
        });
    }

    // Areas
    setLocalAreas(
      (ward.areas || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        areaType: a.areaType,
        population: a.population,
        households: a.households,
        maleCount: a.maleCount,
        femaleCount: a.femaleCount,
        pincode: a.pincode || "",
        landmark: a.landmark || "",
        description: a.description || "",
      })),
    );

    // Councillor
    const current = ward.councillors?.find((c: any) => c.isCurrent);
    if (current) {
      setCouncillorId(current.id);
      setCouncillorForm({
        name: current.name || "",
        phone: current.phone || "",
        email: current.email || "",
        partyName: current.partyName || "",
        designation: current.designation || "Ward Councillor",
        sinceDate: current.sinceDate ? current.sinceDate.split("T")[0] : "",
      });
    }
  }, [ward, isEdit, reset]);

  // Populate demographics from API when editing
  useEffect(() => {
    if (!demoRes?.data?.wardLevel || !isEdit) return;
    const d = demoRes.data.wardLevel;

    setDemoForm({
      age0to6: d.age0to6 || 0,
      age7to18: d.age7to18 || 0,
      age19to35: d.age19to35 || 0,
      age36to60: d.age36to60 || 0,
      age60plus: d.age60plus || 0,
      generalCount: d.generalCount || 0,
      obcCount: d.obcCount || 0,
      scCount: d.scCount || 0,
      stCount: d.stCount || 0,
      minorityCount: d.minorityCount || 0,
      otherCount: d.otherCount || 0,
      bplHouseholds: d.bplHouseholds || 0,
      aplHouseholds: d.aplHouseholds || 0,
      literacyRate: d.literacyRate || 0,
      maleLiteracyRate: d.maleLiteracyRate || 0,
      femaleLiteracyRate: d.femaleLiteracyRate || 0,
      totalVoters: d.totalVoters || 0,
      maleVoters: d.maleVoters || 0,
      femaleVoters: d.femaleVoters || 0,
      // Vital Stats & New Voters
      totalBirths: d.totalBirths || 0,
      totalDeaths: d.totalDeaths || 0,
      newVotersCount: d.newVotersCount || 0,
      // Religion
      hinduCount: d.hinduCount || 0,
      muslimCount: d.muslimCount || 0,
      sikhCount: d.sikhCount || 0,
      christianCount: d.christianCount || 0,
      buddhistCount: d.buddhistCount || 0,
      jainCount: d.jainCount || 0,
      otherReligionCount: d.otherReligionCount || 0,
      // Source
      source: d.source || "",
      surveyDate: d.surveyDate ? d.surveyDate.split("T")[0] : "",
    });
  }, [demoRes, isEdit]);

  // ─── Area Dialog Handlers ─────────────────────────────

  const openAddArea = () => {
    setEditingAreaIdx(null);
    setAreaForm({ ...emptyArea, isNew: true });
    setAreaDialogOpen(true);
  };

  const openEditArea = (idx: number) => {
    setEditingAreaIdx(idx);
    setAreaForm({ ...localAreas[idx] });
    setAreaDialogOpen(true);
  };

  const saveAreaLocal = () => {
    if (!areaForm.name.trim()) {
      toast({ title: "Area name is required", variant: "destructive" });
      return;
    }
    if (editingAreaIdx !== null) {
      setLocalAreas((prev) =>
        prev.map((a, i) => (i === editingAreaIdx ? { ...areaForm } : a)),
      );
    } else {
      setLocalAreas((prev) => [...prev, { ...areaForm, isNew: true }]);
    }
    setAreaDialogOpen(false);
  };

  const confirmDeleteArea = async () => {
    if (deleteAreaDialog.idx === null) return;
    const area = localAreas[deleteAreaDialog.idx];
    if (area.id && isEdit && id) {
      await deleteAreaMut.mutateAsync({ wardId: id, areaId: area.id });
    }
    setLocalAreas((prev) => prev.filter((_, i) => i !== deleteAreaDialog.idx));
    setDeleteAreaDialog({ open: false, idx: null });
  };

  // ─── Build demographics payload ───────────────────────
  // Only include if user actually filled something in.

  function buildDemoPayload(): Record<string, any> | undefined {
    const hasData = Object.entries(demoForm).some(([key, val]) => {
      if (key === "source" || key === "surveyDate") return !!val;
      return typeof val === "number" && val > 0;
    });

    if (!hasData) return undefined; // backend will auto-estimate

    return {
      ...demoForm,
      surveyDate: demoForm.surveyDate
        ? new Date(demoForm.surveyDate).toISOString()
        : undefined,
      source: demoForm.source || undefined,
    };
  }

  // ─── Submit ───────────────────────────────────────────

  const onSubmit = async (formData: WardFormValues) => {
    try {
      const wardPayload: any = {
        ...formData,
        establishedDate: formData.establishedDate
          ? new Date(formData.establishedDate).toISOString()
          : undefined,
      };

      const demoPayload = buildDemoPayload();

      if (isEdit && id) {
        // 1. Update ward
        await updateWardMut.mutateAsync({ id, data: wardPayload });

        // 2. Sync areas
        for (const area of localAreas) {
          const areaPayload = {
            name: area.name,
            areaType: area.areaType,
            population: area.population,
            households: area.households,
            maleCount: area.maleCount,
            femaleCount: area.femaleCount,
            pincode: area.pincode || undefined,
            landmark: area.landmark || undefined,
            description: area.description || undefined,
          };
          if (area.id && !area.isNew) {
            await updateAreaMut.mutateAsync({
              wardId: id,
              areaId: area.id,
              data: areaPayload,
            });
          } else {
            await createAreaMut.mutateAsync({ wardId: id, data: areaPayload });
          }
        }

        // 3. Sync councillor
        if (councillorForm.name.trim()) {
          const cPayload = {
            ...councillorForm,
            sinceDate: councillorForm.sinceDate
              ? new Date(councillorForm.sinceDate).toISOString()
              : undefined,
          };
          if (councillorId) {
            await updateCouncillorMut.mutateAsync({
              wardId: id,
              councillorId,
              data: cPayload,
            });
          } else {
            await createCouncillorMut.mutateAsync({
              wardId: id,
              data: cPayload,
            });
          }
        }

        // 4. Update demographics via ward demographics endpoint
        if (demoPayload) {
          // Uses PUT /api/admin/wards/:id/demographics
          const api = (await import("@/lib/api")).default;
          await api.put(`/admin/wards/${id}/demographics`, demoPayload);
        }

        navigate(`/wards/${id}`);
      } else {
        // CREATE: send everything inline
        wardPayload.areas = localAreas.map((a) => ({
          name: a.name,
          areaType: a.areaType,
          population: a.population,
          households: a.households,
          maleCount: a.maleCount,
          femaleCount: a.femaleCount,
          pincode: a.pincode || undefined,
          landmark: a.landmark || undefined,
        }));

        if (councillorForm.name.trim()) {
          wardPayload.councillor = {
            ...councillorForm,
            sinceDate: councillorForm.sinceDate
              ? new Date(councillorForm.sinceDate).toISOString()
              : undefined,
          };
        }

        // Attach demographics (backend auto-estimates if omitted)
        if (demoPayload) {
          wardPayload.demographics = demoPayload;
        }

        const res = await createWardMut.mutateAsync(wardPayload);
        navigate(`/wards/${res.data.id}`);
      }
    } catch {
      // errors handled by mutation hooks
    }
  };

  // ─── Derived ──────────────────────────────────────────

  const isSaving =
    createWardMut.isPending ||
    updateWardMut.isPending ||
    createAreaMut.isPending ||
    updateAreaMut.isPending ||
    createCouncillorMut.isPending ||
    updateCouncillorMut.isPending;

  const totalPop = localAreas.reduce((s, a) => s + a.population, 0);
  const totalMale = localAreas.reduce((s, a) => s + a.maleCount, 0);
  const totalFemale = localAreas.reduce((s, a) => s + a.femaleCount, 0);
  const totalHH = localAreas.reduce((s, a) => s + a.households, 0);

  // ─── Loading ──────────────────────────────────────────

  if (isEdit && wardLoading) {
    return (
      <MainLayout title="Edit Ward">
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <MainLayout title={isEdit ? "Edit Ward" : "Add Ward"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/wards">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Map className="h-7 w-7 text-primary" />
              {isEdit ? "Edit Ward" : "Add New Ward"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit
                ? `Editing ${ward?.name}`
                : "Create a new ward and add areas"}
            </p>
          </div>
        </div>

        {/* ═══ Ward Information ═══════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ward Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Ward Name <span className="text-destructive">*</span>
                </Label>
                <Input {...register("name")} placeholder="e.g. Shivaji Nagar" />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Ward Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  {...register("wardNumber")}
                  placeholder="1"
                />
                {errors.wardNumber && (
                  <p className="text-xs text-destructive">
                    {errors.wardNumber.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>District</Label>
                <Select
                  value={selectedDistrictId || "none"}
                  onValueChange={(val) =>
                    setSelectedDistrictId(val === "none" ? "" : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {districts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Town/Village</Label>
                <Controller
                  control={control}
                  name="townVillageId"
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value || "none"}
                      onValueChange={(val) =>
                        field.onChange(val === "none" ? "" : val)
                      }
                      disabled={!selectedDistrictId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Town/Village" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {townVillages.map((townVillage) => (
                          <SelectItem
                            key={townVillage.id}
                            value={townVillage.id}
                          >
                            {townVillage.name} ({townVillage.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.townVillageId && (
                  <p className="text-xs text-destructive">
                    {errors.townVillageId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Constituency</Label>
                <Controller
                  control={control}
                  name="constituencyId"
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value || "none"}
                      onValueChange={(val) =>
                        field.onChange(val === "none" ? "" : val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Constituency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {constituencies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Zone</Label>
                <Input
                  {...register("zone")}
                  placeholder="e.g. A, North, Central, Zone 1"
                />
              </div>
              <div className="space-y-2">
                <Label>Area Type</Label>
                <Controller
                  control={control}
                  name="areaType"
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Urban">Urban</SelectItem>
                        <SelectItem value="Semi-Urban">Semi-Urban</SelectItem>
                        <SelectItem value="Rural">Rural</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="PROPOSED">Proposed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Established Date</Label>
                <Input type="date" {...register("establishedDate")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...register("description")}
                placeholder="Brief description..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* ═══ Councillor ════════════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Ward Councillor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Councillor Name</Label>
                <Input
                  value={councillorForm.name}
                  onChange={(e) =>
                    setCouncillorForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={councillorForm.phone}
                  onChange={(e) =>
                    setCouncillorForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="9876000001"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={councillorForm.email}
                  onChange={(e) =>
                    setCouncillorForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="councillor@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Party Name</Label>
                <Input
                  value={councillorForm.partyName}
                  onChange={(e) =>
                    setCouncillorForm((p) => ({
                      ...p,
                      partyName: e.target.value,
                    }))
                  }
                  placeholder="e.g. ..........."
                />
              </div>
              <div className="space-y-2">
                <Label>Since Date</Label>
                <Input
                  type="date"
                  value={councillorForm.sinceDate}
                  onChange={(e) =>
                    setCouncillorForm((p) => ({
                      ...p,
                      sinceDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Areas ═════════════════════════════════════ */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Areas Under This
                Ward
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {localAreas.length} area(s) • Pop: {totalPop.toLocaleString()}{" "}
                (M: {totalMale.toLocaleString()} / F:{" "}
                {totalFemale.toLocaleString()}) • HH: {totalHH.toLocaleString()}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={openAddArea}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Area
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {localAreas.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Population</TableHead>
                    <TableHead className="text-right">M / F</TableHead>
                    <TableHead className="text-right">Households</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localAreas.map((area, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {area.name}
                        {area.isNew && !area.id && (
                          <Badge variant="outline" className="ml-2 text-[9px]">
                            NEW
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {area.areaType.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {area.population.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <span className="text-blue-600">
                          {area.maleCount.toLocaleString()}
                        </span>
                        {" / "}
                        <span className="text-pink-600">
                          {area.femaleCount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {area.households.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditArea(idx)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() =>
                              setDeleteAreaDialog({ open: true, idx })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  No areas added yet. Click "Add Area" to start.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══ Demographics ══════════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Demographics Data
              <Badge variant="outline" className="text-[10px] ml-2">
                Optional
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Leave all zeros to auto-estimate from area population. Fill for
              actual survey data.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Age Distribution */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Age Distribution
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
                {(
                  [
                    { key: "age0to6", label: "0–6 yrs" },
                    { key: "age7to18", label: "7–18 yrs" },
                    { key: "age19to35", label: "19–35 yrs" },
                    { key: "age36to60", label: "36–60 yrs" },
                    { key: "age60plus", label: "60+ yrs" },
                  ] as const
                ).map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={demoForm[f.key] || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          [f.key]: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Social Categories */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Social Categories
              </Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-2">
                {(
                  [
                    { key: "generalCount", label: "General" },
                    { key: "obcCount", label: "OBC" },
                    { key: "scCount", label: "SC" },
                    { key: "stCount", label: "ST" },
                    { key: "minorityCount", label: "Minority" },
                    { key: "otherCount", label: "Other" },
                  ] as const
                ).map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={demoForm[f.key] || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          [f.key]: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Regious  */}
            {/* Religion Distribution */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Religion Distribution
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3 mt-2">
                {(
                  [
                    {
                      key: "hinduCount",
                      label: "Hindu",
                      faIcon: faOm,
                      color: "text-orange-500",
                    },
                    {
                      key: "muslimCount",
                      label: "Muslim",
                      faIcon: faStarAndCrescent,
                      color: "text-emerald-600",
                    },
                    {
                      key: "sikhCount",
                      label: "Sikh",
                      faIcon: faKhanda,
                      color: "text-blue-600",
                    },
                    {
                      key: "christianCount",
                      label: "Christian",
                      faIcon: faCross,
                      color: "text-purple-600",
                    },
                    {
                      key: "buddhistCount",
                      label: "Buddhist",
                      faIcon: faDharmachakra,
                      color: "text-amber-600",
                    },
                    {
                      key: "jainCount",
                      label: "Jain",
                      faIcon: faHandsPraying,
                      color: "text-teal-600",
                    },
                    {
                      key: "otherReligionCount",
                      label: "Other",
                      Icon: Users,
                      color: "text-gray-500",
                    },
                  ] as const
                ).map((f: any) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs flex items-center gap-1.5">
                      {f.label}
                      {f.faIcon ? (
                        <FontAwesomeIcon
                          icon={f.faIcon}
                          className={`h-3 w-3 ${f.color}`}
                        />
                      ) : (
                        <f.Icon className={`h-3.5 w-3.5 ${f.color}`} />
                      )}
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={demoForm[f.key] || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          [f.key]: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* Economic + Literacy + Voters */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Economic
                </Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">BPL Families</Label>
                    <Input
                      type="number"
                      value={demoForm.bplHouseholds || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          bplHouseholds: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">APL Families</Label>
                    <Input
                      type="number"
                      value={demoForm.aplHouseholds || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          aplHouseholds: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Literacy Rate (%)
                </Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Overall</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={demoForm.literacyRate || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          literacyRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Male</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={demoForm.maleLiteracyRate || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          maleLiteracyRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Female</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={demoForm.femaleLiteracyRate || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          femaleLiteracyRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Survey Vital Stats
                </Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">New Voters Count</Label>
                    <Input
                      type="number"
                      value={demoForm.newVotersCount || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          newVotersCount: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Total Births</Label>
                    <Input
                      type="number"
                      className="border-green-200 focus:border-green-500"
                      value={demoForm.totalBirths || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          totalBirths: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Total Deaths</Label>
                    <Input
                      type="number"
                      className="border-red-200 focus:border-red-500"
                      value={demoForm.totalDeaths || ""}
                      onChange={(e) =>
                        setDemoForm((p) => ({
                          ...p,
                          totalDeaths: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Source & Date */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Data Source</Label>
                <Input
                  value={demoForm.source}
                  onChange={(e) =>
                    setDemoForm((p) => ({ ...p, source: e.target.value }))
                  }
                  placeholder="e.g. Census 2021, Ward Survey 2024"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Survey Date</Label>
                <Input
                  type="date"
                  value={demoForm.surveyDate}
                  onChange={(e) =>
                    setDemoForm((p) => ({ ...p, surveyDate: e.target.value }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Submit ════════════════════════════════════ */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/wards">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving} className="gap-2 min-w-35">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />{" "}
                {isEdit ? "Update Ward" : "Create Ward"}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* ═══ Area Dialog ═════════════════════════════════ */}
      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAreaIdx !== null ? "Edit Area" : "Add New Area"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Area Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={areaForm.name}
                  onChange={(e) =>
                    setAreaForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Market Road"
                />
              </div>
              <div className="space-y-2">
                <Label>Area Type</Label>
                <Select
                  value={areaForm.areaType}
                  onValueChange={(v) =>
                    setAreaForm((p) => ({ ...p, areaType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Population</Label>
                <Input
                  type="number"
                  value={areaForm.population || ""}
                  onChange={(e) =>
                    setAreaForm((p) => ({
                      ...p,
                      population: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Male Count</Label>
                <Input
                  type="number"
                  value={areaForm.maleCount || ""}
                  onChange={(e) =>
                    setAreaForm((p) => ({
                      ...p,
                      maleCount: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Female Count</Label>
                <Input
                  type="number"
                  value={areaForm.femaleCount || ""}
                  onChange={(e) =>
                    setAreaForm((p) => ({
                      ...p,
                      femaleCount: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Households</Label>
                <Input
                  type="number"
                  value={areaForm.households || ""}
                  onChange={(e) =>
                    setAreaForm((p) => ({
                      ...p,
                      households: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={areaForm.pincode}
                  onChange={(e) =>
                    setAreaForm((p) => ({ ...p, pincode: e.target.value }))
                  }
                  placeholder="110001"
                />
              </div>
              <div className="space-y-2">
                <Label>Landmark</Label>
                <Input
                  value={areaForm.landmark}
                  onChange={(e) =>
                    setAreaForm((p) => ({ ...p, landmark: e.target.value }))
                  }
                  placeholder="Near..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAreaDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveAreaLocal}>
              {editingAreaIdx !== null ? "Update" : "Add"} Area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Area Dialog ══════════════════════════ */}
      <AlertDialog
        open={deleteAreaDialog.open}
        onOpenChange={(open) => setDeleteAreaDialog({ open, idx: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Area</AlertDialogTitle>
            <AlertDialogDescription>
              This will recalculate the ward's totals. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteArea}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteAreaMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
