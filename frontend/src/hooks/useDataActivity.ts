import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface DataActivityItem {
    id: string;
    userId: string | null;
    userName: string;
    action: string;
    module: string;
    recordCount: number;
    fileName: string | null;
    details: string | null;
    createdAt: string;
}

interface DataActivityStats {
    totalExports: number;
    totalImports: number;
    exportsByModule: { module: string; count: number }[];
    importsByModule: { module: string; count: number }[];
    recentActivity: DataActivityItem[];
}

/**
 * Fetch data activity statistics (total exports, imports, recent activity)
 */
export function useDataActivityStats() {
    return useQuery<{ success: boolean; data: DataActivityStats }>({
        queryKey: ["data-activity", "stats"],
        queryFn: async () => {
            const { data } = await api.get("/admin/data-activity/stats");
            return data;
        },
        staleTime: 30_000,
    });
}

/**
 * Fetch paginated data activity list
 */
export function useDataActivityList(params?: {
    page?: number;
    limit?: number;
    action?: string;
    module?: string;
}) {
    return useQuery({
        queryKey: ["data-activity", "list", params],
        queryFn: async () => {
            const { data } = await api.get("/admin/data-activity", { params });
            return data;
        },
        staleTime: 30_000,
    });
}
