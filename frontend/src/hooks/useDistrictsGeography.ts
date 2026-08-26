import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function useGeoMut(fn: (d: any) => Promise<any>, title: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: fn,

    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["districts"] });
      qc.invalidateQueries({ queryKey: ["geography-stats"] });
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

// ─── Districts ───
export function useDistrictsGeo(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["districts", params],
    queryFn: () =>
      api.get("/admin/constituency/districts", { params }).then((r) => r.data),
  });
}

export function useDistrict(id?: string) {
  return useQuery({
    queryKey: ["district", id],
    queryFn: () =>
      api.get(`/admin/constituency/districts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateDistrict() {
  return useGeoMut(
    (data: any) =>
      api.post("/admin/constituency/districts", data).then((r) => r.data),
    "District created successfully.",
  );
}

export function useUpdateDistrict() {
  return useGeoMut(
    ({ id, data }: any) =>
      api
        .patch(`/admin/constituency/districts/${id}`, data)
        .then((r) => r.data),
    "District updated successfully.",
  );
}

export function useDeleteDistrict() {
  return useGeoMut(
    (id: string) =>
      api.delete(`/admin/constituency/districts/${id}`).then((r) => r.data),
    "District deleted successfully.",
  );
}

export function useRestoreDistrict() {
  return useGeoMut(
    (id: string) =>
      api.post(`/admin/constituency/districts/${id}/restore`).then((r) => r.data),
    "District restored successfully.",
  );
}

export function useToggleDistrict() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      api
        .patch(`/admin/constituency/districts/${id}/toggle`)
        .then((r) => r.data),

    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["districts"] });
      qc.invalidateQueries({ queryKey: ["district"] });
      toast({
        title: "Success",
        description: res?.message || "District status updated successfully.",
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

// ─── District sub-geographies (for detail) ───
export function useDistrictTownVillages(districtId?: string) {
  return useQuery({
    queryKey: ["district-town-villages", districtId],
    queryFn: () =>
      api
        .get(`/admin/constituency/districts/${districtId}/town-villages`, {
          params: { limit: 100 },
        })
        .then((r) => r.data),
    enabled: !!districtId,
  });
}

export function useDistrictBlocks(districtId?: string) {
  return useQuery({
    queryKey: ["district-blocks", districtId],
    queryFn: () =>
      api
        .get(`/admin/constituency/districts/${districtId}/blocks`, {
          params: { limit: 100 },
        })
        .then((r) => r.data),
    enabled: !!districtId,
  });
}

export function useDistrictConstituencies(districtId?: string) {
  return useQuery({
    queryKey: ["district-constituencies", districtId],
    queryFn: () =>
      api
        .get("/admin/constituency/constituencies/list", {
          params: { districtId, limit: 100 },
        })
        .then((r) => r.data),
    enabled: !!districtId,
  });
}
