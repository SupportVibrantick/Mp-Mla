import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

export const MEETING_STATUSES = [
  { value: "SCHEDULED", label: "Scheduled", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" }
];

export const getStatusInfo = (status: string) => {
  return MEETING_STATUSES.find((s) => s.value === status) || { label: status, color: "bg-gray-100 text-gray-800" };
};

export function useMeetings(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["meetings", params],
    queryFn: async () => {
      const { data } = await api.get("/admin/meetings", { params });
      return data;
    },
    staleTime: 0,
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ["meetings", id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/meetings/${id}`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post("/admin/meetings", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting scheduled successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to schedule meeting");
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/admin/meetings/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meetings", variables.id] });
      toast.success("Meeting updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update meeting");
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/meetings/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete meeting");
    },
  });
}

export function useMeetingStats() {
  return useQuery({
    queryKey: ["meetings", "stats"],
    queryFn: async () => {
      const { data } = await api.get("/admin/meetings/stats");
      return data;
    },
  });
}

