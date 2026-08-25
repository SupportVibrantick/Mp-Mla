import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/* =========================================================
   TYPES
========================================================= */

export type Block = {
  id: string;
  tenantId?: string;

  name: string;
  code?: string | null;

  districtId: string;

  district?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;

  isActive?: boolean;
  status?: string;

  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type BlockListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  districtId?: string;
};

export type CreateBlockPayload = {
  name: string;
  code?: string;
  districtId: string;
};

export type UpdateBlockPayload = {
  name?: string;
  code?: string;
  districtId?: string;
};

export type BlockListResponse = {
  items: Block[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

/* =========================================================
   QUERY KEYS
========================================================= */

export const blocksKeys = {
  all: ["blocks"] as const,

  lists: () => ["blocks"] as const,

  list: (params?: BlockListParams) => ["blocks", params] as const,

  details: () => ["block"] as const,

  detail: (id?: string) => ["block", id] as const,
};

/* =========================================================
   RESPONSE NORMALIZER
========================================================= */

function normalizeBlockListResponse(response: any): BlockListResponse {
  /*
   * Expected backend response:
   *
   * {
   *   success: true,
   *   data: {
   *     items: [],
   *     page: 1,
   *     limit: 10,
   *     total: 20,
   *     totalPages: 2
   *   }
   * }
   *
   * Also supports:
   *
   * {
   *   data: []
   * }
   *
   * or:
   *
   * {
   *   items: []
   * }
   */

  const result = response?.data ?? response ?? {};

  const items: Block[] = Array.isArray(result)
    ? result
    : Array.isArray(result?.items)
      ? result.items
      : [];

  const page = Number(result?.page) || 1;

  const limit = Number(result?.limit ?? result?.pageSize) || 10;

  const total =
    Number(result?.total ?? result?.pagination?.total) || items.length;

  const totalPages =
    Number(result?.totalPages ?? result?.pagination?.totalPages) ||
    Math.max(1, Math.ceil(total / limit));

  const hasNextPage =
    typeof result?.hasNextPage === "boolean"
      ? result.hasNextPage
      : page < totalPages;

  const hasPrevPage =
    typeof result?.hasPrevPage === "boolean"
      ? result.hasPrevPage
      : typeof result?.hasPreviousPage === "boolean"
        ? result.hasPreviousPage
        : page > 1;

  return {
    items,
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

/* =========================================================
   COMMON BLOCK MUTATION
========================================================= */

function useBlockMut<T>(mutationFn: (data: T) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,

    onSuccess: (res: any) => {
      /*
       * Refresh Blocks list.
       *
       * This invalidates:
       * - normal list
       * - searched list
       * - paginated list
       * - filtered list
       */
      qc.invalidateQueries({
        queryKey: ["blocks"],
      });

      /*
       * Refresh Block details.
       */
      qc.invalidateQueries({
        queryKey: ["block"],
      });

      /*
       * Refresh District -> Blocks.
       */
      qc.invalidateQueries({
        queryKey: ["district-blocks"],
      });

      /*
       * Refresh geography statistics.
       */
      qc.invalidateQueries({
        queryKey: ["geography-stats"],
      });

      /*
       * District data can contain block counts.
       */
      qc.invalidateQueries({
        queryKey: ["districts"],
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
   BLOCKS LIST
========================================================= */

export function useBlocks(params?: BlockListParams) {
  return useQuery({
    queryKey: ["blocks", params],

    queryFn: async () => {
      const response = await api.get("/admin/constituency/blocks", {
        params: {
          page: params?.page ?? 1,

          limit: params?.limit ?? 10,

          ...(params?.search?.trim()
            ? {
                search: params.search.trim(),
              }
            : {}),

          ...(params?.status && params.status !== "all"
            ? {
                status: params.status,
              }
            : {}),

          ...(params?.districtId
            ? {
                districtId: params.districtId,
              }
            : {}),
        },
      });

      return normalizeBlockListResponse(response.data);
    },

    staleTime: 30_000,
  });
}

/* =========================================================
   SINGLE BLOCK
========================================================= */

export function useBlock(id?: string) {
  return useQuery({
    queryKey: ["block", id],

    queryFn: () =>
      api.get(`/admin/constituency/blocks/${id}`).then((res) => res.data),

    enabled: !!id,

    staleTime: 30_000,
  });
}

/* =========================================================
   CREATE BLOCK
========================================================= */

export function useCreateBlock() {
  return useBlockMut<CreateBlockPayload>(
    (data) =>
      api.post("/admin/constituency/blocks", data).then((res) => res.data),

    "Block Created",
  );
}

/* =========================================================
   UPDATE BLOCK
========================================================= */

export function useUpdateBlock() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBlockPayload }) =>
      api
        .patch(`/admin/constituency/blocks/${id}`, data)
        .then((res) => res.data),

    onSuccess: (res: any, variables) => {
      /*
       * Refresh Blocks list.
       */
      qc.invalidateQueries({
        queryKey: ["blocks"],
      });

      /*
       * Refresh specific Block.
       */
      qc.invalidateQueries({
        queryKey: ["block", variables.id],
      });

      /*
       * Refresh District -> Blocks.
       */
      qc.invalidateQueries({
        queryKey: ["district-blocks"],
      });

      /*
       * Refresh geography statistics.
       */
      qc.invalidateQueries({
        queryKey: ["geography-stats"],
      });

      /*
       * Refresh District data/options.
       */
      qc.invalidateQueries({
        queryKey: ["districts"],
      });

      toast({
        title: "Block Updated",
        description: res?.message || "Block updated successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update block.",
        variant: "destructive",
      });
    },
  });
}

/* =========================================================
   DELETE BLOCK
========================================================= */

export function useDeleteBlock() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/constituency/blocks/${id}`).then((res) => res.data),

    onSuccess: (res: any, id) => {
      /*
       * Refresh Blocks list.
       */
      qc.invalidateQueries({
        queryKey: ["blocks"],
      });

      /*
       * Remove deleted Block
       * from detail cache.
       */
      qc.removeQueries({
        queryKey: ["block", id],
      });

      /*
       * Refresh District -> Blocks.
       */
      qc.invalidateQueries({
        queryKey: ["district-blocks"],
      });

      /*
       * Refresh geography statistics.
       */
      qc.invalidateQueries({
        queryKey: ["geography-stats"],
      });

      /*
       * Refresh District data.
       */
      qc.invalidateQueries({
        queryKey: ["districts"],
      });

      toast({
        title: "Block Deleted",
        description: res?.message || "Block deleted successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete block.",
        variant: "destructive",
      });
    },
  });
}

/* =========================================================
   TOGGLE BLOCK
========================================================= */

export function useToggleBlock() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(`/admin/constituency/blocks/${id}/toggle`)
        .then((res) => res.data),

    onSuccess: (res: any, id) => {
      /*
       * Refresh Blocks list.
       */
      qc.invalidateQueries({
        queryKey: ["blocks"],
      });

      /*
       * Refresh specific Block.
       */
      qc.invalidateQueries({
        queryKey: ["block", id],
      });

      /*
       * Refresh District -> Blocks.
       */
      qc.invalidateQueries({
        queryKey: ["district-blocks"],
      });

      /*
       * Refresh geography statistics.
       */
      qc.invalidateQueries({
        queryKey: ["geography-stats"],
      });

      /*
       * Refresh District counts.
       */
      qc.invalidateQueries({
        queryKey: ["districts"],
      });

      toast({
        title: "Status Changed",
        description: res?.message || "Block status updated successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err?.response?.data?.message || "Failed to toggle block status.",
        variant: "destructive",
      });
    },
  });
}

/* =========================================================
   DISTRICT OPTIONS
========================================================= */

export function useBlockDistricts(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["districts-options", "block", params],

    queryFn: () =>
      api
        .get("/admin/constituency/districts", {
          params: {
            limit: params?.limit ?? 200,
            ...params,
          },
        })
        .then((res) => res.data),

    staleTime: 5 * 60 * 1000,
  });
}

/* =========================================================
   DISTRICT BLOCKS
   Used by District Detail Page
========================================================= */

export function useDistrictBlocks(districtId?: string) {
  return useQuery({
    queryKey: ["district-blocks", districtId],

    queryFn: () =>
      api
        .get(`/admin/constituency/districts/${districtId}/blocks`, {
          params: {
            limit: 100,
          },
        })
        .then((res) => res.data),

    enabled: !!districtId,

    staleTime: 30_000,
  });
}
