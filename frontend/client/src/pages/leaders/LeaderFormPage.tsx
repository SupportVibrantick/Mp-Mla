import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Controller } from "react-hook-form";

import {
  useLeader,
  useCreateLeader,
  useUpdateLeader,
  LEADER_CATEGORIES,
  RELATIONS,
  // INFLUENCES,
} from "@/hooks/useLeaders";

import { useWards } from "@/hooks/useWards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MainLayout } from "@/components/layout/MainLayout";
import { ArrowLeft, Save, Users, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.string().min(1, "Category required"),
  designation: z.string().optional(),
  organization: z.string().optional(),
  partyName: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  gender: z.string().optional(),
  address: z.string().optional(),
  wardId: z.string().optional(),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  email: z.string().optional(),
  whatsapp: z.string().optional(),
  facebookUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  relation: z.string().optional(),
  // influence: z.string().optional(),
  notes: z.string().optional(),
  adharNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits")
    .optional()
    .or(z.literal("")),
});
type FV = z.infer<typeof schema>;

export default function LeaderFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!id;
  const { data: lRes, isLoading } = useLeader(id);
  const createMut = useCreateLeader();
  const updateMut = useUpdateLeader();
  const { data: wardsRes } = useWards({ limit: 100 });
  const l = lRes?.data;
  const wards = wardsRes?.data?.wards || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
  } = useForm<FV>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category: "",
      designation: "",
      organization: "",
      partyName: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      wardId: "",
      phone: "",
      altPhone: "",
      email: "",
      whatsapp: "",
      facebookUrl: "",
      twitterUrl: "",
      instagramUrl: "",
      relation: "",
      // influence: "",
      notes: "",
      adharNumber: "",
    },
  });

  useEffect(() => {
    if (!l || !isEdit) return;
    reset({
      name: l.name,
      category: l.category,
      designation: l.designation || "",
      organization: l.organization || "",
      partyName: l.partyName || "",
      dateOfBirth: l.dateOfBirth
        ? new Date(l.dateOfBirth).toISOString().split("T")[0]
        : "",
      gender: l.gender || "",
      address: l.address || "",
      wardId: l.wardId || "",
      phone: l.phone || "",
      altPhone: l.altPhone || "",
      email: l.email || "",
      whatsapp: l.whatsapp || "",
      facebookUrl: l.facebookUrl || "",
      twitterUrl: l.twitterUrl || "",
      instagramUrl: l.instagramUrl || "",
      relation: l.relation || "",
      // influence: l.influence || "",
      notes: l.notes || "",
      adharNumber: l.adharNumber || "",
    });
  }, [l, isEdit, reset]);

  const onSubmit = async (data: FV) => {
    const payload: any = { ...data };
    if (!payload.wardId) delete payload.wardId;
    if (isEdit && id) {
      await updateMut.mutateAsync({ id, data: payload });
      navigate(`/leaders/${id}`);
    } else {
      const res = await createMut.mutateAsync(payload);
      navigate(`/leaders/${res.data.id}`);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  if (isEdit && isLoading)
    return (
      <MainLayout title="Edit Local Representative">
        <Skeleton className="h-80 max-w-3xl mx-auto" />
      </MainLayout>
    );

  return (
    <MainLayout title={isEdit ? "Edit Local Representative" : "Add Local Representative"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <Link to="/leaders">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            {isEdit ? `Edit ${l?.name}` : "Add Local Representative"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      key={field.value} // ← critical fix
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEADER_CATEGORIES.map((c) => {
                          const CIcon = c.icon;
                          return (
                            <SelectItem key={c.value} value={c.value}>
                              <span className="flex items-center gap-2">
                                <CIcon className="h-3.5 w-3.5" /> {c.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && (
                  <p className="text-xs text-destructive">
                    {errors.category.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <Input type="date" {...register("dateOfBirth")} />
                {errors.dateOfBirth && (
                  <p className="text-xs text-destructive">
                    {errors.dateOfBirth.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select
                      key={field.value} // ← critical fix
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Ward</Label>
                <Controller
                  control={control}
                  name="wardId"
                  render={({ field }) => (
                    <Select
                      key={field.value} // ← critical fix
                      value={field.value || "none"}
                      onValueChange={(v) =>
                        field.onChange(v === "none" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {wards.map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>
                            #{w.wardNumber} {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  {...register("designation")}
                  placeholder="MLA, Councillor..."
                />
              </div>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Input
                  {...register("organization")}
                  placeholder="organization"
                />
              </div>
              <div className="space-y-2">
                <Label>Party</Label>
                <Input {...register("partyName")} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Address</Label>
                <Input {...register("address")} />
              </div>
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <Input
                  {...register("adharNumber")}
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                />
                {errors.adharNumber && (
                  <p className="text-xs text-destructive">
                    {errors.adharNumber.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input {...register("whatsapp")} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alt Phone</Label>
                <Input {...register("altPhone")} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...register("email")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Classification & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Relation</Label>
                <Controller
                  control={control}
                  name="relation"
                  render={({ field }) => (
                    <Select
                      key={field.value} // ← critical fix
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* <div className="space-y-2">
                <Label>Influence Level</Label>
                <Controller
                  control={control}
                  name="influence"
                  render={({ field }) => (
                    <Select
                      key={field.value} // ← critical fix
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {INFLUENCES.map((i) => (
                          <SelectItem key={i} value={i}>
                            {i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div> */}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                {...register("notes")}
                rows={3}
                placeholder="Private notes about this local representative..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/leaders">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 min-w-[160px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEdit ? "Update" : "Add"} Local Representative
              </>
            )}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
