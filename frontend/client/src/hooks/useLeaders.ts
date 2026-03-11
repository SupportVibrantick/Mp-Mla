import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const LEADER_CATEGORIES = [
  { value: "PARTY_LEADER", label: "Party Leader", icon: "🏛️" },
  { value: "OPPOSITION_LEADER", label: "Opposition", icon: "⚔️" },
  { value: "BUREAUCRAT", label: "Bureaucrat", icon: "📋" },
  { value: "COMMUNITY_LEADER", label: "Community Leader", icon: "🤝" },
  { value: "RELIGIOUS_LEADER", label: "Religious Leader", icon: "🙏" },
  { value: "BUSINESS_LEADER", label: "Business Leader", icon: "💼" },
  { value: "MEDIA_PERSON", label: "Media", icon: "📺" },
  { value: "YOUTH_LEADER", label: "Youth Leader", icon: "🧑" },
  { value: "WOMEN_LEADER", label: "Women Leader", icon: "👩" },
  { value: "SENIOR_CITIZEN", label: "Senior Citizen", icon: "👴" },
  { value: "ACADEMIC", label: "Academic", icon: "🎓" },
  { value: "LEGAL", label: "Legal", icon: "⚖️" },
  { value: "MEDICAL", label: "Medical", icon: "🏥" },
  { value: "NGO_HEAD", label: "NGO Head", icon: "🌍" },
  { value: "TRADE_UNION", label: "Trade Union", icon: "🔧" },
  { value: "OTHER", label: "Other", icon: "👤" },
] as const;

export const RELATIONS = [
  "Supporter",
  "Neutral",
  "Alliance",
  "Opposition",
  "Other",
] as const;
export const INFLUENCES = ["High", "Medium", "Low"] as const;

export function getCategoryInfo(c: string) {
  return (
    LEADER_CATEGORIES.find((x) => x.value === c) ||
    LEADER_CATEGORIES[LEADER_CATEGORIES.length - 1]
  );
}

function useMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["leaders"] });
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

export function useLeaders(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["leaders", params],
    queryFn: () => api.get("/admin/leaders", { params }).then((r) => r.data),
  });
}
export function useLeader(id?: string) {
  return useQuery({
    queryKey: ["leaders", id],
    queryFn: () => api.get(`/admin/leaders/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
export function useLeaderStats() {
  return useQuery({
    queryKey: ["leaders", "stats"],
    queryFn: () => api.get("/admin/leaders/stats").then((r) => r.data),
  });
}
export function useTodayBirthdays() {
  return useQuery({
    queryKey: ["leaders", "birthdays", "today"],
    queryFn: () =>
      api.get("/admin/leaders/birthdays/today").then((r) => r.data),
  });
}
export function useUpcomingBirthdays(days?: number) {
  return useQuery({
    queryKey: ["leaders", "birthdays", "upcoming", days],
    queryFn: () =>
      api
        .get("/admin/leaders/birthdays/upcoming", {
          params: { days: days || 30 },
        })
        .then((r) => r.data),
  });
}
export function useThisMonthBirthdays() {
  return useQuery({
    queryKey: ["leaders", "birthdays", "month"],
    queryFn: () =>
      api.get("/admin/leaders/birthdays/month").then((r) => r.data),
  });
}
export function useCreateLeader() {
  return useMut(
    (data) => api.post("/admin/leaders", data).then((r) => r.data),
    "Leader Added",
  );
}
export function useUpdateLeader() {
  return useMut(
    ({ id, data }: any) =>
      api.put(`/admin/leaders/${id}`, data).then((r) => r.data),
    "Leader Updated",
  );
}
export function useDeleteLeader() {
  return useMut(
    (id: string) => api.delete(`/admin/leaders/${id}`).then((r) => r.data),
    "Leader Removed",
  );
}
export function useSendGreeting() {
  return useMut(
    ({ id, data }: any) =>
      api.post(`/admin/leaders/${id}/greetings`, data).then((r) => r.data),
    "Greeting Sent",
  );
}
export function useSendBulkGreeting() {
  return useMut(
    (data: any) =>
      api.post("/admin/leaders/greetings/bulk", data).then((r) => r.data),
    "Greetings Sent",
  );
}

export function useBulkCreateLeaders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any[]) =>
      api.post("/admin/leaders/bulk", data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["leaders"] });
      toast({ title: "Bulk Import", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to bulk import",
        variant: "destructive",
      });
    },
  });
}

