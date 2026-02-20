import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const SCHEME_STATUSES = [
  {
    value: "ACTIVE",
    label: "Active",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    value: "EXPIRED",
    label: "Expired",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  {
    value: "UPCOMING",
    label: "Upcoming",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    value: "SUSPENDED",
    label: "Suspended",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
] as const;

export const SCHEME_LEVELS = [
  { value: "Central", label: "Central", icon: "🏛️" },
  { value: "State", label: "State", icon: "🏢" },
  { value: "Local", label: "Local", icon: "🏘️" },
] as const;

export function getSchemeStatusInfo(s: string) {
  return SCHEME_STATUSES.find((x) => x.value === s) || SCHEME_STATUSES[0];
}

function useSchemeMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["schemes"] });
      toast({ title, description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed",
        variant: "destructive",
      });
    },
  });
}

export function useSchemes(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["schemes", params],
    queryFn: () => api.get("/admin/schemes", { params }).then((r) => r.data),
  });
}
export function useScheme(id?: string) {
  return useQuery({
    queryKey: ["schemes", id],
    queryFn: () => api.get(`/admin/schemes/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
export function useSchemeStats() {
  return useQuery({
    queryKey: ["schemes", "stats"],
    queryFn: () => api.get("/admin/schemes/stats").then((r) => r.data),
  });
}
export function useCreateScheme() {
  return useSchemeMut(
    (data) => api.post("/admin/schemes", data).then((r) => r.data),
    "Scheme Created",
  );
}
export function useUpdateScheme() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api.put(`/admin/schemes/${id}`, data).then((r) => r.data),
    "Scheme Updated",
  );
}
export function useDeleteScheme() {
  return useSchemeMut(
    (id: string) => api.delete(`/admin/schemes/${id}`).then((r) => r.data),
    "Scheme Deleted",
  );
}
export function useUpsertBeneficiary() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api.post(`/admin/schemes/${id}/beneficiaries`, data).then((r) => r.data),
    "Beneficiary Updated",
  );
}
export function useBulkBeneficiaries() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api
        .post(`/admin/schemes/${id}/beneficiaries/bulk`, data)
        .then((r) => r.data),
    "Bulk Updated",
  );
}
export function useDeleteBeneficiary() {
  return useSchemeMut(
    ({ id, bId }: any) =>
      api
        .delete(`/admin/schemes/${id}/beneficiaries/${bId}`)
        .then((r) => r.data),
    "Entry Removed",
  );
}
