import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useScheme,
  useCreateScheme,
  useUpdateScheme,
  SCHEME_STATUSES,
  SCHEME_LEVELS,
} from "@/hooks/useSchemes";
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
import { ArrowLeft, Save, FileText, Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  department: z.string().min(1, "Department required"),
  level: z.string().default("Central"),
  description: z.string().optional(),
  eligibility: z.string().optional(),
  benefits: z.string().optional(),
  applicationUrl: z.string().optional(),
  budget: z.coerce.number().min(0).default(0),
  status: z.string().default("ACTIVE"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
type FV = z.infer<typeof formSchema>;

export default function SchemeFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!id;
  const { data: sRes, isLoading } = useScheme(id);
  const createMut = useCreateScheme();
  const updateMut = useUpdateScheme();
  const { data: deptsRes } = useDepartments();
  const s = sRes?.data;
  const departments = (deptsRes?.data || []).filter((d: any) => d.isActive);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FV>({
    resolver: zodResolver(formSchema),
    defaultValues: { level: "Central", status: "ACTIVE", budget: 0 },
  });

  useEffect(() => {
    if (!s || !isEdit) return;
    reset({
      name: s.name,
      department: s.department,
      level: s.level,
      description: s.description || "",
      eligibility: s.eligibility || "",
      benefits: s.benefits || "",
      applicationUrl: s.applicationUrl || "",
      budget: s.budget,
      status: s.status,
      startDate: s.startDate ? s.startDate.split("T")[0] : "",
      endDate: s.endDate ? s.endDate.split("T")[0] : "",
    });
  }, [s, isEdit, reset]);

  const onSubmit = async (data: FV) => {
    const payload: any = {
      ...data,
      applicationUrl: data.applicationUrl || undefined,
      startDate: data.startDate
        ? new Date(data.startDate).toISOString()
        : undefined,
      endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
    };
    if (isEdit && id) {
      await updateMut.mutateAsync({ id, data: payload });
      navigate(`/schemes/${id}`);
    } else {
      const res = await createMut.mutateAsync(payload);
      navigate(`/schemes/${res.data.id}`);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  if (isEdit && isLoading)
    return (
      <MainLayout title="Edit Scheme">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );

  return (
    <MainLayout title={isEdit ? "Edit Scheme" : "Add Scheme"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <Link to="/schemes">
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
            <FileText className="h-7 w-7 text-primary" />
            {isEdit ? `Edit ${s?.name}` : "Add Scheme"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheme Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input {...register("name")} placeholder="PM Awas Yojana" />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Department <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch("department")}
                  onValueChange={(v) => setValue("department", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department && (
                  <p className="text-xs text-destructive">
                    {errors.department.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select
                  value={watch("level")}
                  onValueChange={(v) => setValue("level", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEME_LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.icon} {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEME_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...register("description")}
                placeholder="What this scheme does..."
                rows={3}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Eligibility</Label>
                <Textarea
                  {...register("eligibility")}
                  placeholder="Who can apply..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Benefits</Label>
                <Textarea
                  {...register("benefits")}
                  placeholder="What beneficiaries get..."
                  rows={2}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Budget (₹)</Label>
                <Input type="number" {...register("budget")} />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" {...register("startDate")} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" {...register("endDate")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Application URL</Label>
              <Input
                {...register("applicationUrl")}
                placeholder="https://scheme.gov.in/apply"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/schemes">
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
                {isEdit ? "Update" : "Create"} Scheme
              </>
            )}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
