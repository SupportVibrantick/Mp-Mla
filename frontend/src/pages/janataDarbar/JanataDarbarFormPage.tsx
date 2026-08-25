import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useJanataSession, useCreateJanataSession, useUpdateJanataSession } from "@/hooks/useJanataDarbar";
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
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const sessionFormSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional().nullable().or(z.literal("")),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be in HH:MM format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "End time must be in HH:MM format"),
  location: z.string().min(2, "Location is required"),
  type: z.enum(["JANATA_DARBAR"]),
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

type FormValues = z.infer<typeof sessionFormSchema>;

export default function JanataDarbarFormPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEditing = !!id && id !== "new";

  const { data: sessionRes, isLoading } = useJanataSession(id || "");
  const createMut = useCreateJanataSession();
  const updateMut = useUpdateJanataSession();

  const isSaving = createMut.isPending || updateMut.isPending;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "10:00",
      endTime: "13:00",
      location: "",
      type: "JANATA_DARBAR",
    },
  });

  useEffect(() => {
    if (isEditing && sessionRes?.data) {
      const s = sessionRes.data;
      reset({
        title: s.title || "",
        description: s.description || "",
        location: s.location || "",
        type: s.type || "JANATA_DARBAR",
        date: s.date ? new Date(s.date).toISOString().split("T")[0] : "",
        startTime: s.startTime || "10:00",
        endTime: s.endTime || "13:00",
      });
    }
  }, [isEditing, sessionRes, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        description: values.description || null,
      };

      if (isEditing) {
        await updateMut.mutateAsync({ id: id!, payload });
        setLocation(`/janata-darbar/${id}`);
      } else {
        const res = await createMut.mutateAsync(payload);
        if (res?.data?.id) {
          setLocation(`/janata-darbar/${res.data.id}`);
        } else {
          setLocation("/janata-darbar");
        }
      }
    } catch (e) {
      // errors handled by mutation callbacks
    }
  };

  if (isEditing && isLoading) {
    return (
      <MainLayout title="Edit Janata Darbar">
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 mt-8" />
          <Skeleton className="h-48" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEditing ? "Edit Janata Darbar" : "Schedule Janata Darbar"}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Header Section */}
        <div className="flex items-center gap-3">
          <Link href="/janata-darbar">
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
              <Users className="h-7 w-7 text-primary" />
              {isEditing ? "Edit Session Details" : "Schedule Janata Darbar"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEditing ? "Update details for this public queue session" : "Schedule a new public hearing session to listen to constituent concerns"}
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
                  Session Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("title")}
                  placeholder="e.g. Weekly Janata Darbar - Block A"
                  className="rounded-xl h-10 border-border/60"
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Session Type <span className="text-destructive">*</span></Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="rounded-xl h-10 border-border/60">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="JANATA_DARBAR">Janata Darbar</SelectItem>
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
                placeholder="Write notes about focus areas, departments participating, etc."
                rows={4}
                className="rounded-xl border-border/60"
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Date and Timing */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 font-heading">
              <Clock className="h-4 w-4 text-primary" /> Schedule & Timings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="date"
                    {...register("date")}
                    className="pl-10 rounded-xl h-10 border-border/60"
                  />
                </div>
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="time"
                    {...register("startTime")}
                    className="pl-10 rounded-xl h-10 border-border/60"
                  />
                </div>
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>
                  End Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    type="time"
                    {...register("endTime")}
                    className="pl-10 rounded-xl h-10 border-border/60"
                  />
                </div>
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Venue / Location <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  {...register("location")}
                  placeholder="e.g. MLA Camp Office, Sector 2"
                  className="pl-10 rounded-xl h-10 border-border/60"
                />
              </div>
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t font-medium">
          <Link href="/janata-darbar">
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
            {isSaving ? "Saving..." : isEditing ? "Update" : "Schedule"} Session
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
