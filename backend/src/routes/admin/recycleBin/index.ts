import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { parsePagination, buildPagination } from "../../../utils/helpers.js";
import catchAsync from "@/utils/catchAsync.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  permanentlyDeleteRecycledRecord,
  restoreRecycleBinEntry,
} from "../../../lib/recycleBin.js";

const router = Router();

router.get(
  "/",
  requirePermission("recycle_bin", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const { module, entityType, search } = req.query as Record<string, string>;

    const where: any = { tenantId, restoredAt: null };

    if (module && module !== "all") {
      where.module = module;
    }

    if (entityType && entityType !== "all") {
      where.entityType = entityType;
    }

    if (search) {
      where.OR = [
        { recordId: { contains: search, mode: "insensitive" } },
        { recordLabel: { contains: search, mode: "insensitive" } },
        { module: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total, modules, entityTypes] = await Promise.all([
      (prisma as any).recycleBinEntry.findMany({
        where,
        orderBy: { deletedAt: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).recycleBinEntry.count({ where }),
      (prisma as any).recycleBinEntry.findMany({
        where: { tenantId, restoredAt: null },
        select: { module: true },
        distinct: ["module"],
        orderBy: { module: "asc" },
      }),
      (prisma as any).recycleBinEntry.findMany({
        where: { tenantId, restoredAt: null },
        select: { entityType: true },
        distinct: ["entityType"],
        orderBy: { entityType: "asc" },
      }),
    ]);

    res.json({
      success: true,
      data,
      filters: {
        modules: modules.map((m: { module: string }) => m.module),
        entityTypes: entityTypes.map((e: { entityType: string }) => e.entityType),
      },
      pagination: buildPagination(total, page, limit),
    });
  }),
);

router.post(
  "/bulk-restore",
  requirePermission("recycle_bin", "restore"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw ApiError.badRequest("No recycle bin entry IDs provided");
    }

    const entries = await (prisma as any).recycleBinEntry.findMany({
      where: { id: { in: ids }, tenantId, restoredAt: null },
    });

    if (entries.length === 0) {
      throw ApiError.notFound("No valid unrestored recycle bin entries found");
    }

    let restoredCount = 0;
    for (const entry of entries) {
      try {
        await restoreRecycleBinEntry({
          id: entry.id,
          entityType: entry.entityType,
          payload: entry.payload,
        });

        await (prisma as any).recycleBinEntry.update({
          where: { id: entry.id },
          data: {
            restoredAt: new Date(),
            restoredById: req.user?.id,
          },
        });
        restoredCount++;
      } catch (err: any) {
        console.error(`Failed to restore recycle bin entry ${entry.id}:`, err?.message);
      }
    }

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: "RESTORE",
      module: "recycle_bin",
      recordId: ids.join(","),
      description: `Bulk restored ${restoredCount} entries from recycle bin`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Successfully restored ${restoredCount} out of ${entries.length} items`,
    });
  }),
);

router.post(
  "/bulk-delete",
  requirePermission("recycle_bin", "delete"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw ApiError.badRequest("No recycle bin entry IDs provided");
    }

    const entries = await (prisma as any).recycleBinEntry.findMany({
      where: { id: { in: ids }, tenantId },
    });

    if (entries.length === 0) {
      throw ApiError.notFound("No recycle bin entries found");
    }

    let deletedCount = 0;
    for (const entry of entries) {
      try {
        if (!entry.restoredAt) {
          await permanentlyDeleteRecycledRecord({
            entityType: entry.entityType,
            recordId: entry.recordId,
          });
        }
        await (prisma as any).recycleBinEntry.delete({ where: { id: entry.id } });
        deletedCount++;
      } catch (err: any) {
        console.error(`Failed to permanently delete recycle entry ${entry.id}:`, err?.message);
      }
    }

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: "DELETE",
      module: "recycle_bin",
      recordId: ids.join(","),
      description: `Bulk permanently deleted ${deletedCount} recycle bin entries`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} recycle bin items`,
    });
  }),
);

router.post(
  "/empty",
  requirePermission("recycle_bin", "delete"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const entries = await (prisma as any).recycleBinEntry.findMany({
      where: { tenantId, restoredAt: null },
    });

    let deletedCount = 0;
    for (const entry of entries) {
      try {
        await permanentlyDeleteRecycledRecord({
          entityType: entry.entityType,
          recordId: entry.recordId,
        });
        await (prisma as any).recycleBinEntry.delete({ where: { id: entry.id } });
        deletedCount++;
      } catch (err: any) {
        console.error(`Failed to empty recycle entry ${entry.id}:`, err?.message);
      }
    }

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: "DELETE",
      module: "recycle_bin",
      description: `Emptied recycle bin, permanently removing ${deletedCount} items`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Emptied recycle bin. ${deletedCount} items permanently deleted`,
    });
  }),
);

router.post(
  "/:id/restore",
  requirePermission("recycle_bin", "restore"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const entry = await (prisma as any).recycleBinEntry.findFirst({
      where: { id: req.params.id as string, tenantId },
    });

    if (!entry) {
      throw ApiError.notFound("Recycle bin entry not found");
    }

    if (entry.restoredAt) {
      throw ApiError.badRequest("This entry is already restored");
    }

    await restoreRecycleBinEntry({
      id: entry.id,
      entityType: entry.entityType,
      payload: entry.payload,
    });

    await (prisma as any).recycleBinEntry.update({
      where: { id: entry.id },
      data: {
        restoredAt: new Date(),
        restoredById: req.user?.id,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: "RESTORE",
      module: "recycle_bin",
      recordId: entry.recordId,
      description: `Restored ${entry.entityType} (${entry.recordLabel || entry.recordId}) from recycle bin`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `${entry.recordLabel || entry.recordId} restored successfully`,
    });
  }),
);

router.delete(
  "/:id",
  requirePermission("recycle_bin", "delete"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const entry = await (prisma as any).recycleBinEntry.findFirst({
      where: { id: req.params.id as string, tenantId },
    });

    if (!entry) {
      throw ApiError.notFound("Recycle bin entry not found");
    }

    if (!entry.restoredAt) {
      await permanentlyDeleteRecycledRecord({
        entityType: entry.entityType,
        recordId: entry.recordId,
      });
    }

    await (prisma as any).recycleBinEntry.delete({ where: { id: entry.id } });

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: "DELETE",
      module: "recycle_bin",
      recordId: entry.recordId,
      description: `Permanently deleted recycle bin entry for ${entry.entityType} (${entry.recordLabel || entry.recordId})`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Recycle bin entry permanently deleted",
    });
  }),
);

export default router;

