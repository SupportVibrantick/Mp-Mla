import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { wardsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────

export interface WardArea {
  id: string;
  wardId: string;
  name: string;
  areaType: string;
  population: number;
  households: number;
  maleCount: number;
  femaleCount: number;
  pincode?: string;
  landmark?: string;
  description?: string;
  isActive: boolean;
}

export interface WardCouncillor {
  id: string;
  wardId: string;
  name: string;
  phone?: string;
  email?: string;
  partyName?: string;
  photoUrl?: string;
  designation: string;
  sinceDate?: string;
  untilDate?: string;
  isCurrent: boolean;
}

export interface Ward {
  id: string;
  wardNumber: number;
  name: string;
  zone?: string;
  status: string;
  areaType: string;
  totalPopulation: number;
  totalHouseholds: number;
  totalAreas: number;
  totalMale: number;
  totalFemale: number;
  pincode?: string;
  description?: string;
  establishedDate?: string;
  areas: WardArea[];
  councillors: WardCouncillor[];
  _count: {
    institutions: number;
    grievances: number;
    projects: number;
    communityGroups: number;
    demographics: number;
  };
  // computed in detail
  currentCouncillor?: WardCouncillor | null;
  grievanceStats?: { status: string; count: number }[];
  projectStats?: { status: string; count: number }[];
  communityGroupStats?: { type: string; count: number; totalMembers: number }[];
  demographics?: any;
}

// ─── List Wards ─────────────────────────────────────────

export function useWards(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["wards", params],
    queryFn: () => wardsApi.list(params).then((r) => r.data),
  });
}

// ─── Ward Stats ─────────────────────────────────────────

export function useWardStats() {
  return useQuery({
    queryKey: ["wards", "stats"],
    queryFn: () => wardsApi.stats().then((r) => r.data),
  });
}

// ─── Single Ward ────────────────────────────────────────

export function useWard(id: string | undefined) {
  return useQuery({
    queryKey: ["wards", id],
    queryFn: () => wardsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });
}

// ─── Create Ward ────────────────────────────────────────

export function useCreateWard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) =>
      api.post("/admin/wards", data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["wards"] });
      toast({ title: "Ward Created", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to create ward",
        variant: "destructive",
      });
    },
  });
}

// ─── Update Ward ────────────────────────────────────────

export function useUpdateWard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/admin/wards/${id}`, data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["wards"] });
      toast({ title: "Ward Updated", description: res.message });
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

// ─── Delete Ward ────────────────────────────────────────

export function useDeleteWard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/wards/${id}`).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["wards"] });
      toast({ title: "Ward Deleted", description: res.message });
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

// ─── Ward Areas ─────────────────────────────────────────

export function useWardAreas(wardId: string | undefined) {
  return useQuery({
    queryKey: ["wards", wardId, "areas"],
    queryFn: () => api.get(`/admin/wards/${wardId}/areas`).then((r) => r.data),
    enabled: !!wardId,
  });
}

export function useCreateArea() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ wardId, data }: { wardId: string; data: any }) =>
      api.post(`/admin/wards/${wardId}/areas`, data).then((r) => r.data),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["wards"] });
      toast({ title: "Area Added", description: res.message });
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

export function useUpdateArea() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      wardId,
      areaId,
      data,
    }: {
      wardId: string;
      areaId: string;
      data: any;
    }) =>
      api
        .put(`/admin/wards/${wardId}/areas/${areaId}`, data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wards"] });
      toast({ title: "Area Updated" });
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

export function useDeleteArea() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ wardId, areaId }: { wardId: string; areaId: string }) =>
      api.delete(`/admin/wards/${wardId}/areas/${areaId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wards"] });
      toast({ title: "Area Deleted" });
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

// ─── Ward Councillors ───────────────────────────────────

export function useWardCouncillors(wardId: string | undefined) {
  return useQuery({
    queryKey: ["wards", wardId, "councillors"],
    queryFn: () =>
      api.get(`/admin/wards/${wardId}/councillors`).then((r) => r.data),
    enabled: !!wardId,
  });
}

export function useCreateCouncillor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ wardId, data }: { wardId: string; data: any }) =>
      api.post(`/admin/wards/${wardId}/councillors`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wards"] });
      toast({ title: "Councillor Assigned" });
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

export function useUpdateCouncillor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      wardId,
      councillorId,
      data,
    }: {
      wardId: string;
      councillorId: string;
      data: any;
    }) =>
      api
        .put(`/admin/wards/${wardId}/councillors/${councillorId}`, data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wards"] });
      toast({ title: "Councillor Updated" });
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

// ─── Ward Demographics ──────────────────────────────────

export function useWardDemographics(wardId: string | undefined) {
  return useQuery({
    queryKey: ["wards", wardId, "demographics"],
    queryFn: () =>
      api.get(`/admin/wards/${wardId}/demographics`).then((r) => r.data),
    enabled: !!wardId,
  });
}
