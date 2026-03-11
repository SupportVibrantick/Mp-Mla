import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ─── Category Metadata ──────────────────────────────────

export const INSTITUTION_CATEGORIES = [
  { value: "TEMPLE", label: "Temple", icon: "🛕", group: "Religious" },
  { value: "MOSQUE", label: "Mosque", icon: "🕌", group: "Religious" },
  { value: "GURUDWARA", label: "Gurudwara", icon: "🙏", group: "Religious" },
  { value: "CHURCH", label: "Church", icon: "⛪", group: "Religious" },
  { value: "HOSPITAL", label: "Hospital", icon: "🏥", group: "Health" },
  { value: "CLINIC", label: "Clinic", icon: "🩺", group: "Health" },
  { value: "SCHOOL", label: "School", icon: "🏫", group: "Education" },
  { value: "COLLEGE", label: "College", icon: "🎓", group: "Education" },
  { value: "UNIVERSITY", label: "University", icon: "🏛️", group: "Education" },
  {
    value: "COACHING_CENTER",
    label: "Coaching Center",
    icon: "📖",
    group: "Education",
  },
  {
    value: "POLICE_STATION",
    label: "Police Station",
    icon: "🚔",
    group: "Government",
  },
  {
    value: "GOVT_OFFICE",
    label: "Govt Office",
    icon: "🏢",
    group: "Government",
  },
  { value: "NGO", label: "NGO", icon: "🤝", group: "Social" },
  { value: "GYM", label: "Gym", icon: "💪", group: "Sports" },
  {
    value: "SPORTS_FACILITY",
    label: "Sports Facility",
    icon: "🏟️",
    group: "Sports",
  },
  {
    value: "COMMUNITY_HALL",
    label: "Community Hall",
    icon: "🏘️",
    group: "Public",
  },
  { value: "LIBRARY", label: "Library", icon: "📚", group: "Public" },
  { value: "MARKET", label: "Market", icon: "🏪", group: "Commercial" },
  { value: "RWA", label: "RWA Office", icon: "🏠", group: "Public" },
  { value: "OLD_AGE_HOME", label: "Old Age Home", icon: "🏡", group: "Social" },
  { value: "OTHER", label: "Other", icon: "🏗️", group: "Other" },
] as const;

export const INSTITUTION_STATUSES = [
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
    value: "UNDER_MAINTENANCE",
    label: "Under Maintenance",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    value: "CLOSED",
    label: "Closed",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    value: "PROPOSED",
    label: "Proposed",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
] as const;

export function getCategoryInfo(category: string) {
  return (
    INSTITUTION_CATEGORIES.find((c) => c.value === category) || {
      value: category,
      label: category.replace(/_/g, " "),
      icon: "🏗️",
      group: "Other",
    }
  );
}

export function getStatusInfo(status: string) {
  return (
    INSTITUTION_STATUSES.find((s) => s.value === status) ||
    INSTITUTION_STATUSES[0]
  );
}

// ─── Hooks ──────────────────────────────────────────────

export function useInstitutions(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["institutions", params],
    queryFn: () =>
      api.get("/admin/institutions", { params }).then((r) => r.data),
  });
}

export function useInstitutionStats(wardId?: string) {
  return useQuery({
    queryKey: ["institutions", "stats", wardId],
    queryFn: () =>
      api
        .get("/admin/institutions/stats", { params: wardId ? { wardId } : {} })
        .then((r) => r.data),
  });
}

export function useInstitution(id: string | undefined) {
  return useQuery({
    queryKey: ["institutions", id],
    queryFn: () => api.get(`/admin/institutions/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateInstitution() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) =>
      api.post("/admin/institutions", data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
      toast({ title: "Created", description: res.message });
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

export function useUpdateInstitution() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/admin/institutions/${id}`, data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
      toast({ title: "Updated", description: res.message });
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

export function useDeleteInstitution() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/institutions/${id}`).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
      toast({ title: "Deleted", description: res.message });
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

// ─── Bulk Import Hook ───────────────────────────────────

export function useBulkCreateInstitutions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any[]) =>
      api.post("/admin/institutions/bulk", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
    },
    onError: (err: any) => {
      throw new Error(
        err?.response?.data?.message || "Failed to bulk import institutions",
      );
    },
  });
}

// ─── Incharge Hooks ─────────────────────────────────────

export function useCreateIncharge() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      institutionId,
      data,
    }: {
      institutionId: string;
      data: any;
    }) =>
      api
        .post(`/admin/institutions/${institutionId}/incharges`, data)
        .then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
      toast({ title: "Added", description: res.message });
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

export function useUpdateIncharge() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      institutionId,
      inchargeId,
      data,
    }: {
      institutionId: string;
      inchargeId: string;
      data: any;
    }) =>
      api
        .put(
          `/admin/institutions/${institutionId}/incharges/${inchargeId}`,
          data,
        )
        .then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
      toast({ title: "Updated", description: res.message });
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

export function useDeleteIncharge() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      institutionId,
      inchargeId,
    }: {
      institutionId: string;
      inchargeId: string;
    }) =>
      api
        .delete(`/admin/institutions/${institutionId}/incharges/${inchargeId}`)
        .then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
      toast({ title: "Removed", description: res.message });
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

export function useToggleInchargeActive() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      institutionId,
      inchargeId,
    }: {
      institutionId: string;
      inchargeId: string;
    }) =>
      api
        .patch(
          `/admin/institutions/${institutionId}/incharges/${inchargeId}/toggle-active`,
        )
        .then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
      toast({ title: "Status Changed", description: res.message });
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
