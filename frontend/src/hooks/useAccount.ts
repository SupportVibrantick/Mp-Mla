import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { accountApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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

export function useAccountPlans() {
  return useQuery({
    queryKey: ["account", "plans"],
    queryFn: () => accountApi.getPlans().then((r) => r.data.data),
  });
}

export function useRequestPlanUpgrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => accountApi.requestUpgrade(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["account", "plans"] });
      toast({
        title: "Upgrade Requested",
        description:
          response?.data?.message ||
          "Your upgrade request has been sent for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Request Failed",
        description:
          error.response?.data?.message ||
          "Could not submit the upgrade request.",
      });
    },
  });
}
