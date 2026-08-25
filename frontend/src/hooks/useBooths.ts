import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

type MutationFn<T = any> = (data: T) => Promise<any>;

function useBoothMutation<T>(fn: MutationFn<T>, successMessage: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,

    onSuccess: (res: any) => {
      queryClient.invalidateQueries({
        queryKey: ["booths"],
      });

      queryClient.invalidateQueries({
        queryKey: ["booth"],
      });

      queryClient.invalidateQueries({
        queryKey: ["geography-stats"],
      });

      queryClient.invalidateQueries({
        queryKey: ["constituency-booths"],
      });

      toast.success(res?.message || successMessage);
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Something went wrong.",
      );
    },
  });
}

/* =========================================================
   BOOTH LIST
========================================================= */

export function useBooths(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["booths", params],

    queryFn: () =>
      api
        .get("/admin/constituency/booths", {
          params,
        })
        .then((res) => res.data),
  });
}

/* =========================================================
   SINGLE BOOTH
========================================================= */

export function useBooth(id?: string) {
  return useQuery({
    queryKey: ["booth", id],

    queryFn: () =>
      api.get(`/admin/constituency/booths/${id}`).then((res) => res.data),

    enabled: !!id,
  });
}

/* =========================================================
   CREATE
========================================================= */

export function useCreateBooth() {
  return useBoothMutation(
    (data: any) =>
      api.post("/admin/constituency/booths", data).then((res) => res.data),

    "Booth created successfully.",
  );
}

/* =========================================================
   UPDATE
========================================================= */

export function useUpdateBooth() {
  return useBoothMutation(
    ({ id, data }: any) =>
      api
        .patch(`/admin/constituency/booths/${id}`, data)
        .then((res) => res.data),

    "Booth updated successfully.",
  );
}

/* =========================================================
   DELETE
========================================================= */

export function useDeleteBooth() {
  return useBoothMutation(
    (id: string) =>
      api.delete(`/admin/constituency/booths/${id}`).then((res) => res.data),

    "Booth deleted successfully.",
  );
}

/* =========================================================
   TOGGLE
========================================================= */

export function useToggleBooth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(`/admin/constituency/booths/${id}/toggle`)
        .then((res) => res.data),

    onSuccess: (res: any) => {
      queryClient.invalidateQueries({
        queryKey: ["booths"],
      });

      queryClient.invalidateQueries({
        queryKey: ["booth"],
      });

      queryClient.invalidateQueries({
        queryKey: ["constituency-booths"],
      });

      toast.success(res?.message || "Booth status updated successfully.");
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update booth status.",
      );
    },
  });
}

/* =========================================================
   BOOTH OPTIONS
========================================================= */

export function useBoothOptions(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["booth-options", params],

    queryFn: () =>
      api
        .get("/admin/constituency/booths/options", {
          params,
        })
        .then((res) => res.data),
  });
}

/* =========================================================
   CONSTITUENCIES
========================================================= */

export function useBoothConstituencies() {
  return useQuery({
    queryKey: ["booth-constituencies"],

    queryFn: () =>
      api
        .get("/admin/constituency/constituencies/list", {
          params: {
            limit: 1000,
          },
        })
        .then((res) => res.data),
  });
}

/* =========================================================
   WARDS
========================================================= */

export function useBoothWards(constituencyId?: string) {
  return useQuery({
    queryKey: ["booth-wards", constituencyId],

    queryFn: () =>
      api
        .get("/admin/constituency/wards", {
          params: {
            constituencyId,
            limit: 1000,
          },
        })
        .then((res) => res.data),

    enabled: !!constituencyId,
  });
}

/* =========================================================
   VILLAGES
========================================================= */

export function useBoothTownVillages(constituencyId?: string) {
  return useQuery({
    queryKey: ["booth-town-villages", constituencyId],

    queryFn: () =>
      api
        .get("/admin/constituency/town-villages", {
          params: {
            constituencyId,
            limit: 1000,
          },
        })
        .then((res) => res.data),

    enabled: !!constituencyId,
  });
}

/* =========================================================
   POLLING LOCATIONS
========================================================= */

export function useBoothPollingLocations(constituencyId?: string) {
  return useQuery({
    queryKey: ["booth-polling-locations", constituencyId],

    queryFn: () =>
      api
        .get("/admin/constituency/polling-locations", {
          params: {
            constituencyId,
            limit: 1000,
          },
        })
        .then((res) => res.data),

    enabled: !!constituencyId,
  });
}

/* =========================================================
   CONSTITUENCY BOOTHS
   Used by ConstituencyDetailPage
========================================================= */

export function useConstituencyBooths(constituencyId?: string) {
  return useQuery({
    queryKey: ["constituency-booths", constituencyId],

    queryFn: () =>
      api
        .get("/admin/constituency/booths", {
          params: {
            constituencyId,
            limit: 1000,
          },
        })
        .then((res) => res.data),

    enabled: !!constituencyId,
  });
}

/* =========================================================
   BOOTH STATISTICS
========================================================= */

export function useBoothStats(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["booth-stats", params],

    queryFn: () =>
      api
        .get("/admin/constituency/booths/stats", {
          params,
        })
        .then((res) => res.data),
  });
}
