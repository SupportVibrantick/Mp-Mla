import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/admin/dashboard").then((r) => r.data),
    refetchInterval: 60000,
  });
}
