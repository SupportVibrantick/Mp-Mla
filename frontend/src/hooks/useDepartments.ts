import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { departmentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useDepartments(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["departments", params],
    queryFn: () => departmentsApi.list(params).then((r) => r.data),
    staleTime: 0,
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
export function useBulkDeleteDepartments() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (ids: string[]) =>
      departmentsApi.bulkDelete(ids).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast({ title: "Bulk Delete Complete", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to bulk delete departments",
        variant: "destructive",
      });
    },
  });
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

export function useDepartmentUsers(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", id, "users"],
    queryFn: () => departmentsApi.getUsers(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useDepartmentGrievances(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", id, "grievances"],
    queryFn: () => departmentsApi.getGrievances(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useDepartmentTasks(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", id, "tasks"],
    queryFn: () => departmentsApi.getTasks(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useDepartmentSlas(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", id, "slas"],
    queryFn: () => departmentsApi.getSlas(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdateDepartmentSlas() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      departmentsApi.updateSlas(id, data).then((r) => r.data),
    onSuccess: (res, variables) => {
      qc.invalidateQueries({ queryKey: ["departments", variables.id, "slas"] });
      toast({ title: "SLAs Updated", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update SLAs",
        variant: "destructive",
      });
    },
  });
}

export function useSingleDepartmentStats(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", id, "stats"],
    queryFn: () => departmentsApi.getSingleStats(id!).then((r) => r.data),
    enabled: !!id,
  });
}

