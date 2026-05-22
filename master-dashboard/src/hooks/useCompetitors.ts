import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "/admin/competitor-analysis";

function useMut(fn: (d: any) => Promise<any>, title: string, queryKeysToInvalidate: any[][] = []) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      queryKeysToInvalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      toast({ title, description: res.message || "Success" });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || err.message || "Failed",
        variant: "destructive",
      });
    },
  });
}

export function useCompetitorDashboard() {
  return useQuery({
    queryKey: ["competitors", "dashboard"],
    queryFn: () => api.get(`${BASE_URL}/dashboard`).then((r) => r.data),
  });
}

export function useOwnMetrics() {
  return useQuery({
    queryKey: ["competitors", "own-metrics"],
    queryFn: () => api.get(`${BASE_URL}/own-metrics`).then((r) => r.data),
  });
}

export function useAutoOwnMetrics() {
  return useQuery({
    queryKey: ["competitors", "own-metrics", "auto"],
    queryFn: () => api.get(`${BASE_URL}/own-metrics/auto`).then((r) => r.data),
  });
}

export function useSubmitOwnMetrics() {
  return useMut(
    (data: any) => api.post(`${BASE_URL}/own-metrics`, data).then((r) => r.data),
    "Submitted Own Metrics",
    [["competitors", "own-metrics"], ["competitors", "dashboard"]]
  );
}

export function useCompetitors(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["competitors", "list", params],
    queryFn: () => api.get(BASE_URL, { params }).then((r) => r.data),
  });
}

export function useCompetitorStats() {
  return useQuery({
    queryKey: ["competitors", "stats"],
    queryFn: () => api.get(`${BASE_URL}/stats`).then((r) => r.data),
  });
}

export function useCompetitor(id?: string) {
  return useQuery({
    queryKey: ["competitors", id],
    queryFn: () => api.get(`${BASE_URL}/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateCompetitor() {
  return useMut(
    (data: any) => api.post(BASE_URL, data).then((r) => r.data),
    "Competitor Created",
    [["competitors", "list"], ["competitors", "stats"]]
  );
}

export function useUpdateCompetitor(id: string) {
  return useMut(
    (data: any) => api.put(`${BASE_URL}/${id}`, data).then((r) => r.data),
    "Competitor Updated",
    [["competitors", "list"], ["competitors", id]]
  );
}

export function useDeleteCompetitor() {
  return useMut(
    (id: string) => api.delete(`${BASE_URL}/${id}`).then((r) => r.data),
    "Competitor Deleted",
    [["competitors", "list"], ["competitors", "stats"]]
  );
}

// ─── Metrics ───
export function useCompetitorMetrics(id?: string) {
  return useQuery({
    queryKey: ["competitors", id, "metrics"],
    queryFn: () => api.get(`${BASE_URL}/${id}/metrics`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useSubmitCompetitorMetrics(id: string) {
  return useMut(
    (data: any) => api.post(`${BASE_URL}/${id}/metrics`, data).then((r) => r.data),
    "Metrics Submitted",
    [["competitors", id, "metrics"], ["competitors", id], ["competitors", "dashboard"]]
  );
}

export function useDeleteCompetitorMetric(id: string) {
  return useMut(
    (metricId: string) => api.delete(`${BASE_URL}/${id}/metrics/${metricId}`).then((r) => r.data),
    "Metric Deleted",
    [["competitors", id, "metrics"], ["competitors", id], ["competitors", "dashboard"]]
  );
}

// ─── Analyses ───
export function useTriggerAnalysis(id: string) {
  return useMut(
    (data: any) => api.post(`${BASE_URL}/${id}/analyze`, data).then((r) => r.data),
    "Analysis Generated",
    [["competitors", id, "analyses"], ["competitors", "dashboard"], ["competitors", id]]
  );
}

export function useAnalyses(id?: string) {
  return useQuery({
    queryKey: ["competitors", id, "analyses"],
    queryFn: () => api.get(`${BASE_URL}/${id}/analyses`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAnalysis(id?: string, analysisId?: string) {
  return useQuery({
    queryKey: ["competitors", id, "analyses", analysisId],
    queryFn: () => api.get(`${BASE_URL}/${id}/analyses/${analysisId}`).then((r) => r.data),
    enabled: !!id && !!analysisId,
  });
}

// ─── Chat ───
export function useChatHistory(id?: string, analysisId?: string) {
  return useQuery({
    queryKey: ["competitors", id, "analyses", analysisId, "chat"],
    queryFn: () => api.get(`${BASE_URL}/${id}/analyses/${analysisId}/chat`).then((r) => r.data),
    enabled: !!id && !!analysisId,
  });
}

export function useSendChatMessage(id: string, analysisId: string) {
  return useMut(
    (data: { message: string }) => api.post(`${BASE_URL}/${id}/analyses/${analysisId}/chat`, data).then((r) => r.data),
    "AI Response Ready",
    [["competitors", id, "analyses", analysisId, "chat"]]
  );
}
