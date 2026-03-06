import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { grievancesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ─── Constants ──────────────────────────────────────────

export const GRIEVANCE_STATUSES = [
  {
    value: "OPEN",
    label: "Open",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  {
    value: "ESCALATED",
    label: "Escalated",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
  {
    value: "RESOLVED",
    label: "Resolved",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    dot: "bg-green-500",
  },
  {
    value: "CLOSED",
    label: "Closed",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-500",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
    dot: "bg-rose-500",
  },
] as const;

export const PRIORITIES = [
  {
    value: "URGENT",
    label: "Urgent",
    color: "bg-red-600 text-white",
    icon: "🔴",
  },
  {
    value: "HIGH",
    label: "High",
    color: "bg-orange-100 text-orange-800",
    icon: "🟠",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    color: "bg-yellow-100 text-yellow-800",
    icon: "🟡",
  },
  {
    value: "LOW",
    label: "Low",
    color: "bg-green-100 text-green-800",
    icon: "🟢",
  },
] as const;

export const CATEGORIES = [
  { value: "ROAD", label: "Roads & Footpath", icon: "🛣️" },
  { value: "WATER", label: "Water Supply", icon: "💧" },
  { value: "ELECTRICITY", label: "Electricity", icon: "⚡" },
  { value: "SANITATION", label: "Sanitation", icon: "🧹" },
  { value: "ENCROACHMENT", label: "Encroachment", icon: "🚧" },
  { value: "NOISE", label: "Noise & Pollution", icon: "🔊" },
  { value: "HOUSING", label: "Housing", icon: "🏠" },
  { value: "PENSION", label: "Pension & Welfare", icon: "💰" },
  { value: "EDUCATION", label: "Education", icon: "📚" },
  { value: "HEALTH", label: "Health", icon: "🏥" },
  { value: "SAFETY", label: "Law & Safety", icon: "🛡️" },
  {
    value: "CERTIFICATE",
    label: "Certificates",
    icon: "📄",
  },
  { value: "OTHER", label: "Other", icon: "📋" },
] as const;

export const SOURCES = [
  { value: "OFFICE", label: "Office Visit" },
  { value: "PHONE", label: "Phone Call" },
  { value: "EMAIL", label: "Email" },
  { value: "ONLINE", label: "Online Portal" },
  { value: "FIELD_VISIT", label: "Field Visit" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
] as const;

export const TIMELINE_ACTIONS = [
  { value: "COMMENT", label: "💬 Comment" },
  { value: "INTERNAL_NOTE", label: "📝 Internal Note" },
  { value: "FOLLOW_UP", label: "📞 Follow-up" },
  { value: "FIELD_VISIT", label: "📍 Field Visit" },
] as const;

// Valid next statuses from current
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "ESCALATED", "REJECTED", "CLOSED"],
  IN_PROGRESS: ["ESCALATED", "RESOLVED", "OPEN", "REJECTED"],
  ESCALATED: ["IN_PROGRESS", "RESOLVED", "OPEN", "REJECTED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS", "OPEN"],
  REJECTED: ["OPEN"],
  CLOSED: ["OPEN"],
};

// ─── Helpers ────────────────────────────────────────────

export function getStatusInfo(s: string) {
  return (
    GRIEVANCE_STATUSES.find((st) => st.value === s) || GRIEVANCE_STATUSES[0]
  );
}
export function getPriorityInfo(p: string) {
  return PRIORITIES.find((pr) => pr.value === p) || PRIORITIES[2];
}
export function getCategoryInfo(c: string) {
  return (
    CATEGORIES.find((ct) => ct.value === c) || CATEGORIES[CATEGORIES.length - 1]
  );
}

// ─── Hooks ──────────────────────────────────────────────

export function useGrievances(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["grievances", params],
    queryFn: () => grievancesApi.list(params).then((r) => r.data),
  });
}

export function useGrievance(id: string | undefined) {
  return useQuery({
    queryKey: ["grievances", id],
    queryFn: () => grievancesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useGrievanceStats(wardId?: string) {
  return useQuery({
    queryKey: ["grievances", "stats", wardId],
    queryFn: () => grievancesApi.stats(wardId).then((r) => r.data),
  });
}

export function useGrievanceAnalytics(months?: number) {
  return useQuery({
    queryKey: ["grievances", "analytics", months],
    queryFn: () => grievancesApi.analytics(months).then((r) => r.data),
  });
}

// Mutation factory
function useGrievanceMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
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

export function useCreateGrievance() {
  return useGrievanceMut(
    (data) => grievancesApi.create(data).then((r) => r.data),
    "Created",
  );
}

export function useUpdateGrievance() {
  return useGrievanceMut(
    ({ id, data }: { id: string; data: any }) =>
      grievancesApi.update(id, data).then((r) => r.data),
    "Updated",
  );
}

export function useChangeGrievanceStatus() {
  return useGrievanceMut(
    ({ id, data }: { id: string; data: any }) =>
      grievancesApi.changeStatus(id, data).then((r) => r.data),
    "Status Changed",
  );
}

export function useAssignGrievance() {
  return useGrievanceMut(
    ({ id, data }: { id: string; data: any }) =>
      grievancesApi.assign(id, data).then((r) => r.data),
    "Assigned",
  );
}

export function useAddGrievanceTimeline() {
  return useGrievanceMut(
    ({ id, data }: { id: string; data: any }) =>
      grievancesApi.addTimeline(id, data).then((r) => r.data),
    "Comment Added",
  );
}

export function useDeleteGrievance() {
  return useGrievanceMut(
    (id: string) => grievancesApi.delete(id).then((r) => r.data),
    "Deleted",
  );
}
