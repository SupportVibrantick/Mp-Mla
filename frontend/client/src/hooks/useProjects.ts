import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { projectsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const PROJECT_STATUSES = [
  {
    value: "PENDING",
    label: "Pending",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  {
    value: "RUNNING",
    label: "Running",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    dot: "bg-green-500",
  },
  {
    value: "ON_HOLD",
    label: "On Hold",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
] as const;

export const FUND_TYPES = [
  { value: "MPLAD", label: "MPLAD" },
  { value: "MLALAD", label: "MLALAD" },
  { value: "STATE_FUND", label: "State Fund" },
  { value: "CENTRAL_FUND", label: "Central Fund" },
  { value: "CSR", label: "CSR" },
  { value: "OTHER", label: "Other" },
] as const;

export const PROJECT_CATEGORIES = [
  { value: "ROAD", label: "Road & Bridge", icon: "🛣️" },
  { value: "WATER", label: "Water Supply", icon: "💧" },
  { value: "DRAINAGE", label: "Drainage & Sewer", icon: "🚿" },
  { value: "ELECTRICITY", label: "Electricity", icon: "⚡" },
  { value: "BUILDING", label: "Building & Civil", icon: "🏗️" },
  { value: "PARK", label: "Park & Garden", icon: "🌳" },
  { value: "EDUCATION", label: "Education", icon: "🏫" },
  { value: "HEALTH", label: "Health", icon: "🏥" },
  { value: "SPORTS", label: "Sports", icon: "🏟️" },
  { value: "SANITATION", label: "Sanitation", icon: "🧹" },
  { value: "HOUSING", label: "Housing", icon: "🏠" },
  { value: "IT", label: "IT & Digital", icon: "💻" },
  { value: "OTHER", label: "Other", icon: "📋" },
] as const;

export function getStatusInfo(s: string) {
  return PROJECT_STATUSES.find((st) => st.value === s) || PROJECT_STATUSES[0];
}
export function getCategoryInfo(c: string) {
  return (
    PROJECT_CATEGORIES.find((ct) => ct.value === c) ||
    PROJECT_CATEGORIES[PROJECT_CATEGORIES.length - 1]
  );
}

function useProjMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
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

export function useProjects(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => projectsApi.list(params).then((r) => r.data),
  });
}
export function useProject(id?: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });
}
export function useProjectStats(wardId?: string) {
  return useQuery({
    queryKey: ["projects", "stats", wardId],
    queryFn: () => projectsApi.stats(wardId).then((r) => r.data),
  });
}
export function useCreateProject() {
  return useProjMut(
    (data) => projectsApi.create(data).then((r) => r.data),
    "Created",
  );
}
export function useUpdateProject() {
  return useProjMut(
    ({ id, data }: any) => projectsApi.update(id, data).then((r) => r.data),
    "Updated",
  );
}
export function useDeleteProject() {
  return useProjMut(
    (id: string) => projectsApi.delete(id).then((r) => r.data),
    "Deleted",
  );
}
export function useChangeProjectStatus() {
  return useProjMut(
    ({ id, data }: any) =>
      projectsApi.changeStatus(id, data).then((r) => r.data),
    "Status Changed",
  );
}
export function useAddMilestone() {
  return useProjMut(
    ({ id, data }: any) =>
      projectsApi.addMilestone(id, data).then((r) => r.data),
    "Milestone Added",
  );
}
export function useToggleMilestone() {
  return useProjMut(
    ({ id, msId }: any) =>
      projectsApi.toggleMilestone(id, msId).then((r) => r.data),
    "Milestone Updated",
  );
}
export function useDeleteMilestone() {
  return useProjMut(
    ({ id, msId }: any) =>
      projectsApi.deleteMilestone(id, msId).then((r) => r.data),
    "Milestone Removed",
  );
}
export function useAddProjectUpdate() {
  return useProjMut(
    ({ id, data }: any) => projectsApi.addUpdate(id, data).then((r) => r.data),
    "Update Added",
  );
}

export function useBulkCreateProjects() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any[]) =>
      api.post("/admin/projects/bulk", data).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Bulk import failed",
        variant: "destructive",
      });
    },
  });
}


export function formatBudget(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
  return `₹${amount.toLocaleString()}`;
}
