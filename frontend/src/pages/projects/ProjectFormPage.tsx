import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ReactSelect from "react-select";
import {
  useProject,
  useCreateProject,
  useUpdateProject,
  PROJECT_CATEGORIES,
  FUND_TYPES,
} from "@/hooks/useProjects";
import { useWards } from "@/hooks/useWards";
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
import { ArrowLeft, Save, FolderKanban, Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.string().min(1, "Category required"),
  departmentId: z.string().min(1, "Department required"),
  wardId: z.string().min(1, "Ward required"),
  contractor: z.string().optional(),
  contractorPhone: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val), {
      message: "Enter a valid 10-digit phone number",
    }),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  budgetSanctioned: z.coerce.number().min(0).default(0),
  budgetReleased: z.coerce.number().min(0).default(0),
  budgetUsed: z.coerce.number().min(0).default(0),
  fundType: z.string().default("OTHER"),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.union([z.coerce.number(), z.string(), z.null()]).optional(),
  longitude: z.union([z.coerce.number(), z.string(), z.null()]).optional(),
  completionPercent: z.coerce.number().int().min(0).max(100).default(0),
});
type FV = z.input<typeof formSchema>;

export default function ProjectFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!id;
  const { data: pRes, isLoading } = useProject(id);
  const createMut = useCreateProject();
  const updateMut = useUpdateProject();
  const { data: wardsRes } = useWards({ limit: 100 });
  const { data: deptsRes } = useDepartments();
  const p = pRes?.data;
  const wards = wardsRes?.data?.wards || [];
  const departments = (deptsRes?.data || []).filter((d: any) => d.isActive);
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
    defaultValues: {
      budgetSanctioned: 0,
      budgetReleased: 0,
      budgetUsed: 0,
      fundType: "OTHER",
      latitude: "",
      longitude: "",
      completionPercent: 0,
    },
  });

  useEffect(() => {
    if (!p || !isEdit) return;
    reset({
      name: p.name,
      category: p.category,
      departmentId: p.departmentId || "",
      wardId: p.wardId,
      contractor: p.contractor || "",
      contractorPhone: p.contractorPhone || "",
      startDate: p.startDate ? p.startDate.split("T")[0] : "",
      expectedEndDate: p.expectedEndDate ? p.expectedEndDate.split("T")[0] : "",
      budgetSanctioned: p.budgetSanctioned,
      budgetReleased: p.budgetReleased,
      budgetUsed: p.budgetUsed,
      fundType: p.fundType,
      description: p.description || "",
      address: p.address || "",
      latitude: p.latitude ?? "",
      longitude: p.longitude ?? "",
      completionPercent: p.completionPercent ?? 0,
    });
  }, [p, isEdit, reset]);

  const onSubmit = async (data: FV) => {
    const payload: any = {
      ...data,
      startDate: data.startDate
        ? new Date(data.startDate).toISOString()
        : null,
      expectedEndDate: data.expectedEndDate
        ? new Date(data.expectedEndDate).toISOString()
        : null,
      latitude: data.latitude === "" || data.latitude === null ? null : parseFloat(data.latitude as any),
      longitude: data.longitude === "" || data.longitude === null ? null : parseFloat(data.longitude as any),
      completionPercent: parseInt(data.completionPercent as any) || 0,
    };
    if (isEdit && id) {
      await updateMut.mutateAsync({ id, data: payload });
      navigate(`/projects/${id}`);
    } else {
      const res = await createMut.mutateAsync(payload);
      navigate(`/projects/${res.data.id}`);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  if (isEdit && isLoading)
    return (
      <MainLayout title="Edit Project">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );
  const categoryOptions = PROJECT_CATEGORIES.map((c) => ({
    value: c.value,
    label: `${c.icon} ${c.label}`,
  }));

  const departmentOptions = departments.map((d: any) => ({
    value: d.id,
    label: d.name,
  }));
  const wardOptions = wards.map((w: any) => ({
    value: w.id,
    label: `#${w.wardNumber} ${w.name}`,
  }));
  return (
    <MainLayout title={isEdit ? "Edit Project" : "New Project"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <Link to="/projects">
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
            <FolderKanban className="h-7 w-7 text-primary" />
            {isEdit ? `Edit ${p?.projectCode}` : "New Project"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("name")}
                  placeholder="Road Construction Sector 5"
                />
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
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <ReactSelect
                      options={categoryOptions}
                      value={categoryOptions.find(
                        (opt) => opt.value === field.value,
                      )}
                      onChange={(selected) => field.onChange(selected?.value)}
                      placeholder="Select category"
                      isSearchable
                    />
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
                  Ward <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="wardId"
                  control={control}
                  render={({ field }) => (
                    <ReactSelect
                      options={wardOptions}
                      value={wardOptions.find(
                        (opt: any) => opt.value === field.value,
                      )}
                      onChange={(selected) => field.onChange(selected?.value)}
                      placeholder="Search ward..."
                      isSearchable
                    />
                  )}
                />
                {errors.wardId && (
                  <p className="text-xs text-destructive">
                    {errors.wardId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Department <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <ReactSelect
                      options={departmentOptions}
                      value={departmentOptions.find(
                        (opt: any) => opt.value === field.value,
                      )}
                      onChange={(selected) => field.onChange(selected?.value)}
                      placeholder="Select department"
                      isSearchable
                    />
                  )}
                />
                {errors.departmentId && (
                  <p className="text-xs text-destructive">
                    {errors.departmentId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Fund Type</Label>

                <Controller
                  name="fundType"
                  control={control}
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
                        {FUND_TYPES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contractor</Label>
                <Input
                  {...register("contractor")}
                  placeholder="ABC Construction Ltd"
                />
              </div>
              <div className="space-y-2">
                <Label>Contractor Phone</Label>
                <Input
                  {...register("contractorPhone")}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.value = target.value.replace(/\D/g, "");
                  }}
                />
                {errors.contractorPhone && (
                  <p className="text-xs text-destructive">
                    {errors.contractorPhone.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" {...register("startDate")} />
              </div>
              <div className="space-y-2">
                <Label>Expected End Date</Label>
                <Input type="date" {...register("expectedEndDate")} />
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Location / Address</Label>
                <Input
                  {...register("address")}
                  placeholder="Near market road, Sector 5"
                />
              </div>
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  {...register("latitude")}
                  placeholder="e.g. 28.6139"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  {...register("longitude")}
                  placeholder="e.g. 77.2090"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...register("description")}
                placeholder="About this project..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <Label>Completion Progress</Label>
                <span className="font-mono font-bold text-primary">{watch("completionPercent") || 0}%</span>
              </div>
              <Input
                type="range"
                min="0"
                max="100"
                {...register("completionPercent")}
                className="h-10 cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget (₹)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sanctioned</Label>
                <Input
                  type="number"
                  {...register("budgetSanctioned")}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Released</Label>
                <Input
                  type="number"
                  {...register("budgetReleased")}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Utilized</Label>
                <Input
                  type="number"
                  {...register("budgetUsed")}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/projects">
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
                {isEdit ? "Update" : "Create"} Project
              </>
            )}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
