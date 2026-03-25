import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateMeeting,
  useUpdateMeeting,
  useMeeting,
  MEETING_STATUSES
} from "@/hooks/useMeetings";
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
  Link as LinkIcon,
  MapPin,
  Video,
  Monitor,
  Building2,
  Save,
  Users,
  Info,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  type: z.enum(["ONLINE", "OFFLINE"]),
  location: z.string().optional(),
  meetingLink: z.string().optional().or(z.literal("")),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
  attendees: z.string().optional(),
  organizedBy: z.string().optional(),
});

type FormValues = z.infer<typeof meetingSchema>;

export default function MeetingFormPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");

  const { data: meetingData, isLoading } = useMeeting(id || "");
  const { mutateAsync: createMeeting, isPending: isCreating } = useCreateMeeting();
  const { mutateAsync: updateMeeting, isPending: isUpdating } = useUpdateMeeting();

  const isSaving = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue
  } = useForm<FormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      time: "",
      type: "OFFLINE",
      location: "",
      meetingLink: "",
      status: "SCHEDULED",
      attendees: "",
      organizedBy: "",
    },
  });

  const watchType = watch("type");

  useEffect(() => {
    if (meetingData?.data) {
      const meeting = meetingData.data;
      reset({
        title: meeting.title || "",
        description: meeting.description || "",
        date: meeting.date ? new Date(meeting.date).toISOString().split("T")[0] : "",
        time: meeting.time || "",
        type: meeting.type || "OFFLINE",
        location: meeting.location || "",
        meetingLink: meeting.meetingLink || "",
        status: meeting.status || "SCHEDULED",
        attendees: meeting.attendees || "",
        organizedBy: meeting.organizedBy || "",
      });
    }
  }, [meetingData, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: any = {
        ...values,
        meetingLink: values.meetingLink || null,
      };
      
      if (isEditing) {
        if (!id) return;
        await updateMeeting({ id, payload });
      } else {
        await createMeeting(payload);
      }
      setLocation("/meetings");
    } catch (error) {
      console.error(error);
    }
  };

  if (isEditing && isLoading) {
    return (
      <MainLayout title="Edit Meeting">
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 mt-8" />
          <Skeleton className="h-48" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={isEditing ? "Edit Meeting" : "Schedule Meeting"}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Header Section */}
        <div className="flex items-center gap-3">
          <Link href="/meetings">
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
              <CalendarDays className="h-7 w-7 text-primary" />
              {isEditing ? "Edit Meeting" : "Schedule Meeting"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEditing ? `Editing meeting: ${meetingData?.data?.title}` : "Fill out details to schedule a new meeting"}
            </p>
          </div>
        </div>

        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Meeting Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Meeting Title <span className="text-destructive">*</span>
              </Label>
              <Input 
                {...register("title")} 
                placeholder="e.g. Monthly Development Review" 
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="date" {...register("date")} className="pl-10" />
                </div>
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="time" {...register("time")} className="pl-10" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Agenda / Description</Label>
              <Textarea 
                {...register("description")} 
                placeholder="Topics to discuss, preparation required, etc." 
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Format & Venue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select Format</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setValue("type", "OFFLINE")}
                  className={`flex items-center justify-center gap-2 p-4 border rounded-lg transition-all ${
                    watchType === "OFFLINE"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                  <span className="font-medium">Offline (Physical)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setValue("type", "ONLINE")}
                  className={`flex items-center justify-center gap-2 p-4 border rounded-lg transition-all ${
                    watchType === "ONLINE"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Video className="h-5 w-5" />
                  <span className="font-medium">Online (Virtual)</span>
                </button>
              </div>
            </div>

            {watchType === "ONLINE" ? (
              <div className="space-y-2 animate-in fade-in duration-300">
                <Label>Meeting Link</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    {...register("meetingLink")} 
                    placeholder="https://zoom.us/j/..." 
                    className="pl-10"
                  />
                </div>
                {errors.meetingLink && <p className="text-xs text-destructive">{errors.meetingLink.message}</p>}
              </div>
            ) : (
              <div className="space-y-2 animate-in fade-in duration-300">
                <Label>Physical Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    {...register("location")} 
                    placeholder="e.g. Secretariat Office, Hall B" 
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Management & Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEETING_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Organized By</Label>
                <Input {...register("organizedBy")} placeholder="e.g. Admin Team" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Attendees List</Label>
              <Input 
                {...register("attendees")} 
                placeholder="Comma separated names or roles..." 
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t font-medium">
          <Link href="/meetings">
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
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : isEditing ? "Update" : "Schedule"} Meeting
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}



