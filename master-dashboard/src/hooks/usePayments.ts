import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useState } from "react";

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

// ═══════════════════════════════════════════════════════
// ADMIN RAZORPAY CHECKOUT HOOK
// ═══════════════════════════════════════════════════════

interface AdminPaymentCheckoutParams {
  subscriptionId: string;
  amount?: number;
  currency?: string;
  notes?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useAdminPaymentCheckout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const initiatePayment = useCallback(
    async ({
      subscriptionId,
      amount,
      currency,
      notes,
      onSuccess,
      onError,
    }: AdminPaymentCheckoutParams) => {
      setIsLoading(true);
      try {
        // Step 1: Create Order via Platform API
        const orderRes = await paymentsApi.createOrder({
          subscriptionId,
          amount,
          currency,
          notes,
        });

        const { order, keyId, subscription: subInfo } = orderRes.data.data;

        // Step 2: Open Razorpay Checkout
        const options = {
          key: keyId,
          amount: order.amount,
          currency: order.currency,
          name: "MP/MLA Platform Admin",
          description: `Subscription Payment for ${subInfo?.tenantName || "Tenant"}`,
          order_id: order.id,
          handler: async (response: any) => {
            try {
              // Step 3: Verify Payment
              const verifyRes = await paymentsApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              // Step 4: Refresh queries
              queryClient.invalidateQueries({ queryKey: ["payments-list"] });
              queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
              queryClient.invalidateQueries({ queryKey: ["payment-details"] });
              queryClient.invalidateQueries({ queryKey: ["tenant-subscriptions"] });
              queryClient.invalidateQueries({ queryKey: ["subscription-overview"] });

              toast({
                title: "Payment Collected! 🎉",
                description:
                  verifyRes?.data?.message ||
                  "Razorpay payment verified and processed.",
              });

              onSuccess?.(verifyRes.data.data);
            } catch (verifyError: any) {
              toast({
                variant: "destructive",
                title: "Verification Failed",
                description:
                  verifyError.response?.data?.message ||
                  "Payment verified failed. Please check logs.",
              });
              onError?.(verifyError);
            } finally {
              setIsLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              toast({
                title: "Checkout Dismissed",
                description: "Payment order remains in CREATED state.",
              });
            },
          },
          theme: {
            color: "#1e40af",
          },
        };

        if (!(window as any).Razorpay) {
          throw new Error(
            "Razorpay SDK not loaded. Please refresh the page and try again.",
          );
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Payment Failed",
            description:
              response.error?.description || "Payment attempt failed.",
          });
          onError?.(response.error);
        });
        rzp.open();
      } catch (error: any) {
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Payment Order Failed",
          description:
            error.response?.data?.message ||
            error.message ||
            "Could not create Razorpay order.",
        });
        onError?.(error);
      }
    },
    [queryClient, toast],
  );

  return { initiatePayment, isLoading };
}
