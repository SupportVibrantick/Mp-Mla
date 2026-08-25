import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateAppointment,
  useUpdateAppointment,
  useAppointment,
} from "@/hooks/useAppointments";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  ArrowLeft,
  Clock,
  MapPin,
  Save,
  Info,
  User,
  Loader2,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum([
    "MLA_MP_MEETING",
    "PUBLIC_GRIEVANCE",
    "OFFICE_APPOINTMENT",
    "DEVELOPMENT_DISCUSSION",
    "OFFICIAL_MEETING",
  ]),
  requesterName: z.string().min(1, "Requester name is required"),
  requesterPhone: z.string().optional().nullable().or(z.literal("")),
  requesterEmail: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:MM format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:MM format"),
  location: z.string().optional().nullable().or(z.literal("")),
  purpose: z.string().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable().or(z.literal("")),
}).superRefine((data, ctx) => {
  const start = parseInt(data.startTime.replace(":", ""), 10);
  const end = parseInt(data.endTime.replace(":", ""), 10);
  if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be after start time",
      path: ["endTime"],
    });
  }
});

type FormValues = z.infer<typeof appointmentSchema>;

const TYPE_LABELS = [
  { value: "MLA_MP_MEETING", label: "MLA/MP Meeting" },
  { value: "PUBLIC_GRIEVANCE", label: "Public Grievance" },
  { value: "OFFICE_APPOINTMENT", label: "Office Appointment" },
  { value: "DEVELOPMENT_DISCUSSION", label: "Development Discussion" },
  { value: "OFFICIAL_MEETING", label: "Official Meeting" },
];

export default function AppointmentFormPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");

  const { data: apptData, isLoading } = useAppointment(id || "");
  const { mutateAsync: createAppointment, isPending: isCreating } = useCreateAppointment();
  const { mutateAsync: updateAppointment, isPending: isUpdating } = useUpdateAppointment();

  const isSaving = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<FormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      type: "MLA_MP_MEETING",
      requesterName: "",
      requesterPhone: "",
      requesterEmail: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "10:00",
      endTime: "11:00",
      location: "",
      purpose: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (apptData?.data) {
      const appt = apptData.data;
      reset({
        title: appt.title || "",
        type: appt.type || "MLA_MP_MEETING",
        requesterName: appt.requesterName || "",
        requesterPhone: appt.requesterPhone || "",
        requesterEmail: appt.requesterEmail || "",
        date: appt.date ? new Date(appt.date).toISOString().split("T")[0] : "",
        startTime: appt.startTime || "10:00",
        endTime: appt.endTime || "11:00",
        location: appt.location || "",
        purpose: appt.purpose || "",
        notes: appt.notes || "",
      });
    }
  }, [apptData, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: any = {
        ...values,
        requesterPhone: values.requesterPhone || null,
        requesterEmail: values.requesterEmail || null,
        location: values.location || null,
        purpose: values.purpose || null,
        notes: values.notes || null,
      };

      if (isEditing) {
        if (!id) return;
        await updateAppointment({ id, payload });
      } else {
        await createAppointment(payload);
      }
      setLocation("/appointments");
    } catch (error) {
      console.error(error);
    }
  };

  if (isEditing && isLoading) {
    return (
      <MainLayout title="Edit Appointment">
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 mt-8" />
          <Skeleton className="h-48" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEditing ? "Edit Appointment" : "Request Appointment"}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Header Section */}
        <div className="flex items-center gap-3">
          <Link href="/appointments">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 font-heading">
              <CalendarDays className="h-7 w-7 text-primary" />
              {isEditing ? "Edit Appointment" : "Request Appointment"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEditing ? `Editing appointment: ${apptData?.data?.appointmentNumber}` : "Request a new public or official appointment slot"}
            </p>
          </div>
        </div>

        {/* Requester Details */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 font-heading">
              <User className="h-4 w-4 text-primary" /> Requester Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Requester Name <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register("requesterName")}
                placeholder="e.g. Ramesh Kumar"
                className="rounded-xl h-10 border-border/60"
              />
              {errors.requesterName && <p className="text-xs text-destructive">{errors.requesterName.message}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Requester Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    {...register("requesterPhone")}
                    placeholder="e.g. 9876543210"
                    className="pl-10 rounded-xl h-10 border-border/60"
                  />
                </div>
                {errors.requesterPhone && <p className="text-xs text-destructive">{errors.requesterPhone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Requester Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    {...register("requesterEmail")}
                    placeholder="e.g. ramesh@example.com"
                    className="pl-10 rounded-xl h-10 border-border/60"
                  />
                </div>
                {errors.requesterEmail && <p className="text-xs text-destructive">{errors.requesterEmail.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 font-heading">
              <Info className="h-4 w-4 text-primary" /> Appointment Slot Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Appointment Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("title")}
                  placeholder="e.g. Grievance Discussion"
                  className="rounded-xl h-10 border-border/60"
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Appointment Type <span className="text-destructive">*</span></Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="rounded-xl h-10 border-border/60">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {TYPE_LABELS.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input type="date" {...register("date")} className="pl-10 rounded-xl h-10 border-border/60" />
                </div>
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input type="time" {...register("startTime")} className="pl-10 rounded-xl h-10 border-border/60" />
                </div>
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>
                  End Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input type="time" {...register("endTime")} className="pl-10 rounded-xl h-10 border-border/60" />
                </div>
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location / Venue</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  {...register("location")}
                  placeholder="e.g. Constituency Secretariat VIP Room"
                  className="pl-10 rounded-xl h-10 border-border/60"
                />
              </div>
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea
                {...register("purpose")}
                placeholder="Topics or agenda to discuss..."
                rows={3}
                className="rounded-xl border-border/60"
              />
              {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                {...register("notes")}
                placeholder="For internal office use..."
                rows={3}
                className="rounded-xl border-border/60"
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t font-medium">
          <Link href="/appointments">
            <Button type="button" variant="outline" className="rounded-xl h-10 px-6">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSaving}
            className="gap-2 min-w-[160px] rounded-xl h-10"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : isEditing ? "Update" : "Request"} Appointment
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
