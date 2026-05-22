import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useDemographicsSummary() {
  return useQuery({
    queryKey: ["demographics", "summary"],
    queryFn: () => api.get("/admin/demographics/summary").then((r) => r.data),
  });
}

export function useWardDemographicsDetail(wardId: string | undefined) {
  return useQuery({
    queryKey: ["demographics", "ward", wardId],
    queryFn: () =>
      api.get(`/admin/demographics/ward/${wardId}`).then((r) => r.data),
    enabled: !!wardId,
  });
}
