// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import api from "@/lib/api";
// import { useToast } from "@/hooks/use-toast";

// export function useDepartments(params?: Record<string, any>) {
//   return useQuery({
//     queryKey: ["departments", params],
//     queryFn: () =>
//       api.get("/admin/departments", { params }).then((r) => r.data),
//   });
// }

// export function useDepartment(id: string | undefined) {
//   return useQuery({
//     queryKey: ["departments", id],
//     queryFn: () => api.get(`/admin/departments/${id}`).then((r) => r.data),
//     enabled: !!id,
//   });
// }

// export function useCreateDepartment() {
//   const qc = useQueryClient();
//   const { toast } = useToast();
//   return useMutation({
//     mutationFn: (data: any) =>
//       api.post("/admin/departments", data).then((r) => r.data),
//     onSuccess: (res) => {
//       qc.invalidateQueries({ queryKey: ["departments"] });
//       toast({ title: "Created", description: res.message });
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

// export function useUpdateDepartment() {
//   const qc = useQueryClient();
//   const { toast } = useToast();
//   return useMutation({
//     mutationFn: ({ id, data }: { id: string; data: any }) =>
//       api.put(`/admin/departments/${id}`, data).then((r) => r.data),
//     onSuccess: (res) => {
//       qc.invalidateQueries({ queryKey: ["departments"] });
//       toast({ title: "Updated", description: res.message });
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

// export function useDeleteDepartment() {
//   const qc = useQueryClient();
//   const { toast } = useToast();
//   return useMutation({
//     mutationFn: (id: string) =>
//       api.delete(`/admin/departments/${id}`).then((r) => r.data),
//     onSuccess: (res) => {
//       qc.invalidateQueries({ queryKey: ["departments"] });
//       toast({ title: "Deleted", description: res.message });
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useDepartments(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["departments", params],
    queryFn: () =>
      api.get("/admin/departments", { params }).then((r) => r.data),
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", id],
    queryFn: () => api.get(`/admin/departments/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useDepartmentStats() {
  return useQuery({
    queryKey: ["departments", "stats"],
    queryFn: () => api.get("/admin/departments/stats").then((r) => r.data),
  });
}

function useDeptMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast({ title, description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed",
        variant: "destructive",
      });
    },
  });
}

export function useCreateDepartment() {
  return useDeptMut(
    (data) => api.post("/admin/departments", data).then((r) => r.data),
    "Created",
  );
}
export function useUpdateDepartment() {
  return useDeptMut(
    ({ id, data }: { id: string; data: any }) =>
      api.put(`/admin/departments/${id}`, data).then((r) => r.data),
    "Updated",
  );
}
export function useDeleteDepartment() {
  return useDeptMut(
    (id: string) => api.delete(`/admin/departments/${id}`).then((r) => r.data),
    "Deleted",
  );
}
export function useToggleDepartment() {
  return useDeptMut(
    (id: string) =>
      api.patch(`/admin/departments/${id}/toggle-active`).then((r) => r.data),
    "Status Changed",
  );
}
