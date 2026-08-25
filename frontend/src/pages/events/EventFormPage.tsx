import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEvent, useCreateEvent, useUpdateEvent } from "@/hooks/useEvents";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Loader2,
  FileText,
  DollarSign,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const eventFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional().nullable().or(z.literal("")),
  type: z.enum([
    "PUBLIC_MEETING",
    "JANATA_DARBAR",
    "CONSTITUENCY_VISIT",
    "VILLAGE_VISIT",
    "DEVELOPMENT_INAUGURATION",
    "PUBLIC_HEARING",
    "OFFICIAL_MEETING",
    "COMMUNITY_EVENT",
    "PRESS_CONFERENCE",
  ]),
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
  location: z.string().min(2, "Location is required"),
  maxAttendance: z.preprocess((v) => Number(v) || null, z.number().nullable().optional()),
  estimatedBudget: z.preprocess((v) => Number(v) || null, z.number().nullable().optional()),
});

type FormValues = z.infer<typeof eventFormSchema>;

const TYPE_LABELS = [
  { value: "PUBLIC_MEETING", label: "Public Meeting" },
  { value: "JANATA_DARBAR", label: "Janata Darbar" },
  { value: "CONSTITUENCY_VISIT", label: "Constituency Visit" },
  { value: "VILLAGE_VISIT", label: "Village Visit" },
  { value: "DEVELOPMENT_INAUGURATION", label: "Development Inauguration" },
  { value: "PUBLIC_HEARING", label: "Public Hearing" },
  { value: "OFFICIAL_MEETING", label: "Official Meeting" },
  { value: "COMMUNITY_EVENT", label: "Community Event" },
  { value: "PRESS_CONFERENCE", label: "Press Conference" },
];

export default function EventFormPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id && id !== "new";

  const { data: eventRes, isLoading } = useEvent(id || "");
  const createMut = useCreateEvent();
  const updateMut = useUpdateEvent();

  const isSaving = createMut.isPending || updateMut.isPending;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "PUBLIC_MEETING",
      startDate: "",
      endDate: "",
      location: "",
      maxAttendance: null,
      estimatedBudget: null,
    },
  });

  useEffect(() => {
    if (isEditing && eventRes?.data) {
      const e = eventRes.data;
      reset({
        title: e.title || "",
        description: e.description || "",
        type: e.type || "PUBLIC_MEETING",
        location: e.location || "",
        maxAttendance: e.maxAttendance || null,
        estimatedBudget: e.estimatedBudget || null,
        startDate: e.startDate ? e.startDate.slice(0, 16) : "",
        endDate: e.endDate ? e.endDate.slice(0, 16) : "",
      });
    }
  }, [isEditing, eventRes, reset]);

  const onSubmit = async (values: FormValues) => {
    if (new Date(values.endDate) <= new Date(values.startDate)) {
      toast.error("End Date & Time must be after the Start Date & Time.");
      return;
    }

    try {
      const payload = {
        ...values,
        description: values.description || null,
        maxAttendance: values.maxAttendance || null,
        estimatedBudget: values.estimatedBudget || null,
      };

      if (isEditing) {
        await updateMut.mutateAsync({ id: id!, payload });
        setLocation(`/events/${id}`);
      } else {
        const res = await createMut.mutateAsync(payload);
        if (res?.data?.id) {
          setLocation(`/events/${res.data.id}`);
        } else {
          setLocation("/events");
        }
      }
    } catch (e) {
      // errors handled by mutation callbacks
    }
  };

  if (isEditing && isLoading) {
    return (
      <MainLayout title="Edit Event">
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 mt-8" />
          <Skeleton className="h-48" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEditing ? "Edit Event Details" : "Create Constituency Event"}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Header Section */}
        <div className="flex items-center gap-3">
          <Link href="/events">
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
              {isEditing ? "Edit Event Details" : "Create New Event"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEditing ? "Update details for this constituency event schedule" : "Schedule a new rally, public town hall, or campaign"}
            </p>
          </div>
        </div>

        {/* Basic Info */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 font-heading">
              <Info className="h-4 w-4 text-primary" /> General Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Event Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("title")}
                  placeholder="e.g. Swachh Bharat Block Rally"
                  className="rounded-xl h-10 border-border/60"
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Event Type <span className="text-destructive">*</span></Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="rounded-xl h-10 border-border/60">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {TYPE_LABELS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea
                {...register("description")}
                placeholder="Details about the event, VIP guest lists, expected outcomes, etc."
                rows={4}
                className="rounded-xl border-border/60"
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Date and Location Details */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 font-heading">
              <MapPin className="h-4 w-4 text-primary" /> Schedule & Venue Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Start Date & Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="datetime-local"
                    {...register("startDate")}
                    className="pl-10 rounded-xl h-10 border-border/60"
                  />
                </div>
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>
                  End Date & Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="datetime-local"
                    {...register("endDate")}
                    className="pl-10 rounded-xl h-10 border-border/60"
                  />
                </div>
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Location / Venue <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  {...register("location")}
                  placeholder="e.g. Panchayat Bhawan ground, Ward 4"
                  className="pl-10 rounded-xl h-10 border-border/60"
                />
              </div>
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Additional Parameters */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 font-heading">
              <Users className="h-4 w-4 text-primary" /> Capacity & Planning (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Expected Attendance Limit</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="number"
                    placeholder="e.g. 500"
                    {...register("maxAttendance")}
                    className="pl-10 rounded-xl h-10 border-border/60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estimated Budget (INR)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="number"
                    placeholder="e.g. 25000"
                    {...register("estimatedBudget")}
                    className="pl-10 rounded-xl h-10 border-border/60"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t font-medium">
          <Link href="/events">
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
            {isSaving ? "Saving..." : isEditing ? "Update" : "Create"} Event
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
