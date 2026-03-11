import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { departmentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useDepartments(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["departments", params],
    queryFn: () => departmentsApi.list(params).then((r) => r.data),
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", id],
    queryFn: () => departmentsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useDepartmentStats() {
  return useQuery({
    queryKey: ["departments", "stats"],
    queryFn: () => departmentsApi.stats().then((r) => r.data),
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
    (data) => departmentsApi.create(data).then((r) => r.data),
    "Created",
  );
}
export function useUpdateDepartment() {
  return useDeptMut(
    ({ id, data }: { id: string; data: any }) =>
      departmentsApi.update(id, data).then((r) => r.data),
    "Updated",
  );
}
export function useDeleteDepartment() {
  return useDeptMut(
    (id: string) => departmentsApi.delete(id).then((r) => r.data),
    "Deleted",
  );
}
export function useToggleDepartment() {
  return useDeptMut(
    (id: string) => departmentsApi.toggle(id).then((r) => r.data),

    "Status Changed",
  );
}

export function useBulkCreateDepartments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any[]) =>
      api.post("/admin/departments/bulk", data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: "Bulk Import Successful", description: res.message });
    },
    onError: (err: any) => {
      throw new Error(
        err?.response?.data?.message || "Failed to bulk import departments",
      );
    },
  });
}
