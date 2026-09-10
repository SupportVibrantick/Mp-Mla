import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { backupsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useBackups(params?: any) {
  return useQuery({
    queryKey: ["backups", params],
    queryFn: () => backupsApi.list(params),
    refetchInterval: (query) => {
      // If any backup in the current list is IN_PROGRESS, poll every 3 seconds
      const items = query.state.data?.data?.data?.items || [];
      const hasInProgress = items.some((b: any) => b.status === "IN_PROGRESS");
      return hasInProgress ? 3000 : false;
    },
  });
}

export function useBackup(id: string) {
  return useQuery({
    queryKey: ["backup", id],
    queryFn: () => backupsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { tenantId: string; notes?: string }) =>
      backupsApi.create(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast({
        title: "Backup Created",
        description: response?.data?.message || "Tenant backup created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: error.response?.data?.message || "Failed to create tenant backup.",
      });
    },
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, confirmRestore }: { id: string; confirmRestore: boolean }) =>
      backupsApi.restore(id, { confirmRestore }),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast({
        title: "Tenant Restored",
        description:
          response?.data?.message ||
          "Tenant data restored successfully from backup.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Restore Failed",
        description:
          error.response?.data?.message || "Failed to restore tenant backup.",
      });
    },
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => backupsApi.delete(id),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      toast({
        title: "Backup Deleted",
        description: response?.data?.message || "Backup deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.response?.data?.message || "Could not delete backup.",
      });
    },
  });
}
