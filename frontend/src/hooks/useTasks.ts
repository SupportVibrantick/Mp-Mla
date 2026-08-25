import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../lib/api";
import { useToast } from "./use-toast";

function useTaskMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
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

export function useTasks(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["tasks", "list", params],
    queryFn: () => tasksApi.list(params).then((r) => r.data),
  });
}

export function useTask(id?: string) {
  return useQuery({
    queryKey: ["tasks", "detail", id],
    queryFn: () => tasksApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ["tasks", "stats"],
    queryFn: () => tasksApi.stats().then((r) => r.data),
  });
}

export function useCreateTask() {
  return useTaskMut(
    (data) => tasksApi.create(data).then((r) => r.data),
    "Task Created",
  );
}

export function useUpdateTask() {
  return useTaskMut(
    ({ id, data }: { id: string; data: any }) =>
      tasksApi.update(id, data).then((r) => r.data),
    "Task Updated",
  );
}

export function useDeleteTask() {
  return useTaskMut(
    (id: string) => tasksApi.delete(id).then((r) => r.data),
    "Task Deleted",
  );
}

export function useChangeTaskStatus() {
  return useTaskMut(
    ({ id, status }: { id: string; status: string }) =>
      tasksApi.changeStatus(id, status).then((r) => r.data),
    "Status Updated",
  );
}

export function useAssignTask() {
  return useTaskMut(
    ({ id, data }: { id: string; data: { assignedToId: string; departmentId?: string } }) =>
      tasksApi.assign(id, data).then((r) => r.data),
    "Task Assigned",
  );
}

export function useBulkAssignTasks() {
  return useTaskMut(
    (data: { taskIds: string[]; assignedToId: string; departmentId?: string }) =>
      tasksApi.bulkAssign(data).then((r) => r.data),
    "Tasks Assigned",
  );
}

export function useBulkStatusTasks() {
  return useTaskMut(
    (data: { taskIds: string[]; status: string }) =>
      tasksApi.bulkStatus(data).then((r) => r.data),
    "Statuses Updated",
  );
}
