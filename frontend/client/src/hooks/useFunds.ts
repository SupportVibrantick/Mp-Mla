// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import api from "@/lib/api";
// import { useToast } from "@/hooks/use-toast";

// export const FUND_TYPES = [
//   {
//     value: "MPLAD",
//     label: "MPLAD",
//     color: "#3b82f6",
//     desc: "Member of Parliament Local Area Development",
//   },
//   {
//     value: "MLALAD",
//     label: "MLALAD",
//     color: "#8b5cf6",
//     desc: "Member of Legislative Assembly LAD",
//   },
//   {
//     value: "STATE_FUND",
//     label: "State Fund",
//     color: "#f59e0b",
//     desc: "State Government Allocation",
//   },
//   {
//     value: "CENTRAL_FUND",
//     label: "Central Fund",
//     color: "#22c55e",
//     desc: "Central Government Scheme Fund",
//   },
//   {
//     value: "CSR",
//     label: "CSR",
//     color: "#ec4899",
//     desc: "Corporate Social Responsibility",
//   },
//   {
//     value: "OTHER",
//     label: "Other",
//     color: "#6b7280",
//     desc: "Miscellaneous Funds",
//   },
// ] as const;

// export const TXN_TYPES = [
//   { value: "ALLOCATION", label: "Allocation", color: "#3b82f6", icon: "📥" },
//   { value: "RELEASE", label: "Release", color: "#f59e0b", icon: "💰" },
//   { value: "UTILIZATION", label: "Utilization", color: "#22c55e", icon: "📤" },
// ] as const;

// export function getFundTypeInfo(type: string) {
//   return (
//     FUND_TYPES.find((f) => f.value === type) ||
//     FUND_TYPES[FUND_TYPES.length - 1]
//   );
// }

// export function formatCurrency(amount: number): string {
//   if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
//   if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
//   if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
//   return `₹${amount.toLocaleString()}`;
// }

// function useFundMut(fn: (d: any) => Promise<any>, title: string) {
//   const qc = useQueryClient();
//   const { toast } = useToast();
//   return useMutation({
//     mutationFn: fn,
//     onSuccess: (res) => {
//       qc.invalidateQueries({ queryKey: ["funds"] });
//       toast({ title, description: res.message });
//     },
//     onError: (err: any) => {
//       toast({
//         title: "Error",
//         description: err?.response?.data?.message || "Failed",
//         variant: "destructive",
//       });
//     },
//   });
// }

// export function useFunds(params?: Record<string, any>) {
//   return useQuery({
//     queryKey: ["funds", params],
//     queryFn: () => api.get("/admin/funds", { params }).then((r) => r.data),
//   });
// }
// export function useFundOverview(fy?: string) {
//   return useQuery({
//     queryKey: ["funds", "overview", fy],
//     queryFn: () =>
//       api
//         .get("/admin/funds/overview", {
//           params: fy ? { financialYear: fy } : {},
//         })
//         .then((r) => r.data),
//   });
// }
// export function useFund(id?: string) {
//   return useQuery({
//     queryKey: ["funds", id],
//     queryFn: () => api.get(`/admin/funds/${id}`).then((r) => r.data),
//     enabled: !!id,
//   });
// }
// export function useCreateFund() {
//   return useFundMut(
//     (data) => api.post("/admin/funds", data).then((r) => r.data),
//     "Fund Created",
//   );
// }
// export function useUpdateFund() {
//   return useFundMut(
//     ({ id, data }: any) =>
//       api.put(`/admin/funds/${id}`, data).then((r) => r.data),
//     "Fund Updated",
//   );
// }
// export function useDeleteFund() {
//   return useFundMut(
//     (id: string) => api.delete(`/admin/funds/${id}`).then((r) => r.data),
//     "Fund Deleted",
//   );
// }
// export function useAddTransaction() {
//   return useFundMut(
//     ({ id, data }: any) =>
//       api.post(`/admin/funds/${id}/transactions`, data).then((r) => r.data),
//     "Transaction Recorded",
//   );
// }
// export function useDeleteTransaction() {
//   return useFundMut(
//     ({ fundId, txnId }: any) =>
//       api
//         .delete(`/admin/funds/${fundId}/transactions/${txnId}`)
//         .then((r) => r.data),
//     "Transaction Reversed",
//   );
// }

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const FUND_TYPES = [
  {
    value: "MPLAD",
    label: "MPLAD",
    color: "#3b82f6",
    desc: "MP Local Area Development",
  },
  {
    value: "MLALAD",
    label: "MLALAD",
    color: "#8b5cf6",
    desc: "MLA Local Area Development",
  },
  {
    value: "STATE_FUND",
    label: "State Fund",
    color: "#f59e0b",
    desc: "State Govt Allocation",
  },
  {
    value: "CENTRAL_FUND",
    label: "Central Fund",
    color: "#22c55e",
    desc: "Central Govt Fund",
  },
  {
    value: "CSR",
    label: "CSR",
    color: "#ec4899",
    desc: "Corporate Social Responsibility",
  },
  { value: "OTHER", label: "Other", color: "#6b7280", desc: "Miscellaneous" },
] as const;

export const TXN_TYPES = [
  {
    value: "ALLOCATION",
    label: "Allocation",
    color: "#3b82f6",
    bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: "📥",
    desc: "Money sanctioned/budgeted",
  },
  {
    value: "RELEASE",
    label: "Release",
    color: "#f59e0b",
    bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: "💰",
    desc: "Money released by govt",
  },
  {
    value: "UTILIZATION",
    label: "Utilization",
    color: "#22c55e",
    bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: "📤",
    desc: "Money spent on project",
  },
] as const;

export function getFundTypeInfo(t: string) {
  return FUND_TYPES.find((f) => f.value === t) || FUND_TYPES[5];
}
export function getTxnTypeInfo(t: string) {
  return TXN_TYPES.find((x) => x.value === t) || TXN_TYPES[0];
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function useFundMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["funds"] });
      toast({ title, description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Operation failed",
        variant: "destructive",
      });
    },
  });
}

export function useFunds(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["funds", "list", params],
    queryFn: () => api.get("/admin/funds", { params }).then((r) => r.data),
  });
}
export function useFundOverview(fy?: string) {
  return useQuery({
    queryKey: ["funds", "overview", fy],
    queryFn: () =>
      api
        .get("/admin/funds/overview", {
          params: fy ? { financialYear: fy } : {},
        })
        .then((r) => r.data),
  });
}
export function useFund(id?: string) {
  return useQuery({
    queryKey: ["funds", "detail", id],
    queryFn: () => api.get(`/admin/funds/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}
export function useCreateFund() {
  return useFundMut(
    (data) => api.post("/admin/funds", data).then((r) => r.data),
    "Fund Created",
  );
}
export function useUpdateFund() {
  return useFundMut(
    ({ id, data }: { id: string; data: any }) =>
      api.put(`/admin/funds/${id}`, data).then((r) => r.data),
    "Fund Updated",
  );
}
export function useDeleteFund() {
  return useFundMut(
    (id: string) => api.delete(`/admin/funds/${id}`).then((r) => r.data),
    "Fund Deleted",
  );
}
export function useAddTransaction() {
  return useFundMut(
    ({ fundId, data }: { fundId: string; data: any }) =>
      api.post(`/admin/funds/${fundId}/transactions`, data).then((r) => r.data),
    "Transaction Recorded",
  );
}
export function useDeleteTransaction() {
  return useFundMut(
    ({ fundId, txnId }: { fundId: string; txnId: string }) =>
      api
        .delete(`/admin/funds/${fundId}/transactions/${txnId}`)
        .then((r) => r.data),
    "Transaction Reversed",
  );
}
