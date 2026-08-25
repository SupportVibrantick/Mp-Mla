import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

export const APPOINTMENT_STATUSES = [
  { value: "PENDING", label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/30" },
  { value: "APPROVED", label: "Approved", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30" },
  { value: "REJECTED", label: "Rejected", color: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30" },
  { value: "RESCHEDULED", label: "Rescheduled", color: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800/30" }
];

export const getStatusInfo = (status: string) => {
  return APPOINTMENT_STATUSES.find((s) => s.value === status) || { label: status, color: "bg-gray-100 text-gray-800" };
};

export function useAppointments(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: async () => {
      const { data } = await api.get("/admin/appointments", { params });
      return data;
    },
    staleTime: 0,
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ["appointments", id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/appointments/${id}`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post("/admin/appointments", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create appointment");
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/admin/appointments/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.id] });
      toast.success("Appointment updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update appointment");
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/appointments/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete appointment");
    },
  });
}

export function useAppointmentStats() {
  return useQuery({
    queryKey: ["appointments", "stats"],
    queryFn: async () => {
      const { data } = await api.get("/admin/appointments/stats");
      return data;
    },
  });
}

export function useApproveAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.patch(`/admin/appointments/${id}/approve`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.id] });
      toast.success("Appointment approved");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to approve appointment");
    },
  });
}

export function useRejectAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.patch(`/admin/appointments/${id}/reject`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.id] });
      toast.success("Appointment rejected");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to reject appointment");
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.patch(`/admin/appointments/${id}/reschedule`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.id] });
      toast.success("Appointment rescheduled");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to reschedule appointment");
    },
  });
}

export function useCompleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.patch(`/admin/appointments/${id}/complete`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.id] });
      toast.success("Appointment marked as completed");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to complete appointment");
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.patch(`/admin/appointments/${id}/cancel`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.id] });
      toast.success("Appointment cancelled");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to cancel appointment");
    },
  });
}
