import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useAccountSubscription() {
  return useQuery({
    queryKey: ["account", "subscription"],
    queryFn: () =>
      api.get("/admin/account/subscription").then((r) => r.data.data),
  });
}

export function useAccountInvoices() {
  return useQuery({
    queryKey: ["account", "invoices"],
    queryFn: () => api.get("/admin/account/invoices").then((r) => r.data.data),
  });
}

export function useAccountUsage() {
  return useQuery({
    queryKey: ["account", "usage"],
    queryFn: () => api.get("/admin/account/usage").then((r) => r.data.data),
  });
}
