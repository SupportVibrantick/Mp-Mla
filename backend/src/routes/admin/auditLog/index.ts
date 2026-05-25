import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import { parsePagination, buildPagination } from "../../../utils/helpers.js";
import { ApiError } from "../../../utils/ApiError.js";
import catchAsync from "@/utils/catchAsync.js";
import { requireTenantId } from "../../../utils/tenant.js";

const router = Router();

// ════════════════════════════════════════════════════════
// LIST AUDIT LOGS
// ════════════════════════════════════════════════════════

router.get(
  "/",
  requirePermission("audit_logs", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const { userId, action, module, search, dateFrom, dateTo, recordId } =
      req.query as Record<string, string>;

    const where: any = { tenantId };
    if (userId) where.userId = userId;
    if (action && action !== "all") where.action = action;
    if (module && module !== "all") where.module = module;
    if (recordId) where.recordId = recordId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59Z");
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { ipAddress: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      pagination: buildPagination(total, page, limit),
    });
  }),
);

// ════════════════════════════════════════════════════════
// GET SINGLE LOG DETAIL
// ════════════════════════════════════════════════════════

router.get(
  "/:id",
  requirePermission("audit_logs", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const log = await prisma.auditLog.findFirst({
      where: { id: req.params.id as string, tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!log) throw ApiError.notFound("Audit log not found");
    res.json({ success: true, data: log });
  }),
);

// ════════════════════════════════════════════════════════
// STATS / SUMMARY
// ════════════════════════════════════════════════════════

router.get(
  "/meta/stats",
  requirePermission("audit_logs", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      total,
      todayCount,
      weekCount,
      byAction,
      byModule,
      byUser,
      recentUsers,
    ] = await Promise.all([
      prisma.auditLog.count({ where: { tenantId } }),
      prisma.auditLog.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      prisma.auditLog.count({ where: { tenantId, createdAt: { gte: weekAgo } } }),
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: true,
        where: { tenantId },
        orderBy: { _count: { action: "desc" } },
      }),
      prisma.auditLog.groupBy({
        by: ["module"],
        _count: true,
        where: { tenantId },
        orderBy: { _count: { module: "desc" } },
        take: 10,
      }),
      prisma.auditLog.groupBy({
        by: ["userId"],
        _count: true,
        where: { tenantId },
        orderBy: { _count: { userId: "desc" } },
        take: 10,
      }),
      prisma.auditLog.findMany({
        select: { userId: true, user: { select: { name: true } } },
        where: { tenantId },
        distinct: ["userId"],
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    // Resolve user names for top users
    const userIds = byUser
      .map((u) => u.userId)
      .filter((id): id is string => id !== null && id !== undefined);
    const users = await prisma.user.findMany({
      where: { tenantId, id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // All distinct modules and actions for filters
    const allModules = await prisma.auditLog.findMany({
      where: { tenantId },
      select: { module: true },
      distinct: ["module"],
      orderBy: { module: "asc" },
    });
    const allActions = await prisma.auditLog.findMany({
      where: { tenantId },
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    });

    res.json({
      success: true,
      data: {
        total,
        todayCount,
        weekCount,
        byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
        byModule: byModule.map((m) => ({ module: m.module, count: m._count })),
        byUser: byUser.map((u) => ({
          userId: u.userId,
          user: u.userId ? userMap.get(u.userId) : null,
          count: u._count,
        })),
        modules: allModules.map((m) => m.module),
        actions: allActions.map((a) => a.action),
        recentUsers: recentUsers.map((u) => ({
          id: u.userId,
          name: u.user?.name,
        })),
      },
    });
  }),
);

// ════════════════════════════════════════════════════════
// EXPORT CSV
// ════════════════════════════════════════════════════════

router.get(
  "/meta/export",
  requirePermission("audit_logs", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const {
      userId,
      action,
      module: mod,
      dateFrom,
      dateTo,
    } = req.query as Record<string, string>;
    const where: any = { tenantId };
    if (userId) where.userId = userId;
    if (action && action !== "all") where.action = action;
    if (mod && mod !== "all") where.module = mod;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59Z");
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    let csv =
      "createdAt,User,Email,Action,Module,Description,IP Address,Record ID\n";
    logs.forEach((l) => {
      csv += `"${l.createdAt.toISOString()}","${l.user?.name || ""}","${l.user?.email || ""}","${l.action}","${l.module || ""}","${(l.description || "").replace(/"/g, '""')}","${l.ipAddress || ""}","${l.recordId || ""}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
    );
    res.send(csv);
  }),
);

export default router;
