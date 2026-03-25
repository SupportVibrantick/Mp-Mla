import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export type PublicFacilityCategory = {
  value: string;
  label: string;
  icon: string;
  group: string;
};

const IC = "/icons/institutions";
// ─── Category Metadata ──────────────────────────────────

export const PUBLIC_FACILITY_CATEGORIES: PublicFacilityCategory[] = [
  {
    value: "TEMPLE",
    label: "Temple",
    icon: `${IC}/temple.png`,
    group: "Religious",
  },
  {
    value: "MOSQUE",
    label: "Mosque",
    icon: `${IC}/mosque.png`,
    group: "Religious",
  },
  {
    value: "GURUDWARA",
    label: "Gurudwara",
    icon: `${IC}/gurudwara.png`,
    group: "Religious",
  },
  {
    value: "CHURCH",
    label: "Church",
    icon: `${IC}/church.png`,
    group: "Religious",
  },
  {
    value: "HOSPITAL",
    label: "Hospital",
    icon: `${IC}/hospital.png`,
    group: "Health",
  },
  {
    value: "CLINIC",
    label: "Clinic",
    icon: `${IC}/clinic.png`,
    group: "Health",
  },
  {
    value: "SCHOOL",
    label: "School",
    icon: `${IC}/school.png`,
    group: "Education",
  },
  {
    value: "COLLEGE",
    label: "College",
    icon: `${IC}/college.png`,
    group: "Education",
  },
  {
    value: "UNIVERSITY",
    label: "University",
    icon: `${IC}/university.png`,
    group: "Education",
  },
  {
    value: "COACHING_CENTER",
    label: "Coaching Center",
    icon: `${IC}/coaching.png`,
    group: "Education",
  },
  {
    value: "POLICE_STATION",
    label: "Police Station",
    icon: `${IC}/police.png`,
    group: "Government",
  },
  {
    value: "GOVT_OFFICE",
    label: "Govt Office",
    icon: `${IC}/govt-office.png`,
    group: "Government",
  },
  { value: "NGO", label: "NGO", icon: `${IC}/ngo.png`, group: "Social" },
  { value: "GYM", label: "Gym", icon: `${IC}/gym.png`, group: "Sports" },
  {
    value: "SPORTS_FACILITY",
    label: "Sports Facility",
    icon: `${IC}/sports.png`,
    group: "Sports",
  },
  {
    value: "COMMUNITY_HALL",
    label: "Community Hall",
    icon: `${IC}/community-hall.png`,
    group: "Public",
  },
  {
    value: "LIBRARY",
    label: "Library",
    icon: `${IC}/library.png`,
    group: "Public",
  },
  {
    value: "MARKET",
    label: "Market",
    icon: `${IC}/market.png`,
    group: "Commercial",
  },
  { value: "RWA", label: "RWA Office", icon: `${IC}/rwa.png`, group: "Public" },
  {
    value: "OLD_AGE_HOME",
    label: "Old Age Home",
    icon: `${IC}/old-age-home.png`,
    group: "Social",
  },
  { value: "OTHER", label: "Other", icon: `${IC}/other.png`, group: "Other" },
];
export const PUBLIC_FACILITY_STATUSES = [
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
    PUBLIC_FACILITY_CATEGORIES.find((c) => c.value === category) || {
      value: category,
      label: category.replace(/_/g, " "),
      icon: `${IC}/other.png`,
      group: "Other",
    }
  );
}

export function getStatusInfo(status: string) {
  return (
    PUBLIC_FACILITY_STATUSES.find((s) => s.value === status) ||
    PUBLIC_FACILITY_STATUSES[0]
  );
}

// ─── Hooks ──────────────────────────────────────────────

export function usePublicFacilities(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["institutions", params],
    queryFn: () =>
      api.get("/admin/institutions", { params }).then((r) => r.data),
    staleTime: 0,
  });
}

export function usePublicFacilityStats(wardId?: string) {
  return useQuery({
    queryKey: ["institutions", "stats", wardId],
    queryFn: () =>
      api
        .get("/admin/institutions/stats", { params: wardId ? { wardId } : {} })
        .then((r) => r.data),
  });
}

export function usePublicFacility(id: string | undefined) {
  return useQuery({
    queryKey: ["institutions", id],
    queryFn: () => api.get(`/admin/institutions/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePublicFacility() {
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

export function useUpdatePublicFacility() {
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

export function useDeletePublicFacility() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/institutions/${id}`).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
      toast({ title: "Moved to Recycle Bin", description: res.message });
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

export function useBulkCreatePublicFacilities() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any[]) =>
      api.post("/admin/institutions/bulk", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["institutions"] });
    },
    onError: (err: any) => {
      throw new Error(
        err?.response?.data?.message || "Failed to bulk import public facilities",
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
      publicFacilityId,
      data,
    }: {
      publicFacilityId: string;
      data: any;
    }) =>
      api
        .post(`/admin/institutions/${publicFacilityId}/incharges`, data)
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
      publicFacilityId,
      inchargeId,
      data,
    }: {
      publicFacilityId: string;
      inchargeId: string;
      data: any;
    }) =>
      api
        .put(
          `/admin/institutions/${publicFacilityId}/incharges/${inchargeId}`,
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
      publicFacilityId,
      inchargeId,
    }: {
      publicFacilityId: string;
      inchargeId: string;
    }) =>
      api
        .delete(`/admin/institutions/${publicFacilityId}/incharges/${inchargeId}`)
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
      publicFacilityId,
      inchargeId,
    }: {
      publicFacilityId: string;
      inchargeId: string;
    }) =>
      api
        .patch(
          `/admin/institutions/${publicFacilityId}/incharges/${inchargeId}/toggle-active`,
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
