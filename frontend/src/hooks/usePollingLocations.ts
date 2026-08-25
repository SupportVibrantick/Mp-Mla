import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/* =========================================================
   TYPES
========================================================= */

export interface PollingLocation {
  id: string;

  name: string;
  code?: string | null;

  description?: string | null;

  address?: string | null;
  pincode?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  buildingName?: string | null;
  landmark?: string | null;

  isAccessible: boolean;
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;

  _count?: {
    booths?: number;
  };
}

export interface PollingLocationBooth {
  id: string;

  boothNumber?: number | string | null;
  boothName?: string | null;
  code?: string | null;

  isActive?: boolean;
}

export interface PollingLocationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface PollingLocationFormData {
  name: string;
  code?: string;
  description?: string;
  address?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  buildingName?: string;
  landmark?: string;
  isAccessible: boolean;
}

/* =========================================================
   QUERY KEYS
========================================================= */

export const pollingLocationKeys = {
  all: ["polling-locations"] as const,

  list: (params?: PollingLocationListParams) =>
    ["polling-locations", "list", params] as const,

  detail: (id?: string) => ["polling-location", id] as const,

  booths: (id?: string) => ["polling-location-booths", id] as const,

  stats: ["geography-stats"] as const,
};

/* =========================================================
   COMMON MUTATION
========================================================= */

function usePollingLocationMutation(
  mutationFn: (data: any) => Promise<any>,
  title: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,

    onSuccess: (res: any) => {
      queryClient.invalidateQueries({
        queryKey: pollingLocationKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: ["polling-location"],
      });

      queryClient.invalidateQueries({
        queryKey: ["polling-location-booths"],
      });

      queryClient.invalidateQueries({
        queryKey: ["geography-stats"],
      });

      toast({
        title,
        description: res?.message || "Operation completed successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });
}

/* =========================================================
   POLLING LOCATIONS LIST
========================================================= */

export function usePollingLocations(params?: PollingLocationListParams) {
  return useQuery({
    queryKey: pollingLocationKeys.list(params),

    queryFn: () =>
      api
        .get("/admin/constituency/polling-locations", {
          params,
        })
        .then((response) => response.data),
  });
}

/* =========================================================
   SINGLE POLLING LOCATION
========================================================= */

export function usePollingLocation(id?: string) {
  return useQuery({
    queryKey: pollingLocationKeys.detail(id),

    queryFn: () =>
      api
        .get(`/admin/constituency/polling-locations/${id}`)
        .then((response) => response.data),

    enabled: !!id,
  });
}

/* =========================================================
   POLLING LOCATION BOOTHS
========================================================= */

export function usePollingLocationBooths(pollingLocationId?: string) {
  return useQuery({
    queryKey: pollingLocationKeys.booths(pollingLocationId),

    queryFn: () =>
      api
        .get("/admin/constituency/booths", {
          params: {
            pollingLocationId,
            limit: 200,
          },
        })
        .then((response) => response.data),

    enabled: !!pollingLocationId,
  });
}

/* =========================================================
   CREATE
========================================================= */

export function useCreatePollingLocation() {
  return usePollingLocationMutation(
    (data: PollingLocationFormData) =>
      api
        .post("/admin/constituency/polling-locations", data)
        .then((response) => response.data),

    "Polling Location Created",
  );
}

/* =========================================================
   UPDATE
========================================================= */

export function useUpdatePollingLocation() {
  return usePollingLocationMutation(
    ({ id, data }: { id: string; data: PollingLocationFormData }) =>
      api
        .patch(`/admin/constituency/polling-locations/${id}`, data)
        .then((response) => response.data),

    "Polling Location Updated",
  );
}

/* =========================================================
   DELETE
========================================================= */

export function useDeletePollingLocation() {
  return usePollingLocationMutation(
    (id: string) =>
      api
        .delete(`/admin/constituency/polling-locations/${id}`)
        .then((response) => response.data),

    "Polling Location Deleted",
  );
}

/* =========================================================
   TOGGLE
========================================================= */

export function useTogglePollingLocation() {
  const queryClient = useQueryClient();

  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(`/admin/constituency/polling-locations/${id}/toggle`)
        .then((response) => response.data),

    onSuccess: (res: any) => {
      queryClient.invalidateQueries({
        queryKey: pollingLocationKeys.all,
      });

      queryClient.invalidateQueries({
        queryKey: ["polling-location"],
      });

      queryClient.invalidateQueries({
        queryKey: ["geography-stats"],
      });

      toast({
        title: "Status Changed",
        description:
          res?.message || "Polling location status updated successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to toggle status.",
        variant: "destructive",
      });
    },
  });
}
