import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────

// communityTypes.ts
import {
  Store,
  Home,
  Dumbbell,
  Palette,
  Building2,
  Users,
  UserRound,
  GraduationCap,
  Sparkles,
  Handshake,
  PartyPopper,
  Hammer,
  CircleEllipsis,
} from "lucide-react";

export const COMMUNITY_TYPES = [
  { value: "MARKET", label: "Market Association", icon: Store },
  { value: "SLUM", label: "Slum Committee", icon: Home },
  { value: "SPORTS_TEAM", label: "Sports Team", icon: Dumbbell }, // or Trophy
  { value: "CLUB", label: "Club", icon: Palette }, // arts/culture club
  { value: "RWA", label: "RWA", icon: Building2 },
  { value: "SENIOR_CITIZEN", label: "Senior Citizens", icon: UserRound },
  { value: "BUDDHIJEEVI", label: "Buddhijeevi", icon: GraduationCap },
  { value: "WOMEN_GROUP", label: "Women Group", icon: Users },
  { value: "YOUTH_GROUP", label: "Youth Group", icon: Users },
  { value: "CULTURAL_ORG", label: "Cultural Org", icon: Sparkles },
  { value: "NGO", label: "NGO", icon: Handshake },
  {
    value: "FESTIVAL_COMMITTEE",
    label: "Festival Committee",
    icon: PartyPopper,
  },
  { value: "TRADE_UNION", label: "Trade Union", icon: Hammer },
  { value: "OTHER", label: "Other", icon: CircleEllipsis },
] as const;

export function getTypeInfo(type: string) {
  return (
    COMMUNITY_TYPES.find((t) => t.value === type) || {
      value: type,
      label: type.replace("_", " "),
      icon: "📋",
    }
  );
}

export interface CommunityGroup {
  id: string;
  name: string;
  type: string;
  wardId: string;
  wardAreaId?: string | null;
  address?: string;
  description?: string;
  memberCount: number;
  maleMembers: number;
  femaleMembers: number;
  headName?: string;
  headPhone?: string;
  headEmail?: string;
  headDesignation?: string;
  headPhotoUrl?: string;
  foundedDate?: string;
  registrationNo?: string;
  isActive: boolean;
  createdAt: string;
  ward: { id: string; name: string; wardNumber: number; zone?: string };
  wardArea?: { id: string; name: string; areaType: string } | null;
}

// ─── List ───────────────────────────────────────────────

export function useCommunityGroups(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["community-groups", params],
    queryFn: () =>
      api.get("/admin/community-groups", { params }).then((r) => r.data),
  });
}

// ─── Stats ──────────────────────────────────────────────

export function useCommunityGroupStats(wardId?: string) {
  return useQuery({
    queryKey: ["community-groups", "stats", wardId],
    queryFn: () =>
      api
        .get("/admin/community-groups/stats", {
          params: wardId ? { wardId } : {},
        })
        .then((r) => r.data),
  });
}

// ─── Single ─────────────────────────────────────────────

export function useCommunityGroup(id: string | undefined) {
  return useQuery({
    queryKey: ["community-groups", id],
    queryFn: () => api.get(`/admin/community-groups/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

// ─── Create ─────────────────────────────────────────────

export function useCreateCommunityGroup() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) =>
      api.post("/admin/community-groups", data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["community-groups"] });
      toast({ title: "Created", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to create",
        variant: "destructive",
      });
    },
  });
}

// ─── Update ─────────────────────────────────────────────

export function useUpdateCommunityGroup() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/admin/community-groups/${id}`, data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["community-groups"] });
      toast({ title: "Updated", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update",
        variant: "destructive",
      });
    },
  });
}

// ─── Delete ─────────────────────────────────────────────

export function useDeleteCommunityGroup() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/community-groups/${id}`).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["community-groups"] });
      toast({ title: "Moved to Recycle Bin", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete",
        variant: "destructive",
      });
    },
  });
}

// ─── Toggle Active ──────────────────────────────────────

export function useToggleCommunityGroup() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(`/admin/community-groups/${id}/toggle-active`)
        .then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["community-groups"] });
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

export function useBulkCreateCommunityGroups() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any[]) =>
      api.post("/admin/community-groups/bulk", data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["community-groups"] });
      toast({ title: "Bulk Import Successful", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Bulk Import Failed",
        description: err?.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });
}

