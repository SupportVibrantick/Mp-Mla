import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

export const DARBAR_STATUSES = [
  {
    value: "SCHEDULED",
    label: "Scheduled",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    value: "ONGOING",
    label: "Active",
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    color: "bg-green-100 text-green-800 border-green-200",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
  },
];

export const TOKEN_STATUSES = [
  { value: "WAITING", label: "Waiting", color: "bg-slate-100 text-slate-800" },
  { value: "CALLED", label: "Called", color: "bg-blue-100 text-blue-800" },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    color: "bg-amber-100 text-amber-800",
  },
  {
    value: "RESOLVED",
    label: "Resolved",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "REFERRED",
    label: "Referred",
    color: "bg-indigo-100 text-indigo-800",
  },
  { value: "ABSENT", label: "Absent", color: "bg-rose-100 text-rose-800" },
];

export const getDarbarStatusInfo = (status: string) => {
  return (
    DARBAR_STATUSES.find((s) => s.value === status) || {
      label: status,
      color: "bg-gray-100 text-gray-800",
    }
  );
};

export const getTokenStatusInfo = (status: string) => {
  return (
    TOKEN_STATUSES.find((s) => s.value === status) || {
      label: status,
      color: "bg-gray-100 text-gray-800",
    }
  );
};

export function useJanataSessions(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["janataSessions", params],
    queryFn: async () => {
      const { data } = await api.get("/admin/janata-darbar", { params });
      return data;
    },
  });
}

export function useJanataSession(id: string) {
  return useQuery({
    queryKey: ["janataSessions", id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/janata-darbar/${id}`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useCreateJanataSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post("/admin/janata-darbar", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["janataSessions"] });
      toast.success("Janata Darbar session created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create session");
    },
  });
}

export function useUpdateJanataSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.put(`/admin/janata-darbar/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["janataSessions"] });
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id],
      });
      toast.success("Session updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update session");
    },
  });
}

export function useDeleteJanataSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/admin/janata-darbar/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["janataSessions"] });
      toast.success("Session deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete session");
    },
  });
}

export function useTransitionJanataSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/admin/janata-darbar/${id}/status`, {
        status,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["janataSessions"] });
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id],
      });
      toast.success(`Session status updated to ${variables.status}`);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || "Failed to update session status",
      );
    },
  });
}

export function useJanataSessionStats(id: string) {
  return useQuery({
    queryKey: ["janataSessions", id, "stats"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/janata-darbar/${id}/stats`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

// ─── Token Queue Management ──────────────────────────────
export function useJanataQueue(id: string) {
  return useQuery({
    queryKey: ["janataSessions", id, "queue"],
    queryFn: async () => {
      const { data } = await api.get(`/admin/janata-darbar/${id}/queue`);
      return data;
    },
    enabled: !!id && id !== "new",
  });
}

export function useRegisterVisitorToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await api.post(
        `/admin/janata-darbar/${id}/tokens`,
        payload,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "stats"],
      });
      toast.success("Visitor token registered successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || "Failed to register visitor token",
      );
    },
  });
}

export function useCallVisitorToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tokenId }: { id: string; tokenId: string }) => {
      const { data } = await api.patch(
        `/admin/janata-darbar/${id}/tokens/${tokenId}/call`,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "queue"],
      });
      toast.success("Token called");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to call token");
    },
  });
}

export function useStartVisitorToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tokenId }: { id: string; tokenId: string }) => {
      const { data } = await api.patch(
        `/admin/janata-darbar/${id}/tokens/${tokenId}/start`,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "queue"],
      });
      toast.success("Interview started");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to start interview");
    },
  });
}

export function useResolveVisitorToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tokenId }: { id: string; tokenId: string }) => {
      const { data } = await api.patch(
        `/admin/janata-darbar/${id}/tokens/${tokenId}/resolve`,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "stats"],
      });
      toast.success("Token resolved");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to resolve token");
    },
  });
}

export function useReferVisitorToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      tokenId,
      payload,
    }: {
      id: string;
      tokenId: string;
      payload: any;
    }) => {
      const { data } = await api.patch(
        `/admin/janata-darbar/${id}/tokens/${tokenId}/refer`,
        payload,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "stats"],
      });
      toast.success("Token referred successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to refer token");
    },
  });
}

export function useMarkVisitorAbsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tokenId }: { id: string; tokenId: string }) => {
      const { data } = await api.patch(
        `/admin/janata-darbar/${id}/tokens/${tokenId}/absent`,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["janataSessions", variables.id, "stats"],
      });
      toast.success("Visitor marked absent");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to mark absent");
    },
  });
}

// ─── Actions integration ─────────────────────────────────
export function useCreateGrievanceFromToken() {
  return useMutation({
    mutationFn: async ({ id, tokenId }: { id: string; tokenId: string }) => {
      const { data } = await api.post(
        `/admin/janata-darbar/${id}/tokens/${tokenId}/grievance`,
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Grievance created from token successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create grievance");
    },
  });
}

export function useCreateTaskFromToken() {
  return useMutation({
    mutationFn: async ({
      id,
      tokenId,
      payload,
    }: {
      id: string;
      tokenId: string;
      payload?: any;
    }) => {
      const { data } = await api.post(
        `/admin/janata-darbar/${id}/tokens/${tokenId}/task`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      toast.success("Task created from token successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create task");
    },
  });
}
