import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useSchemeApplication,
  useCreateSchemeApplication,
  useUpdateSchemeApplication,
  useSchemes,
} from "@/hooks/useSchemes";
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
import { ArrowLeft, Save, FileText, Loader2 } from "lucide-react";

const formSchema = z.object({
  schemeId: z.string().min(1, "Scheme required"),
  beneficiaryName: z.string().min(1, "Beneficiary name required"),
  beneficiaryPhone: z.string().optional(),
  beneficiaryEmail: z.string().optional(),
  address: z.string().optional(),
  wardId: z.string().optional(),
  notes: z.string().optional(),
});
type FV = z.infer<typeof formSchema>;

export default function SchemeApplicationFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!id;
  const { data: sRes, isLoading } = useSchemeApplication(id);
  const createMut = useCreateSchemeApplication();
  const updateMut = useUpdateSchemeApplication();
  const { data: schemesRes } = useSchemes({ limit: 100 });
  const { data: wardsRes } = useWards({ limit: 100 });

  const s = sRes?.data;
  const schemes = schemesRes?.data || [];
  const wards = wardsRes?.data?.wards || wardsRes?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<FV>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!s || !isEdit) return;
    reset({
      schemeId: s.schemeId,
      beneficiaryName: s.beneficiaryName,
      beneficiaryPhone: s.beneficiaryPhone || "",
      beneficiaryEmail: s.beneficiaryEmail || "",
      address: s.address || "",
      wardId: s.wardId || "",
      notes: s.notes || "",
    });
  }, [s, isEdit, reset]);

  const onSubmit = async (data: FV) => {
    const payload: any = {
      ...data,
      beneficiaryPhone: data.beneficiaryPhone || undefined,
      beneficiaryEmail: data.beneficiaryEmail || undefined,
      address: data.address || undefined,
      wardId: data.wardId || undefined,
      notes: data.notes || undefined,
    };
    if (isEdit && id) {
      await updateMut.mutateAsync({ id, data: payload });
      navigate(`/schemes/applications/${id}`);
    } else {
      const res = await createMut.mutateAsync(payload);
      navigate(`/schemes/applications/${res.data.id}`);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  if (isEdit && isLoading)
    return (
      <MainLayout title="Edit Application">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );

  return (
    <MainLayout title={isEdit ? "Edit Application" : "New Application"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <Link to="/schemes/applications">
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
            {isEdit ? `Edit ${s?.applicationNumber}` : "New Application"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Beneficiary Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Scheme <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="schemeId"
                control={control}
                render={({ field }) => (
                  <Select
                    key={field.value}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      {schemes.map((sc: any) => (
                        <SelectItem key={sc.id} value={sc.id}>
                          {sc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.schemeId && (
                <p className="text-xs text-destructive">
                  {errors.schemeId.message}
                </p>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Beneficiary Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("beneficiaryName")}
                  placeholder="Full name"
                />
                {errors.beneficiaryName && (
                  <p className="text-xs text-destructive">
                    {errors.beneficiaryName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  {...register("beneficiaryPhone")}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  {...register("beneficiaryEmail")}
                  placeholder="beneficiary@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Ward</Label>
                <Controller
                  name="wardId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ward (optional)" />
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
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                {...register("address")}
                placeholder="Full address"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                {...register("notes")}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/schemes/applications">
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
                {isEdit ? "Update" : "Create"} Application
              </>
            )}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}