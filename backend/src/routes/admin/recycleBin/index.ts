import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { parsePagination, buildPagination } from "../../../utils/helpers.js";
import catchAsync from "@/utils/catchAsync.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  permanentlyDeleteRecycledRecord,
  restoreRecycleBinEntry,
} from "../../../lib/recycleBin.js";

const router = Router();

router.get(
  "/",
  requirePermission("recycle_bin", "read"),
  catchAsync(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { module, entityType, search } = req.query as Record<string, string>;

    const where: any = { restoredAt: null };

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
        where: { restoredAt: null },
        select: { module: true },
        distinct: ["module"],
        orderBy: { module: "asc" },
      }),
      (prisma as any).recycleBinEntry.findMany({
        where: { restoredAt: null },
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
  "/:id/restore",
  requirePermission("recycle_bin", "restore"),
  catchAsync(async (req, res) => {
    const entry = await (prisma as any).recycleBinEntry.findUnique({
      where: { id: req.params.id as string },
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
    const entry = await (prisma as any).recycleBinEntry.findUnique({
      where: { id: req.params.id as string },
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

