import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const DOCUMENT_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "GRIEVANCE", label: "Grievance" },
  { value: "PROJECT", label: "Project" },
  { value: "SCHEME", label: "Scheme" },
  { value: "EVENT", label: "Event" },
  { value: "MEETING", label: "Meeting" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "LETTER", label: "Letter" },
  { value: "APPLICATION", label: "Application" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "LEGAL", label: "Legal" },
  { value: "REPORT", label: "Report" },
  { value: "OTHER", label: "Other" },
] as const;

export const DOCUMENT_LINK_MODULES = [
  { value: "GRIEVANCE", label: "Grievance" },
  { value: "PROJECT", label: "Project" },
  { value: "SCHEME_APPLICATION", label: "Scheme Application" },
  { value: "EVENT", label: "Event" },
  { value: "APPOINTMENT", label: "Appointment" },
  { value: "TASK", label: "Task" },
] as const;

function useDocMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
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

// ─── Documents ───
export function useDocuments(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["documents", params],
    queryFn: () => api.get("/admin/documents", { params }).then((r) => r.data),
  });
}
export function useDocument(id?: string) {
  return useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.get(`/admin/documents/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
export function useDocumentStats() {
  return useQuery({
    queryKey: ["documents", "stats"],
    queryFn: () => api.get("/admin/documents/stats").then((r) => r.data),
  });
}
export function useCreateDocument() {
  return useDocMut(
    (data) => api.post("/admin/documents", data).then((r) => r.data),
    "Document Uploaded",
  );
}
export function useUpdateDocument() {
  return useDocMut(
    ({ id, data }: any) =>
      api.put(`/admin/documents/${id}`, data).then((r) => r.data),
    "Document Updated",
  );
}
export function useDeleteDocument() {
  return useDocMut(
    (id: string) => api.delete(`/admin/documents/${id}`).then((r) => r.data),
    "Document Deleted",
  );
}
export function useRestoreDocument() {
  return useDocMut(
    (id: string) => api.post(`/admin/documents/${id}/restore`).then((r) => r.data),
    "Document Restored",
  );
}
export function useDownloadDocument() {
  return useDocMut(
    (id: string) => api.get(`/admin/documents/${id}/download`).then((r) => r.data),
    "Download Authorized",
  );
}

// ─── Versions ───
export function useDocumentVersions(id?: string) {
  return useQuery({
    queryKey: ["documents", id, "versions"],
    queryFn: () => api.get(`/admin/documents/${id}/versions`).then((r) => r.data),
    enabled: !!id,
  });
}
export function useUploadDocumentVersion() {
  return useDocMut(
    ({ id, data }: any) =>
      api.post(`/admin/documents/${id}/versions`, data).then((r) => r.data),
    "Version Uploaded",
  );
}

// ─── Links ───
export function useLinkDocument() {
  return useDocMut(
    ({ id, data }: any) =>
      api.post(`/admin/documents/${id}/link`, data).then((r) => r.data),
    "Document Linked",
  );
}
export function useUnlinkDocument() {
  return useDocMut(
    ({ id, linkId }: any) =>
      api.delete(`/admin/documents/${id}/link/${linkId}`).then((r) => r.data),
    "Document Unlinked",
  );
}