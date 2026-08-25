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
    value: "INACTIVE",
    label: "Inactive",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  {
    value: "UPCOMING",
    label: "Upcoming",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    value: "EXPIRED",
    label: "Expired",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
] as const;

export const SCHEME_LEVELS = [
  { value: "CENTRAL", label: "Central", icon: "🏛️" },
  { value: "STATE", label: "State", icon: "🏢" },
  { value: "LOCAL", label: "Local", icon: "🏘️" },
] as const;

export const SCHEME_APPLICATION_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  { value: "SUBMITTED", label: "Submitted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "UNDER_REVIEW", label: "Under Review", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "DOCUMENT_PENDING", label: "Document Pending", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "APPROVED", label: "Approved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
] as const;

export function getSchemeStatusInfo(s: string) {
  return SCHEME_STATUSES.find((x) => x.value === s) || SCHEME_STATUSES[0];
}

export function getSchemeApplicationStatusInfo(s: string) {
  return SCHEME_APPLICATION_STATUSES.find((x) => x.value === s) || SCHEME_APPLICATION_STATUSES[0];
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

// ─── Schemes ───
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

// ─── Scheme Applications ───
export function useSchemeApplications(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["scheme-applications", params],
    queryFn: () => api.get("/admin/schemes/applications/all", { params }).then((r) => r.data),
  });
}
export function useSchemeApplication(id?: string) {
  return useQuery({
    queryKey: ["scheme-applications", id],
    queryFn: () => api.get(`/admin/schemes/applications/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
export function useCreateSchemeApplication() {
  return useSchemeMut(
    (data) => api.post("/admin/schemes/applications", data).then((r) => r.data),
    "Application Created",
  );
}
export function useUpdateSchemeApplication() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api.put(`/admin/schemes/applications/${id}`, data).then((r) => r.data),
    "Application Updated",
  );
}
export function useUpdateSchemeApplicationStatus() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api.patch(`/admin/schemes/applications/${id}/status`, data).then((r) => r.data),
    "Status Updated",
  );
}
export function useAssignSchemeApplication() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api.patch(`/admin/schemes/applications/${id}/assign`, data).then((r) => r.data),
    "Application Assigned",
  );
}
export function useUpdateSchemeApplicationFollowUp() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api.patch(`/admin/schemes/applications/${id}/follow-up`, data).then((r) => r.data),
    "Follow-up Updated",
  );
}
export function useCreateTaskFromApplication() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api.post(`/admin/schemes/applications/${id}/create-task`, data).then((r) => r.data),
    "Task Created",
  );
}
export function useCreateGrievanceFromApplication() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api.post(`/admin/schemes/applications/${id}/create-grievance`, data).then((r) => r.data),
    "Grievance Created",
  );
}
export function useUploadApplicationDocument() {
  return useSchemeMut(
    ({ id, data }: any) =>
      api.post(`/admin/schemes/applications/${id}/documents`, data).then((r) => r.data),
    "Document Uploaded",
  );
}
export function useListApplicationDocuments(id?: string) {
  return useQuery({
    queryKey: ["scheme-applications", id, "documents"],
    queryFn: () => api.get(`/admin/schemes/applications/${id}/documents`).then((r) => r.data),
    enabled: !!id,
  });
}
export function useDeleteApplicationDocument() {
  return useSchemeMut(
    (documentId: string) =>
      api.delete(`/admin/schemes/applications/documents/${documentId}`).then((r) => r.data),
    "Document Deleted",
  );
}