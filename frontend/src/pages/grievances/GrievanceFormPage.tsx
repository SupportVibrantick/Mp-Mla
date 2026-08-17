import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGrievance,
  useCreateGrievance,
  useUpdateGrievance,
  CATEGORIES,
  PRIORITIES,
  SOURCES,
} from "@/hooks/useGrievances";
import { useWards } from "@/hooks/useWards";
import { useUsers } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
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
import {
  ArrowLeft,
  Save,
  MessageSquare,
  User,
  MapPin,
  Loader2,
} from "lucide-react";

const formSchema = z.object({
  subject: z.string().min(1, "Subject required"),
  category: z.string().min(1, "Category required"),
  subcategory: z.string().optional(),
  description: z.string().min(10, "Min 10 characters"),
  wardId: z.string().min(1, "Ward required"),
  priority: z.string().default("MEDIUM"),
  source: z.string().default("OFFICE"),
  complainantName: z.string().optional(),
  complainantPhone: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val), {
      message: "Enter a valid 10-digit phone number",
    }),
  complainantEmail: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  complainantAddress: z.string().optional(),
  locationAddress: z.string().optional(),
  assignedDept: z.string().optional(),
  assignedToId: z.string().optional(),
});

type FV = z.infer<typeof formSchema>;

export default function GrievanceFormPage() {
  const [, navigate] = useLocation();
  // Get ID from state instead of params
  const id = (window.history.state as any)?.id;
  const isEdit = !!id;

  const { data: gRes, isLoading } = useGrievance(id);
  const createMut = useCreateGrievance();
  const updateMut = useUpdateGrievance();
  const { data: wardsRes } = useWards({ limit: 100 });
  const { data: usersRes } = useUsers({ limit: 100 });
  const { data: deptsRes } = useDepartments();

  const g = gRes?.data;
  const wards = wardsRes?.data?.wards || [];
  const users = usersRes?.data?.users || [];
  const departments = deptsRes?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
  } = useForm<FV>({
    resolver: zodResolver(formSchema),
    defaultValues: { priority: "MEDIUM", source: "OFFICE" },
  });

  useEffect(() => {
    if (!g || !isEdit) return;
    reset({
      subject: g.subject || "",
      category: g.category,
      subcategory: g.subcategory || "",
      description: g.description,
      wardId: g.wardId,
      priority: g.priority,
      source: g.source || "OFFICE",
      complainantName: g.complainantName || "",
      complainantPhone: g.complainantPhone || "",
      complainantEmail: g.complainantEmail || "",
      complainantAddress: g.complainantAddress || "",
      locationAddress: g.locationAddress || "",
      assignedDept: g.assignedDept || "",
      assignedToId: g.assignedToId || "",
    });
  }, [g, isEdit, reset]);

  const onSubmit = async (data: FV) => {
    try {
      const payload: any = { ...data };
      if (!payload.complainantEmail) delete payload.complainantEmail;
      
      if (payload.assignedDept === "none") {
        payload.assignedDept = null;
      } else if (!payload.assignedDept) {
        delete payload.assignedDept;
      }

      if (payload.assignedToId === "none") {
        payload.assignedToId = null;
      } else if (!payload.assignedToId) {
        delete payload.assignedToId;
      }

      if (isEdit && id) {
        await updateMut.mutateAsync({ id, data: payload });
        navigate("/public-requests/detail", { state: { id } });
      } else {
        const res = await createMut.mutateAsync(payload);
        navigate("/public-requests/detail", { state: { id: res.data.id } });
      }
    } catch {
      /* handled */
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  if (isEdit && isLoading)
    return (
      <MainLayout title="Edit Public Request">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );

  return (
    <MainLayout title={isEdit ? "Edit Public Request" : "New Public Request"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <Link to="/public-requests">
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
              <MessageSquare className="h-7 w-7 text-primary" />
              {isEdit ? `Edit ${g?.ticketNumber}` : "New Public Request"}
            </h1>
          </div>
        </div>

        {/* Requestor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Requestor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name
                </Label>
                <Input
                  {...register("complainantName")}
                  placeholder="Full name (optional)"
                />
                {errors.complainantName && (
                  <p className="text-xs text-destructive">
                    {errors.complainantName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Phone
                </Label>
                <Input
                  {...register("complainantPhone")}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210 (optional)"
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/\D/g, "");
                  }}
                />
                {errors.complainantPhone && (
                  <p className="text-xs text-destructive">
                    {errors.complainantPhone.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  {...register("complainantEmail")}
                  placeholder="email@domain.com"
                />
                {errors.complainantEmail && (
                  <p className="text-xs text-destructive">
                    {errors.complainantEmail.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  {...register("complainantAddress")}
                  placeholder="Residential address"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input {...register("subject")} placeholder="Brief summary" />
              {errors.subject && (
                <p className="text-xs text-destructive">
                  {errors.subject.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                {...register("description")}
                placeholder="Full details..."
                rows={5}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>

                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.icon} {c.label}
                          </SelectItem>
                        ))}
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
              <div className="space-y-2">
                <Label>Priority</Label>

                <Controller
                  control={control}
                  name="priority"
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
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.icon} {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>

                <Controller
                  control={control}
                  name="source"
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
                        {SOURCES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Input
                {...register("subcategory")}
                placeholder="e.g. Pothole, Pipeline Leak"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Location & Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Ward <span className="text-destructive">*</span>
                </Label>

                <Controller
                  control={control}
                  name="wardId"
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
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
                  )}
                />
                {errors.wardId && (
                  <p className="text-xs text-destructive">
                    {errors.wardId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Location Address</Label>
                <Input
                  {...register("locationAddress")}
                  placeholder="Near bus stop, lane 5..."
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>

                <Controller
                  control={control}
                  name="assignedDept"
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>

                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>

                <Controller
                  control={control}
                  name="assignedToId"
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="none">— Unassigned —</SelectItem>

                        {users.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/public-requests">
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
                {isEdit ? "Update" : "Submit"} Request
              </>
            )}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
