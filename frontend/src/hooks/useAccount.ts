import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { accountApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useState } from "react";

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

// ═══════════════════════════════════════════════════════
// RAZORPAY PAYMENT CHECKOUT HOOK
// ═══════════════════════════════════════════════════════

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentCheckoutParams {
  paymentId?: string;
  planId?: string;
  billingCycle?: string;
  notes?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Single hook that orchestrates the full Razorpay checkout flow:
 * 1. Create Order → 2. Open Checkout → 3. Verify Payment → 4. Refresh data
 */
export function usePaymentCheckout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const initiatePayment = useCallback(
    async ({
      paymentId,
      planId,
      billingCycle,
      notes,
      onSuccess,
      onError,
    }: PaymentCheckoutParams) => {
      setIsLoading(true);
      try {
        // Step 1: Create order
        const orderRes = await accountApi.createPaymentOrder({
          paymentId,
          planId,
          billingCycle,
          notes,
        });

        const { order, keyId, subscription: subInfo } = orderRes.data.data;

        // Step 2: Open Razorpay Checkout
        const options = {
          key: keyId,
          amount: order.amount,
          currency: order.currency,
          name: "MP/MLA Constituency Management",
          description: subInfo?.planName
            ? `${subInfo.planName} Plan`
            : "Subscription Payment",
          order_id: order.id,
          handler: async (response: any) => {
            try {
              // Step 3: Verify payment
              const verifyRes = await accountApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              // Step 4: Refresh data
              queryClient.invalidateQueries({
                queryKey: ["account"],
              });

              toast({
                title: "Payment Successful! 🎉",
                description:
                  verifyRes?.data?.message ||
                  "Your subscription has been activated.",
              });

              onSuccess?.(verifyRes.data.data);
            } catch (verifyError: any) {
              toast({
                variant: "destructive",
                title: "Verification Failed",
                description:
                  verifyError.response?.data?.message ||
                  "Payment was received but verification failed. Please contact support.",
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
                title: "Payment Cancelled",
                description: "You can try again anytime.",
              });
            },
          },
          prefill: {
            name: subInfo?.tenantName || "",
          },
          theme: {
            color: "#1e40af",
          },
        };

        if (!window.Razorpay) {
          throw new Error(
            "Razorpay SDK not loaded. Please refresh the page and try again.",
          );
        }

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Payment Failed",
            description:
              response.error?.description || "Payment could not be completed.",
          });
          onError?.(response.error);
        });
        rzp.open();
      } catch (error: any) {
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Payment Error",
          description:
            error.response?.data?.message ||
            error.message ||
            "Could not initiate payment.",
        });
        onError?.(error);
      }
    },
    [queryClient, toast],
  );

  return { initiatePayment, isLoading };
}
