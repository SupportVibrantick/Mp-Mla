import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/* =========================================================
   TYPES
========================================================= */

export type TownVillageType = "TOWN" | "VILLAGE";
export type GeographyNature = "URBAN" | "RURAL";

export interface TownVillage {
  id: string;
  tenantId?: string;

  districtId: string;
  blockId?: string | null;
  constituencyId?: string | null;

  name: string;
  code?: string | null;

  type: TownVillageType;
  nature: GeographyNature;

  description?: string | null;
  pincode?: string | null;

  latitude?: number | null;
  longitude?: number | null;
  boundary?: unknown | null;

  isActive: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;

  district?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;

  block?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;

  constituency?: {
    id: string;
    name: string;
    code?: string | null;
    type?: string;
  } | null;

  _count?: {
    wards?: number;
    booths?: number;
  };
}

export interface TownVillageListParams {
  page?: number;
  limit?: number;

  search?: string;
  status?: string;
  type?: TownVillageType | string;
  nature?: GeographyNature | string;

  districtId?: string;
  blockId?: string;
  constituencyId?: string;
}

export interface TownVillagePayload {
  name: string;
  code?: string | null;

  districtId: string;
  blockId?: string | null;
  constituencyId?: string | null;

  type: TownVillageType;
  nature: GeographyNature;

  description?: string | null;
  pincode?: string | null;

  latitude?: number | null;
  longitude?: number | null;
  boundary?: unknown | null;
}

/* =========================================================
   COMMON ERROR HANDLER
========================================================= */

function getErrorMessage(err: any, fallback: string) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

/* =========================================================
   LIST
========================================================= */

export function useTownVillages(params?: TownVillageListParams) {
  return useQuery({
    queryKey: ["town-villages", params],

    queryFn: () =>
      api
        .get("/admin/constituency/town-villages", {
          params,
        })
        .then((res) => res.data),

    staleTime: 30 * 1000,
  });
}

/* =========================================================
   DETAIL
========================================================= */

export function useTownVillage(id?: string) {
  return useQuery({
    queryKey: ["town-village", id],

    queryFn: () =>
      api
        .get(`/admin/constituency/town-villages/${id}`)
        .then((res) => res.data),

    enabled: Boolean(id),
  });
}

/* =========================================================
   DISTRICTS
========================================================= */

export function useTownVillageDistricts() {
  return useQuery({
    queryKey: ["town-village-districts"],

    queryFn: () =>
      api
        .get("/admin/constituency/districts", {
          params: {
            limit: 500,
          },
        })
        .then((res) => res.data),

    staleTime: 5 * 60 * 1000,
  });
}

/* =========================================================
   BLOCKS BY DISTRICT
========================================================= */

export function useTownVillageBlocks(districtId?: string) {
  return useQuery({
    queryKey: ["town-village-blocks", districtId],

    queryFn: () =>
      api
        .get(`/admin/constituency/districts/${districtId}/blocks`, {
          params: {
            limit: 500,
          },
        })
        .then((res) => res.data),

    enabled: Boolean(districtId),

    staleTime: 5 * 60 * 1000,
  });
}

/* =========================================================
   CONSTITUENCY OPTIONS
========================================================= */

export function useTownVillageConstituencies() {
  return useQuery({
    queryKey: ["town-village-constituencies"],

    queryFn: () =>
      api
        .get("/admin/constituency/constituencies/list", {
          params: {
            limit: 500,
          },
        })
        .then((res) => res.data),

    staleTime: 5 * 60 * 1000,
  });
}

/* =========================================================
   CREATE
========================================================= */

export function useCreateTownVillage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: TownVillagePayload) =>
      api
        .post("/admin/constituency/town-villages", data)
        .then((res) => res.data),

    onSuccess: (res: any) => {
      queryClient.invalidateQueries({
        queryKey: ["town-villages"],
      });

      queryClient.invalidateQueries({
        queryKey: ["town-village"],
      });

      queryClient.invalidateQueries({
        queryKey: ["town-village-constituencies"],
      });

      toast({
        title: "Town/Village Created",
        description: res?.message || "Town/Village created successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to create town/village."),
        variant: "destructive",
      });
    },
  });
}

/* =========================================================
   UPDATE
========================================================= */

export function useUpdateTownVillage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TownVillagePayload }) =>
      api
        .patch(`/admin/constituency/town-villages/${id}`, data)
        .then((res) => res.data),

    onSuccess: (res: any, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["town-villages"],
      });

      queryClient.invalidateQueries({
        queryKey: ["town-village", variables.id],
      });

      queryClient.invalidateQueries({
        queryKey: ["town-village-constituencies"],
      });

      toast({
        title: "Town/Village Updated",
        description: res?.message || "Town/Village updated successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to update town/village."),
        variant: "destructive",
      });
    },
  });
}

/* =========================================================
   DELETE
========================================================= */

export function useDeleteTownVillage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .delete(`/admin/constituency/town-villages/${id}`)
        .then((res) => res.data),

    onSuccess: (res: any) => {
      queryClient.invalidateQueries({
        queryKey: ["town-villages"],
      });

      queryClient.invalidateQueries({
        queryKey: ["town-village"],
      });

      queryClient.invalidateQueries({
        queryKey: ["town-village-constituencies"],
      });

      toast({
        title: "Town/Village Deleted",
        description: res?.message || "Town/Village deleted successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to delete town/village."),
        variant: "destructive",
      });
    },
  });
}

/* =========================================================
   TOGGLE STATUS
========================================================= */

export function useToggleTownVillage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(`/admin/constituency/town-villages/${id}/toggle`)
        .then((res) => res.data),

    onSuccess: (res: any, id) => {
      queryClient.invalidateQueries({
        queryKey: ["town-villages"],
      });

      queryClient.invalidateQueries({
        queryKey: ["town-village", id],
      });

      toast({
        title: "Status Changed",
        description:
          res?.message || "Town/Village status updated successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description: getErrorMessage(
          err,
          "Failed to change town/village status.",
        ),
        variant: "destructive",
      });
    },
  });
}
