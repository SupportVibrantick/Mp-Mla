import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { modulesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useModules(params?: any) {
  return useQuery({
    queryKey: ["modules", params],
    queryFn: () => modulesApi.list(params),
  });
}

export function useModuleDetail(id: string) {
  return useQuery({
    queryKey: ["module", id],
    queryFn: () => modulesApi.get(id),
    enabled: !!id,
  });
}

export function useTenantModules(tenantId: string, params?: any) {
  return useQuery({
    queryKey: ["tenant-modules", tenantId, params],
    queryFn: () => modulesApi.listTenantAccess(tenantId, params),
    enabled: !!tenantId,
  });
}

function useModulesMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<any>,
  successTitle: string,
  fallbackMessage: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["module"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-modules"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
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

export function useCreateModule() {
  return useModulesMutation(
    (data: any) => modulesApi.create(data),
    "Module Created",
    "Global module created successfully.",
  );
}

export function useUpdateModule() {
  return useModulesMutation(
    ({ id, data }: { id: string; data: any }) => modulesApi.update(id, data),
    "Module Updated",
    "Global module updated successfully.",
  );
}

export function useDeleteModule() {
  return useModulesMutation(
    (id: string) => modulesApi.delete(id),
    "Module Deleted/Deactivated",
    "Module processed successfully.",
  );
}

export function useGrantModuleAccess() {
  return useModulesMutation(
    ({ tenantId, data }: { tenantId: string; data: any }) =>
      modulesApi.grantTenantAccess(tenantId, data),
    "Access Granted",
    "Tenant module access granted successfully.",
  );
}

export function useBulkGrantModules() {
  return useModulesMutation(
    ({ tenantId, data }: { tenantId: string; data: any }) =>
      modulesApi.bulkGrantTenantAccess(tenantId, data),
    "Bulk Access Configured",
    "Tenant modules bulk granted successfully.",
  );
}

export function useUpdateModuleAccess() {
  return useModulesMutation(
    ({ tenantId, moduleId, data }: { tenantId: string; moduleId: string; data: any }) =>
      modulesApi.updateTenantAccess(tenantId, moduleId, data),
    "Access Updated",
    "Tenant module access terms updated successfully.",
  );
}

export function useRevokeModuleAccess() {
  return useModulesMutation(
    ({ tenantId, moduleId }: { tenantId: string; moduleId: string }) =>
      modulesApi.revokeTenantAccess(tenantId, moduleId),
    "Access Revoked",
    "Tenant module access revoked successfully.",
  );
}
