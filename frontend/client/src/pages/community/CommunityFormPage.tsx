import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCommunityGroup,
  useCreateCommunityGroup,
  useUpdateCommunityGroup,
  COMMUNITY_TYPES,
} from "@/hooks/useCommunityGroups";
import { useWards, useWardAreas } from "@/hooks/useWards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MainLayout } from "@/components/layout/MainLayout";
import { ArrowLeft, Save, Users, User, MapPin, Loader2 } from "lucide-react";

// ─── Schema ─────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  wardId: z.string().min(1, "Ward is required"),
  wardAreaId: z.string().optional().nullable(),
  address: z.string().optional(),
  description: z.string().optional(),
  memberCount: z.coerce.number().int().min(0).default(0),
  maleMembers: z.coerce.number().int().min(0).default(0),
  femaleMembers: z.coerce.number().int().min(0).default(0),
  headName: z.string().optional(),
  headPhone: z.string().optional(),
  headEmail: z.string().optional(),
  headDesignation: z.string().optional(),
  foundedDate: z.string().optional(),
  registrationNo: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Component ──────────────────────────────────────────

export default function CommunityFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!id;

  const { data: groupRes, isLoading: groupLoading } = useCommunityGroup(id);
  const createMut = useCreateCommunityGroup();
  const updateMut = useUpdateCommunityGroup();
  const { data: wardsRes } = useWards({ limit: 100 });

  const group = groupRes?.data;
  const wards = wardsRes?.data?.wards || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      wardId: "",
      wardAreaId: null,
      memberCount: 0,
      maleMembers: 0,
      femaleMembers: 0,
      isActive: true,
    },
  });

  const selectedWardId = watch("wardId");

  // Fetch areas for selected ward
  const { data: areasRes } = useWardAreas(selectedWardId || undefined);
  const areas = areasRes?.data?.areas || [];

  // Populate on edit
  useEffect(() => {
    if (!group || !isEdit) return;
    reset({
      name: group.name,
      type: group.type,
      wardId: group.wardId,
      wardAreaId: group.wardAreaId || null,
      address: group.address || "",
      description: group.description || "",
      memberCount: group.memberCount || 0,
      maleMembers: group.maleMembers || 0,
      femaleMembers: group.femaleMembers || 0,
      headName: group.headName || "",
      headPhone: group.headPhone || "",
      headEmail: group.headEmail || "",
      headDesignation: group.headDesignation || "",
      foundedDate: group.foundedDate ? group.foundedDate.split("T")[0] : "",
      registrationNo: group.registrationNo || "",
      isActive: group.isActive,
    });
  }, [group, isEdit, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      const payload: any = {
        ...data,
        wardAreaId: data.wardAreaId || null,
        headEmail: data.headEmail || undefined,
        foundedDate: data.foundedDate
          ? new Date(data.foundedDate).toISOString()
          : undefined,
      };

      if (isEdit && id) {
        await updateMut.mutateAsync({ id, data: payload });
        navigate(`/community/${id}`);
      } else {
        const res = await createMut.mutateAsync(payload);
        navigate(`/community/${res.data.id}`);
      }
    } catch {
      // handled by mutation hooks
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isEdit && groupLoading) {
    return (
      <MainLayout title="Edit Group">
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
          <Skeleton className="h-48" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? "Edit Group" : "Add Group"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/community">
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
              <Users className="h-7 w-7 text-primary" />
              {isEdit ? "Edit Group" : "Add Community Group"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit
                ? `Editing ${group?.name}`
                : "Register a new community organization"}
            </p>
          </div>
        </div>

        {/* Group Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Group Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Group Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("name")}
                  placeholder="e.g. Sector 1 Residents Welfare Association"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch("type")}
                  onValueChange={(v) => setValue("type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUNITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-xs text-destructive">
                    {errors.type.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Ward <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch("wardId")}
                  onValueChange={(v) => {
                    setValue("wardId", v);
                    setValue("wardAreaId", null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        #{w.wardNumber} {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.wardId && (
                  <p className="text-xs text-destructive">
                    {errors.wardId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Area (Optional)</Label>
                <Select
                  value={watch("wardAreaId") || "none"}
                  onValueChange={(v) =>
                    setValue("wardAreaId", v === "none" ? null : v)
                  }
                  disabled={!selectedWardId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Ward Level —</SelectItem>
                    {areas.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.areaType.replace("_", " ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Registration Number</Label>
                <Input
                  {...register("registrationNo")}
                  placeholder="e.g. RWA/SN/001"
                />
              </div>
              <div className="space-y-2">
                <Label>Founded Date</Label>
                <Input type="date" {...register("foundedDate")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...register("address")} placeholder="Full address..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...register("description")}
                placeholder="About the group, activities, goals..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={watch("isActive")}
                onCheckedChange={(v) => setValue("isActive", v)}
              />
              <Label>Active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total Members</Label>
                <Input
                  type="number"
                  {...register("memberCount")}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Male Members</Label>
                <Input
                  type="number"
                  {...register("maleMembers")}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Female Members</Label>
                <Input
                  type="number"
                  {...register("femaleMembers")}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Head Person */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Head / Contact Person
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register("headName")} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  {...register("headDesignation")}
                  placeholder="e.g. President, Secretary"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...register("headPhone")} placeholder="9876543210" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  {...register("headEmail")}
                  placeholder="head@email.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/community">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSaving}
            className="gap-2 min-w-[160px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />{" "}
                {isEdit ? "Update Group" : "Create Group"}
              </>
            )}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
