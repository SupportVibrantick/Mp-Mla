import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Fetch all tenants with filtering and pagination
export function useTenants(params?: any) {
  return useQuery({
    queryKey: ["tenants", params],
    queryFn: () => tenantsApi.list(params),
  });
}

// Fetch single tenant by ID
export function useTenant(id: string) {
  return useQuery({
    queryKey: ["tenant", id],
    queryFn: () => tenantsApi.get(id),
    enabled: !!id,
  });
}

// Create new tenant
export function useCreateTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => tenantsApi.create(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast({
        title: "Tenant Created",
        description: response?.data?.message || "Tenant created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.response?.data?.message || "Could not create tenant.",
      });
    },
  });
}

// Update existing tenant
export function useUpdateTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      tenantsApi.update(id, data),
    onSuccess: (response: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", variables.id] });
      toast({
        title: "Tenant Updated",
        description: response?.data?.message || "Tenant updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.response?.data?.message || "Could not update tenant.",
      });
    },
  });
}

export function useSuspendTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tenantsApi.suspend(id),
    onSuccess: (response: any, id) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      toast({
        title: "Tenant Suspended",
        description: response?.data?.message || "Tenant suspended successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Suspend Failed",
        description: error.response?.data?.message || "Could not suspend tenant.",
      });
    },
  });
}

export function useActivateTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tenantsApi.activate(id),
    onSuccess: (response: any, id) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      toast({
        title: "Tenant Activated",
        description: response?.data?.message || "Tenant activated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Activation Failed",
        description: error.response?.data?.message || "Could not activate tenant.",
      });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tenantsApi.remove(id),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast({
        title: "Tenant Deactivated",
        description: response?.data?.message || "Tenant deactivated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.response?.data?.message || "Could not deactivate tenant.",
      });
    },
  });
}

// Fetch all plans
export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: () => tenantsApi.listPlans(),
  });
}

// Fetch all users for a tenant
export function useTenantUsers(tenantId: string) {
  return useQuery({
    queryKey: ["tenant-users", tenantId],
    queryFn: () => tenantsApi.listUsers(tenantId),
    enabled: !!tenantId,
  });
}

// Create user for a tenant
export function useCreateTenantUser(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => tenantsApi.createUser(tenantId, data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", tenantId] });
      toast({
        title: "User Created",
        description: response?.data?.message || "User created successfully for tenant.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.response?.data?.message || "Could not create tenant user.",
      });
    },
  });
}
