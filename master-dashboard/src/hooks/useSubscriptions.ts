import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subscriptionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useSubscriptionOverview() {
  return useQuery({
    queryKey: ["subscription-overview"],
    queryFn: () => subscriptionsApi.overview(),
  });
}

export function useSubscriptionPlans(params?: any) {
  return useQuery({
    queryKey: ["subscription-plans", params],
    queryFn: () => subscriptionsApi.listPlans(params),
  });
}

export function useTenantSubscriptions(params?: any) {
  return useQuery({
    queryKey: ["tenant-subscriptions", params],
    queryFn: () => subscriptionsApi.listTenantSubscriptions(params),
  });
}

export function useInvoices(params?: any) {
  return useQuery({
    queryKey: ["subscription-invoices", params],
    queryFn: () => subscriptionsApi.listInvoices(params),
  });
}

export function useUpcomingRenewals(params?: any) {
  return useQuery({
    queryKey: ["upcoming-renewals", params],
    queryFn: () => subscriptionsApi.listRenewals(params),
  });
}

export function usePlanUpgradeRequests(params?: any) {
  return useQuery({
    queryKey: ["plan-upgrade-requests", params],
    queryFn: () => subscriptionsApi.listUpgradeRequests(params),
  });
}

function useSubscriptionMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<any>,
  successTitle: string,
  fallbackMessage: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-overview"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["plan-upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-invoices"] });
      toast({
        title: successTitle,
        description: response?.data?.message || fallbackMessage,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: `${successTitle} Failed`,
        description: error.response?.data?.message || `Could not complete ${successTitle.toLowerCase()}.`,
      });
    },
  });
}

export function useCreateSubscriptionPlan() {
  return useSubscriptionMutation(
    (data: any) => subscriptionsApi.createPlan(data),
    "Plan Created",
    "Subscription plan created successfully.",
  );
}

export function useUpdateSubscriptionPlan() {
  return useSubscriptionMutation(
    ({ id, data }: { id: string; data: any }) => subscriptionsApi.updatePlan(id, data),
    "Plan Updated",
    "Subscription plan updated successfully.",
  );
}

export function useUpgradeTenantSubscription() {
  return useSubscriptionMutation(
    ({ tenantId, data }: { tenantId: string; data: any }) =>
      subscriptionsApi.upgradeTenantSubscription(tenantId, data),
    "Subscription Upgraded",
    "Tenant subscription upgraded successfully.",
  );
}

export function useSuspendTenantSubscription() {
  return useSubscriptionMutation(
    (tenantId: string) => subscriptionsApi.suspendTenantSubscription(tenantId),
    "Subscription Suspended",
    "Tenant subscription suspended successfully.",
  );
}

export function useActivateTenantSubscription() {
  return useSubscriptionMutation(
    (tenantId: string) => subscriptionsApi.activateTenantSubscription(tenantId),
    "Subscription Activated",
    "Tenant subscription activated successfully.",
  );
}

export function useCancelTenantSubscription() {
  return useSubscriptionMutation(
    (tenantId: string) => subscriptionsApi.cancelTenantSubscription(tenantId),
    "Subscription Cancelled",
    "Tenant subscription cancelled successfully.",
  );
}

export function useApprovePlanUpgradeRequest() {
  return useSubscriptionMutation(
    ({ id, data }: { id: string; data?: any }) =>
      subscriptionsApi.approveUpgradeRequest(id, data),
    "Upgrade Approved",
    "Plan upgrade request approved successfully.",
  );
}

export function useRejectPlanUpgradeRequest() {
  return useSubscriptionMutation(
    ({ id, data }: { id: string; data?: any }) =>
      subscriptionsApi.rejectUpgradeRequest(id, data),
    "Upgrade Rejected",
    "Plan upgrade request rejected.",
  );
}
