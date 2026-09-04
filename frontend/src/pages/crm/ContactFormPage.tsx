import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useContact,
  useCreateContact,
  useUpdateContact,
  CONTACT_CATEGORIES,
} from "@/hooks/useCrm";
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

const phoneValidation = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine(
    (val) => !val || /^\+?[0-9\s-]{10,15}$/.test(val),
    "Invalid phone number. Must contain 10-15 digits"
  );

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  phone: phoneValidation,
  email: z.string().optional(),
  address: z.string().optional(),
  wardId: z.string().optional(),
  category: z.string().default("CITIZEN"),
  relationship: z.string().optional(),
  tags: z.string().optional(),
  importantNotes: z.string().optional(),
});
type FV = z.infer<typeof formSchema>;

export default function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!id;
  const { data: cRes, isLoading } = useContact(id);
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const { data: wardsRes } = useWards({ limit: 100 });

  const c = cRes?.data;
  const wards = wardsRes?.data?.wards || wardsRes?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<FV>({
    resolver: zodResolver(formSchema),
    defaultValues: { category: "CITIZEN" },
  });

  useEffect(() => {
    if (!c || !isEdit) return;
    reset({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      wardId: c.wardId || "",
      category: c.category,
      relationship: c.relationship || "",
      tags: c.tags || "",
      importantNotes: c.importantNotes || "",
    });
  }, [c, isEdit, reset]);

  const onSubmit = async (data: FV) => {
    const payload: any = {
      ...data,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      wardId: data.wardId || undefined,
      relationship: data.relationship || undefined,
      tags: data.tags || undefined,
      importantNotes: data.importantNotes || undefined,
    };
    if (isEdit && id) {
      await updateMut.mutateAsync({ id, data: payload });
      navigate(`/crm/contacts/${id}`);
    } else {
      const res = await createMut.mutateAsync(payload);
      navigate(`/crm/contacts/${res.data.id}`);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  if (isEdit && isLoading)
    return (
      <MainLayout title="Edit Contact">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );

  return (
    <MainLayout title={isEdit ? "Edit Contact" : "Add Contact"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <Link to="/crm/contacts">
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
            {isEdit ? `Edit ${c?.name}` : "Add Contact"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input {...register("name")} placeholder="Full name" />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Controller
                  name="category"
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
                        {CONTACT_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
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
                <Label>Phone</Label>
                <Input {...register("phone")} placeholder="+91 98765 43210" />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...register("email")} placeholder="contact@email.com" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input
                  {...register("relationship")}
                  placeholder="e.g. Supporter, Volunteer"
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
              <Label>Tags</Label>
              <Input
                {...register("tags")}
                placeholder="Comma separated tags"
              />
            </div>
            <div className="space-y-2">
              <Label>Important Notes</Label>
              <Textarea
                {...register("importantNotes")}
                placeholder="Key notes about this contact"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/crm/contacts">
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
                {isEdit ? "Update" : "Create"} Contact
              </>
            )}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}