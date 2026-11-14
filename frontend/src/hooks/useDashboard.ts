import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/admin/dashboard").then((r) => r.data),
    staleTime: 0,
    refetchInterval: 60000,
    enabled: options?.enabled ?? true,
  });
}
