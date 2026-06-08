import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function usePaymentsList(params?: any) {
  return useQuery({
    queryKey: ["payments-list", params],
    queryFn: () => paymentsApi.list(params),
  });
}

export function usePaymentDetails(id: string) {
  return useQuery({
    queryKey: ["payment-details", id],
    queryFn: () => paymentsApi.get(id),
    enabled: !!id,
  });
}

export function usePaymentStats() {
  return useQuery({
    queryKey: ["payment-stats"],
    queryFn: () => paymentsApi.stats(),
  });
}

function usePaymentMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<any>,
  successTitle: string,
  fallbackMessage: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["payments-list"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payment-details"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-overview"] });
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

export function useCreatePayment() {
  return usePaymentMutation(
    (data: any) => paymentsApi.create(data),
    "Payment Recorded",
    "Payment has been recorded successfully.",
  );
}

export function useUpdatePayment() {
  return usePaymentMutation(
    ({ id, data }: { id: string; data: any }) => paymentsApi.update(id, data),
    "Payment Updated",
    "Payment details have been updated successfully.",
  );
}

export function useUpdatePaymentStatus() {
  return usePaymentMutation(
    ({ id, data }: { id: string; data: any }) => paymentsApi.updateStatus(id, data),
    "Payment Status Updated",
    "Payment status has been updated successfully.",
  );
}

export function useDeletePayment() {
  return usePaymentMutation(
    (id: string) => paymentsApi.delete(id),
    "Payment Deleted",
    "Payment record has been deleted successfully.",
  );
}
