import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@/components/ui/select";
import { z } from "zod";
import {
  usePublicFacility,
  useCreatePublicFacility,
  useUpdatePublicFacility,
  PUBLIC_FACILITY_CATEGORIES,
} from "@/hooks/usePublicFacilities";
import { useWards } from "@/hooks/useWards";
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
import { MainLayout } from "@/components/layout/MainLayout";
import {
  ArrowLeft,
  Save,
  Building2,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Loader2,
  Users,
} from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  category: z.string().min(1, "Category required"),
  subcategory: z.string().optional(),
  address: z.string().min(1, "Address required"),
  wardId: z.string().min(1, "Ward required"),
  contactNo: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  status: z.string().default("ACTIVE"),
  description: z.string().optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  establishedDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InchargeLocal {
  id?: string;
  name: string;
  designation: string;
  contactNo: string;
  email: string;
  dateOfBirth: string;
  appointedDate: string;
  adharNumber?: string;
  isNew?: boolean;
}

const emptyIncharge: InchargeLocal = {
  name: "",
  designation: "",
  contactNo: "",
  email: "",
  dateOfBirth: "",
  appointedDate: "",
  adharNumber: "",
};

export default function PublicFacilityFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!id;

  const { data: instRes, isLoading } = usePublicFacility(id);
  const createMut = useCreatePublicFacility();
  const updateMut = useUpdatePublicFacility();
  const { data: wardsRes } = useWards({ limit: 100 });

  const inst = instRes?.data;
  const wards = wardsRes?.data?.wards || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    control,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      address: "",
      wardId: "",
      status: "ACTIVE",
    },
  });

  // Local incharges for create mode
  const [localIncharges, setLocalIncharges] = useState<InchargeLocal[]>([]);
  const [icDialog, setIcDialog] = useState(false);
  const [editingIcIdx, setEditingIcIdx] = useState<number | null>(null);
  const [icForm, setIcForm] = useState<InchargeLocal>({ ...emptyIncharge });

  // Category groups
  const categoryGroups = useMemo(() => {
    const groups: Record<string, (typeof PUBLIC_FACILITY_CATEGORIES)[number][]> =
      {};
    PUBLIC_FACILITY_CATEGORIES.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, []);

  // Populate on edit
  useEffect(() => {
    if (!inst || !isEdit) return;
    reset({
      name: inst.name,
      category: inst.category,
      subcategory: inst.subcategory || "",
      address: inst.address,
      wardId: inst.wardId,
      contactNo: inst.contactNo || "",
      email: inst.email || "",
      website: inst.website || "",
      status: inst.status,
      description: inst.description || "",
      capacity: inst.capacity || undefined,
      establishedDate: inst.establishedDate
        ? inst.establishedDate.split("T")[0]
        : "",
    });
  }, [inst, isEdit, reset]);

  // Incharge dialog handlers
  const openAddIc = () => {
    setEditingIcIdx(null);
    setIcForm({ ...emptyIncharge, isNew: true });
    setIcDialog(true);
  };

  const openEditIc = (idx: number) => {
    setEditingIcIdx(idx);
    setIcForm({ ...localIncharges[idx] });
    setIcDialog(true);
  };

  const saveIcLocal = () => {
    if (!icForm.name || !icForm.designation || !icForm.contactNo) return;
    if (editingIcIdx !== null) {
      setLocalIncharges((prev) =>
        prev.map((ic, i) => (i === editingIcIdx ? { ...icForm } : ic)),
      );
    } else {
      setLocalIncharges((prev) => [...prev, { ...icForm, isNew: true }]);
    }
    setIcDialog(false);
  };

  const removeIc = (idx: number) => {
    setLocalIncharges((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit
  const onSubmit = async (data: FormValues) => {
    try {
      const payload: any = {
        ...data,
        email: data.email || undefined,
        capacity: data.capacity || undefined,
        establishedDate: data.establishedDate
          ? new Date(data.establishedDate).toISOString()
          : undefined,
      };

      if (isEdit && id) {
        await updateMut.mutateAsync({ id, data: payload });
        navigate(`/public-facilities/${id}`);
      } else {
        // Include inline incharges on create
        payload.incharges = localIncharges.map((ic) => ({
          name: ic.name,
          designation: ic.designation,
          contactNo: ic.contactNo,
          email: ic.email || undefined,
          adharNumber: ic.adharNumber || undefined,
          dateOfBirth: ic.dateOfBirth
            ? new Date(ic.dateOfBirth).toISOString()
            : undefined,
          appointedDate: ic.appointedDate
            ? new Date(ic.appointedDate).toISOString()
            : undefined,
        }));
        const res = await createMut.mutateAsync(payload);
        navigate(`/public-facilities/${res.data.id}`);
      }
    } catch {
      /* handled */
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isEdit && isLoading) {
    return (
      <MainLayout title="Edit Public Facility">
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEdit ? "Edit Public Facility" : "Add Public Facility"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/public-facilities">
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
              <Building2 className="h-7 w-7 text-primary" />
              {isEdit ? "Edit Public Facility" : "Add Public Facility"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit ? `Editing ${inst?.name}` : "Register a new public facility"}
            </p>
          </div>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Public Facility Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input {...register("name")} placeholder="e.g. City Hospital" />
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
                    <Select
                      key={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>

                      <SelectContent className="max-h-72">
                        <SelectScrollUpButton />

                        {Object.entries(categoryGroups).map(([group, cats]) => (
                          <div key={group}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {group}
                            </div>
                            {cats.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                <span className="flex items-center gap-2">
                                  <img
                                    src={c.icon}
                                    alt={c.label}
                                    className="h-4 w-4 object-contain"
                                  />
                                  {c.label}
                                </span>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                        <SelectScrollDownButton />
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
                  Ward <span className="text-destructive">*</span>
                </Label>

                <Controller
                  name="wardId"
                  control={control}
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
                <Label>Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="UNDER_MAINTENANCE">
                      Under Maintenance
                    </SelectItem>
                    <SelectItem value="PROPOSED">Proposed</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Input
                  {...register("subcategory")}
                  placeholder="e.g. Primary, Multi-specialty"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Address <span className="text-destructive">*</span>
              </Label>
              <Input {...register("address")} placeholder="Full address" />
              {errors.address && (
                <p className="text-xs text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input {...register("contactNo")} placeholder="011-2345678" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...register("email")} placeholder="contact@inst.com" />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input {...register("website")} placeholder="https://..." />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  {...register("capacity")}
                  placeholder="e.g. 500 students"
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
                placeholder="About this institution..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inline Incharges (Create only) */}
        {!isEdit && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Incharges ({localIncharges.length})
              </CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={openAddIc}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Incharge
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {localIncharges.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localIncharges.map((ic, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{ic.name}</TableCell>
                        <TableCell>{ic.designation}</TableCell>
                        <TableCell>{ic.contactNo}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditIc(idx)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeIc(idx)}
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
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">
                    No incharges added yet. You can add them now or later.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isEdit && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center text-muted-foreground text-sm">
              <Users className="h-5 w-5 mx-auto mb-1 opacity-50" />
              Manage incharges from the{" "}
              <Link to={`/public-facilities/${id}`}>
                <span className="text-primary hover:underline cursor-pointer">
                  public facility detail page
                </span>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/public-facilities">
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
                <Save className="h-4 w-4" /> {isEdit ? "Update" : "Create"}{" "}
                Facility
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Incharge Dialog */}
      <Dialog open={icDialog} onOpenChange={setIcDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIcIdx !== null ? "Edit Incharge" : "Add Incharge"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={icForm.name}
                  onChange={(e) =>
                    setIcForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Designation <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={icForm.designation}
                  onChange={(e) =>
                    setIcForm((p) => ({ ...p, designation: e.target.value }))
                  }
                  placeholder="e.g. Principal"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Contact No <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={icForm.contactNo}
                  onChange={(e) =>
                    setIcForm((p) => ({ ...p, contactNo: e.target.value }))
                  }
                  placeholder="9876543210"
                />
              </div>
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <Input
                  value={icForm.adharNumber || ""}
                  onChange={(e) =>
                    setIcForm((p) => ({ ...p, adharNumber: e.target.value }))
                  }
                  placeholder="1234 5678 9012"
                  maxLength={12}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={icForm.email}
                  onChange={(e) =>
                    setIcForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="email@domain.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={icForm.dateOfBirth}
                  onChange={(e) =>
                    setIcForm((p) => ({ ...p, dateOfBirth: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Appointed Date</Label>
                <Input
                  type="date"
                  value={icForm.appointedDate}
                  onChange={(e) =>
                    setIcForm((p) => ({ ...p, appointedDate: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIcDialog(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveIcLocal}>
              {editingIcIdx !== null ? "Update" : "Add"} Incharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
