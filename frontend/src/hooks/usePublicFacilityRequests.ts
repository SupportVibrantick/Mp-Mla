import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ─── Admin hooks (authenticated) ────────────────────────

export function usePublicFacilityRequests(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["institution-requests", params],
    queryFn: () =>
      api.get("/admin/institutions/requests", { params }).then((r) => r.data),
  });
}

export function usePublicFacilityRequest(id: string | undefined) {
  return useQuery({
    queryKey: ["institution-requests", id],
    queryFn: () =>
      api.get(`/admin/institutions/requests/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(`/admin/institutions/requests/${id}/approve`)
        .then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institution-requests"] });
      qc.invalidateQueries({ queryKey: ["institutions"] });
      toast({ title: "Approved", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to approve",
        variant: "destructive",
      });
    },
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api
        .patch(`/admin/institutions/requests/${id}/reject`, { reason })
        .then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institution-requests"] });
      toast({ title: "Rejected", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to reject",
        variant: "destructive",
      });
    },
  });
}

// ─── Public hooks (no auth) ─────────────────────────────

export function usePublicWards() {
  return useQuery({
    queryKey: ["public-wards"],
    queryFn: () => api.get("/public/wards").then((r) => r.data),
  });
}

export function useSubmitPublicFacilityRequest() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api
        .post("/public/institution-requests", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data),
    onSuccess: (res) => {
      toast({
        title: "Submitted!",
        description: res.message,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err?.response?.data?.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });
}
