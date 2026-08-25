import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/* =========================================================
   COMMON CONSTITUENCY MUTATION
========================================================= */

function useConstMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: fn,

    onSuccess: (res: any) => {
      // Refresh list
      qc.invalidateQueries({
        queryKey: ["constituencies"],
      });

      // Refresh detail
      qc.invalidateQueries({
        queryKey: ["constituency"],
      });

      // Refresh geography statistics
      qc.invalidateQueries({
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
   CONSTITUENCIES
========================================================= */

export function useConstituencies(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["constituencies", params],

    queryFn: () =>
      api
        .get("/admin/constituency/constituencies/list", { params })
        .then((r) => r.data),
  });
}

export function useConstituency(id?: string) {
  return useQuery({
    queryKey: ["constituency", id],

    queryFn: () =>
      api.get(`/admin/constituency/constituencies/${id}`).then((r) => r.data),

    enabled: !!id,
  });
}

export function useGeographyStats() {
  return useQuery({
    queryKey: ["geography-stats"],

    queryFn: () => api.get("/admin/constituency/stats").then((r) => r.data),
  });
}

export function useDistricts() {
  return useQuery({
    queryKey: ["districts-options"],

    queryFn: () =>
      api
        .get("/admin/constituency/districts", {
          params: { limit: 200 },
        })
        .then((r) => r.data),

    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateConstituency() {
  return useConstMut(
    (data: any) =>
      api.post("/admin/constituency/constituencies", data).then((r) => r.data),

    "Constituency Created",
  );
}

export function useUpdateConstituency() {
  return useConstMut(
    ({ id, data }: any) =>
      api
        .patch(`/admin/constituency/constituencies/${id}`, data)
        .then((r) => r.data),

    "Constituency Updated",
  );
}

export function useDeleteConstituency() {
  return useConstMut(
    (id: string) =>
      api
        .delete(`/admin/constituency/constituencies/${id}`)
        .then((r) => r.data),

    "Constituency Deleted",
  );
}

export function useToggleConstituency() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(`/admin/constituency/constituencies/${id}/toggle`)
        .then((r) => r.data),

    onSuccess: (res: any) => {
      qc.invalidateQueries({
        queryKey: ["constituencies"],
      });

      qc.invalidateQueries({
        queryKey: ["constituency"],
      });

      qc.invalidateQueries({
        queryKey: ["geography-stats"],
      });

      toast({
        title: "Status Changed",
        description:
          res?.message || "Constituency status updated successfully.",
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

/* =========================================================
   REPRESENTATIVE
========================================================= */

export function useRepresentative(constituencyId?: string) {
  return useQuery({
    queryKey: ["representative", constituencyId],

    queryFn: () =>
      api
        .get(
          `/admin/constituency/constituencies/${constituencyId}/representative`,
        )
        .then((r) => r.data),

    enabled: !!constituencyId,

    retry: false,
  });
}

export function useUpsertRepresentative(constituencyId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) =>
      api
        .put(
          `/admin/constituency/constituencies/${constituencyId}/representative`,
          data,
        )
        .then((r) => r.data),

    onSuccess: (res: any) => {
      qc.invalidateQueries({
        queryKey: ["representative", constituencyId],
      });

      // Detail may contain representative summary
      qc.invalidateQueries({
        queryKey: ["constituency", constituencyId],
      });

      toast({
        title: "Representative Saved",
        description:
          res?.message || "Representative profile saved successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err?.response?.data?.message ||
          "Failed to save representative profile.",
        variant: "destructive",
      });
    },
  });
}

export function useUploadRepresentativePhoto(constituencyId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      if (!constituencyId) {
        throw new Error(
          "Constituency ID is required to upload representative photo.",
        );
      }

      const response = await api.post(
        `/admin/constituency/constituencies/${constituencyId}/representative/photo`,
        formData,
      );

      return response.data;
    },

    onSuccess: (res: any) => {
      qc.invalidateQueries({
        queryKey: ["representative", constituencyId],
      });

      qc.invalidateQueries({
        queryKey: ["constituency", constituencyId],
      });

      toast({
        title: "Photo Uploaded",
        description:
          res?.message || "Representative photo uploaded successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Photo Upload Failed",
        description:
          err?.response?.data?.message ||
          "Failed to upload representative photo.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Remove representative photo.
 */
export function useDeleteRepresentativePhoto(constituencyId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!constituencyId) {
        throw new Error("Constituency ID is required.");
      }

      const response = await api.delete(
        `/admin/constituency/constituencies/${constituencyId}/representative/photo`,
      );

      return response.data;
    },

    onSuccess: (res: any) => {
      qc.invalidateQueries({
        queryKey: ["representative", constituencyId],
      });

      qc.invalidateQueries({
        queryKey: ["constituency", constituencyId],
      });

      toast({
        title: "Photo Removed",
        description:
          res?.message || "Representative photo removed successfully.",
      });
    },

    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err?.response?.data?.message ||
          "Failed to remove representative photo.",
        variant: "destructive",
      });
    },
  });
}
/* =========================================================
   WARD MAPPINGS
========================================================= */

export function useConstituencyWards(constituencyId?: string) {
  return useQuery({
    queryKey: ["constituency-wards", constituencyId],

    queryFn: () =>
      api
        .get(`/admin/constituency/constituencies/${constituencyId}/wards`)
        .then((r) => r.data),

    enabled: !!constituencyId,
  });
}

export function useLinkUnlinkWard(constituencyId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({
      queryKey: ["constituency-wards", constituencyId],
    });

    qc.invalidateQueries({
      queryKey: ["constituency", constituencyId],
    });

    qc.invalidateQueries({
      queryKey: ["constituencies"],
    });

    qc.invalidateQueries({
      queryKey: ["geography-stats"],
    });
  };

  const handleError = (err: any) => {
    toast({
      title: "Error",
      description: err?.response?.data?.message || "Request failed.",
      variant: "destructive",
    });
  };

  return {
    link: useMutation({
      mutationFn: (wardId: string) =>
        api
          .post(`/admin/constituency/constituencies/${constituencyId}/wards`, {
            wardId,
          })
          .then((r) => r.data),

      onSuccess: (res: any) => {
        invalidate();

        toast({
          title: "Ward Linked",
          description: res?.message || "Ward linked successfully.",
        });
      },

      onError: handleError,
    }),

    unlink: useMutation({
      mutationFn: (wardId: string) =>
        api
          .post(
            `/admin/constituency/constituencies/${constituencyId}/wards/unlink`,
            { wardId },
          )
          .then((r) => r.data),

      onSuccess: (res: any) => {
        invalidate();

        toast({
          title: "Ward Unlinked",
          description: res?.message || "Ward unlinked successfully.",
        });
      },

      onError: handleError,
    }),
  };
}

/* =========================================================
  TOWN/VILLAGE MAPPINGS
========================================================= */

export function useConstituencyTownVillages(constituencyId?: string) {
  return useQuery({
    queryKey: ["constituency-town-villages", constituencyId],

    queryFn: () =>
      api
        .get(
          `/admin/constituency/constituencies/${constituencyId}/town-villages`,
        )
        .then((r) => r.data),

    enabled: !!constituencyId,
  });
}

export function useLinkUnlinkTownVillage(constituencyId?: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({
      queryKey: ["constituency-town-villages", constituencyId],
    });

    qc.invalidateQueries({
      queryKey: ["constituency", constituencyId],
    });

    qc.invalidateQueries({
      queryKey: ["constituencies"],
    });

    qc.invalidateQueries({
      queryKey: ["geography-stats"],
    });
  };

  const handleError = (err: any) => {
    toast({
      title: "Error",
      description: err?.response?.data?.message || "Request failed.",
      variant: "destructive",
    });
  };

  return {
    link: useMutation({
      mutationFn: (townVillageId: string) =>
        api
          .post(
            `/admin/constituency/constituencies/${constituencyId}/town-villages`,
            { townVillageId },
          )
          .then((r) => r.data),

      onSuccess: (res: any) => {
        invalidate();

        toast({
          title: "Village Linked",
          description: res?.message || "Village linked successfully.",
        });
      },

      onError: handleError,
    }),

    unlink: useMutation({
      mutationFn: (townVillageId: string) =>
        api
          .post(
            `/admin/constituency/constituencies/${constituencyId}/town-villages/unlink`,
            { townVillageId },
          )
          .then((r) => r.data),

      onSuccess: (res: any) => {
        invalidate();

        toast({
          title: "Village Unlinked",
          description: res?.message || "Village unlinked successfully.",
        });
      },

      onError: handleError,
    }),
  };
}

/* =========================================================
   BOOTHS
========================================================= */

export function useConstituencyBooths(constituencyId?: string) {
  return useQuery({
    queryKey: ["constituency-booths", constituencyId],

    queryFn: () =>
      api
        .get("/admin/constituency/booths", {
          params: {
            constituencyId,
            limit: 200,
          },
        })
        .then((r) => r.data),

    enabled: !!constituencyId,
  });
}

/* =========================================================
   SELECTOR OPTIONS
========================================================= */

export function useAllWardsOptions() {
  return useQuery({
    queryKey: ["wards-options"],

    queryFn: async () => {
      const res = await api.get("/admin/constituency/wards", {
        params: { limit: 500 },
      });

      const raw = res.data?.data;

      return Array.isArray(raw) ? raw : raw?.items || [];
    },

    staleTime: 5 * 60 * 1000,
  });
}

export function useAllTownVillagesOptions() {
  return useQuery({
    queryKey: ["town-villages-options"],

    queryFn: async () => {
      const res = await api.get("/admin/constituency/town-villages", {
        params: { limit: 500 },
      });

      const raw = res.data?.data;

      return Array.isArray(raw) ? raw : raw?.items || [];
    },

    staleTime: 5 * 60 * 1000,
  });
}
