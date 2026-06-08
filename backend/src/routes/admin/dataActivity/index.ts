import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import catchAsync from "@/utils/catchAsync.js";
import { requireTenantId } from "../../../utils/tenant.js";

const router = Router();

/**
 * GET /api/admin/data-activity
 * List data activity log with pagination
 */
router.get(
    "/",
    requirePermission("settings", "read"),
    catchAsync(async (req, res) => {
        const tenantId = requireTenantId(req);
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const action = req.query.action as string | undefined;
        const module = req.query.module as string | undefined;

        const where: any = { tenantId };
        if (action) where.action = action;
        if (module) where.module = module;

        const [activities, total] = await Promise.all([
            prisma.dataActivity.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.dataActivity.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                activities,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    }),
);

/**
 * GET /api/admin/data-activity/stats
 * Get summary counts of exports and imports
 */
router.get(
    "/stats",
    requirePermission("settings", "read"),
    catchAsync(async (req, res) => {
        const tenantId = requireTenantId(req);
        const [totalExports, totalImports, recentActivity] = await Promise.all([
            prisma.dataActivity.count({ where: { tenantId, action: "EXPORT" } }),
            prisma.dataActivity.count({ where: { tenantId, action: "IMPORT" } }),
            prisma.dataActivity.findMany({
                where: { tenantId },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
        ]);

        // Group by module
        const exportsByModule = await prisma.dataActivity.groupBy({
            by: ["module"],
            where: { tenantId, action: "EXPORT" },
            _count: true,
            orderBy: { _count: { module: "desc" } },
        });

        const importsByModule = await prisma.dataActivity.groupBy({
            by: ["module"],
            where: { tenantId, action: "IMPORT" },
            _count: true,
            orderBy: { _count: { module: "desc" } },
        });

        res.json({
            success: true,
            data: {
                totalExports,
                totalImports,
                exportsByModule: exportsByModule.map((e) => ({
                    module: e.module,
                    count: e._count,
                })),
                importsByModule: importsByModule.map((i) => ({
                    module: i.module,
                    count: i._count,
                })),
                recentActivity,
            },
        });
    }),
);

export default router;
