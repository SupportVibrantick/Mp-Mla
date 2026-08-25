import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const CONTACT_CATEGORIES = [
  { value: "CITIZEN", label: "Citizen" },
  { value: "COMMUNITY_LEADER", label: "Community Leader" },
  { value: "ORGANIZATION", label: "Organization" },
  { value: "NGO", label: "NGO" },
  { value: "OFFICIAL", label: "Official" },
  { value: "BUSINESS", label: "Business" },
  { value: "MEDIA", label: "Media" },
  { value: "OTHER", label: "Other" },
] as const;

export const INTERACTION_CHANNELS = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "OFFICE_VISIT", label: "Office Visit" },
  { value: "LETTER", label: "Letter" },
  { value: "MEETING", label: "Meeting" },
  { value: "OTHER", label: "Other" },
] as const;

export const FOLLOW_UP_STATUSES = [
  { value: "PENDING", label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
] as const;

export function getFollowUpStatusInfo(s: string) {
  return FOLLOW_UP_STATUSES.find((x) => x.value === s) || FOLLOW_UP_STATUSES[0];
}

function useCrmMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["crm"] });
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

// ─── Contacts ───
export function useContacts(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["crm", "contacts", params],
    queryFn: () => api.get("/admin/crm/contacts", { params }).then((r) => r.data),
  });
}
export function useContact(id?: string) {
  return useQuery({
    queryKey: ["crm", "contacts", id],
    queryFn: () => api.get(`/admin/crm/contacts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
export function useCreateContact() {
  return useCrmMut(
    (data) => api.post("/admin/crm/contacts", data).then((r) => r.data),
    "Contact Created",
  );
}
export function useUpdateContact() {
  return useCrmMut(
    ({ id, data }: any) =>
      api.put(`/admin/crm/contacts/${id}`, data).then((r) => r.data),
    "Contact Updated",
  );
}
export function useDeleteContact() {
  return useCrmMut(
    (id: string) => api.delete(`/admin/crm/contacts/${id}`).then((r) => r.data),
    "Contact Deleted",
  );
}

// ─── Interactions ───
export function useContactInteractions(contactId?: string) {
  return useQuery({
    queryKey: ["crm", "contacts", contactId, "interactions"],
    queryFn: () => api.get(`/admin/crm/contacts/${contactId}/interactions`).then((r) => r.data),
    enabled: !!contactId,
  });
}
export function useCreateInteraction() {
  return useCrmMut(
    ({ contactId, data }: any) =>
      api.post(`/admin/crm/contacts/${contactId}/interactions`, data).then((r) => r.data),
    "Interaction Logged",
  );
}

// ─── Timeline ───
export function useContactTimeline(contactId?: string) {
  return useQuery({
    queryKey: ["crm", "contacts", contactId, "timeline"],
    queryFn: () => api.get(`/admin/crm/contacts/${contactId}/timeline`).then((r) => r.data),
    enabled: !!contactId,
  });
}

// ─── Follow-ups ───
export function useContactFollowUps(contactId?: string) {
  return useQuery({
    queryKey: ["crm", "contacts", contactId, "followups"],
    queryFn: () => api.get(`/admin/crm/contacts/${contactId}/followups`).then((r) => r.data),
    enabled: !!contactId,
  });
}
export function useCreateFollowUp() {
  return useCrmMut(
    ({ contactId, data }: any) =>
      api.post(`/admin/crm/contacts/${contactId}/followups`, data).then((r) => r.data),
    "Follow-up Scheduled",
  );
}
export function useUpdateFollowUp() {
  return useCrmMut(
    ({ followUpId, data }: any) =>
      api.put(`/admin/crm/followups/${followUpId}`, data).then((r) => r.data),
    "Follow-up Updated",
  );
}
export function useTransitionFollowUpStatus() {
  return useCrmMut(
    ({ followUpId, data }: any) =>
      api.patch(`/admin/crm/followups/${followUpId}/status`, data).then((r) => r.data),
    "Status Updated",
  );
}