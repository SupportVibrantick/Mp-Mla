import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

export const EVENT_STATUSES = [
  { value: "SCHEDULED", label: "Scheduled", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  { value: "ACTIVE", label: "Active", color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" }
];

export const getEventStatusInfo = (status: string) => {
  return EVENT_STATUSES.find((s) => s.value === status) || { label: status, color: "bg-gray-100 text-gray-800" };
};

export function useEvents(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["events", params],
    queryFn: async () => {
      const { data } = await api.get("/admin/events", { params });
      return data;
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/events/${id}`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post("/admin/events", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create event");
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/admin/events/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.id] });
      toast.success("Event updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update event");
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/events/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete event");
    },
  });
}

export function useChangeEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/admin/events/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.id] });
      toast.success(`Event status updated to ${variables.status}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update event status");
    },
  });
}

export function useEventStats() {
  return useQuery({
    queryKey: ["events", "stats"],
    queryFn: async () => {
      const { data } = await api.get("/admin/events/stats");
      return data;
    },
  });
}

// ─── Team sub-routes ─────────────────────────────────────
export function useEventTeam(id: string) {
  return useQuery({
    queryKey: ["events", id, "team"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/events/${id}/team`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useAddEventTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/admin/events/${id}/team`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "team"] });
      toast.success("Team member added successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to add team member");
    },
  });
}

export function useRemoveEventTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data } = await api.delete(`/admin/events/${id}/team/${userId}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "team"] });
      toast.success("Team member removed successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to remove team member");
    },
  });
}

// ─── Agenda sub-routes ───────────────────────────────────
export function useEventAgenda(id: string) {
  return useQuery({
    queryKey: ["events", id, "agenda"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/events/${id}/agenda`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useCreateEventAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/admin/events/${id}/agenda`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "agenda"] });
      toast.success("Agenda item created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create agenda item");
    },
  });
}

export function useUpdateEventAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, agendaId, payload }: { id: string; agendaId: string; payload: any }) => {
      const { data } = await api.put(`/admin/events/${id}/agenda/${agendaId}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "agenda"] });
      toast.success("Agenda item updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update agenda item");
    },
  });
}

export function useDeleteEventAgendaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, agendaId }: { id: string; agendaId: string }) => {
      const { data } = await api.delete(`/admin/events/${id}/agenda/${agendaId}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "agenda"] });
      toast.success("Agenda item deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete agenda item");
    },
  });
}

// ─── Guest sub-routes ────────────────────────────────────
export function useEventGuests(id: string) {
  return useQuery({
    queryKey: ["events", id, "guests"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/events/${id}/guests`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useCreateEventGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/admin/events/${id}/guests`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "guests"] });
      toast.success("Guest added successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to add guest");
    },
  });
}

export function useUpdateEventGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, guestId, payload }: { id: string; guestId: string; payload: any }) => {
      const { data } = await api.put(`/admin/events/${id}/guests/${guestId}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "guests"] });
      toast.success("Guest details updated");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update guest details");
    },
  });
}

export function useDeleteEventGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, guestId }: { id: string; guestId: string }) => {
      const { data } = await api.delete(`/admin/events/${id}/guests/${guestId}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "guests"] });
      toast.success("Guest removed successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to remove guest");
    },
  });
}

// ─── Attendance sub-routes ───────────────────────────────
export function useEventAttendance(id: string) {
  return useQuery({
    queryKey: ["events", id, "attendance"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/events/${id}/attendance`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useRecordEventAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/admin/events/${id}/attendance`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "attendance"] });
      toast.success("Attendance recorded successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to record attendance");
    },
  });
}

export function useCheckInEventAttendee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, attendanceId }: { id: string; attendanceId: string }) => {
      const { data } = await api.post(`/admin/events/${id}/attendance/${attendanceId}/check-in`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "attendance"] });
      toast.success("Checked in successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to check in");
    },
  });
}

export function useCheckOutEventAttendee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, attendanceId }: { id: string; attendanceId: string }) => {
      const { data } = await api.post(`/admin/events/${id}/attendance/${attendanceId}/check-out`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "attendance"] });
      toast.success("Checked out successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to check out");
    },
  });
}

// ─── Media sub-routes ────────────────────────────────────
export function useEventMedia(id: string) {
  return useQuery({
    queryKey: ["events", id, "media"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/events/${id}/media`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useAddEventMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/admin/events/${id}/media`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "media"] });
      toast.success("Media added successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to add media");
    },
  });
}

export function useDeleteEventMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mediaId }: { id: string; mediaId: string }) => {
      const { data } = await api.delete(`/admin/events/${id}/media/${mediaId}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "media"] });
      toast.success("Media removed successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to remove media");
    },
  });
}

// ─── Report sub-routes ───────────────────────────────────
export function useEventReport(id: string) {
  return useQuery({
    queryKey: ["events", id, "report"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/events/${id}/report`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useUpsertEventReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/admin/events/${id}/report`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "report"] });
      toast.success("Event report saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to save event report");
    },
  });
}

// ─── Tasks sub-routes ────────────────────────────────────
export function useEventTasks(id: string) {
  return useQuery({
    queryKey: ["events", id, "tasks"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/events/${id}/tasks`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useCreateEventTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(`/admin/events/${id}/tasks`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events", variables.id, "tasks"] });
      toast.success("Event task created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create event task");
    },
  });
}

// ─── Timeline sub-route ──────────────────────────────────
export function useEventTimeline(id: string) {
  return useQuery({
    queryKey: ["events", id, "timeline"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/events/${id}/timeline`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}
