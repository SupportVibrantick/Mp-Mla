import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { validateAssignment } from "../../../services/task/taskAssignment.service.js";

/**
 * POST /api/admin/janata-darbar/:id/tokens
 * Register visitor and issue token
 */
export async function registerVisitorToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const data = req.body;

    const session = await prisma.janataDarbarSession.findFirst({
      where: { id: sessionId, tenantId, isDeleted: false },
    });
    if (!session) throw ApiError.notFound("Session not found");
    if (session.status !== "ONGOING" && session.status !== "SCHEDULED") {
      throw ApiError.badRequest("Can only register visitors for scheduled or ongoing sessions.");
    }

    const count = await prisma.janataDarbarToken.count({
      where: { sessionId, tenantId },
    });
    const nextNum = count + 1;
    const tokenNumber = `JD-${String(nextNum).padStart(3, "0")}`;

    if (data.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId, isDeleted: false },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    const token = await prisma.janataDarbarToken.create({
      data: {
        tenantId,
        sessionId,
        tokenNumber,
        visitorName: data.visitorName,
        phone: data.phone || null,
        address: data.address || null,
        purpose: data.purpose || null,
        wardId: data.wardId || null,
        status: "WAITING",
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "janata_darbar",
      recordId: token.id,
      description: `Visitor ${token.visitorName} registered in session ${session.sessionNumber} with token ${tokenNumber}`,
      newData: token,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Token ${tokenNumber} issued successfully`,
      data: token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/janata-darbar/:id/tokens/:tokenId/call
 */
export async function callToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const tokenId = req.params.tokenId as string;

    const token = await prisma.janataDarbarToken.findFirst({
      where: { id: tokenId, sessionId, tenantId },
    });
    if (!token) throw ApiError.notFound("Token not found");

    const updated = await prisma.janataDarbarToken.update({
      where: { id: tokenId },
      data: { status: "CALLED" },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "janata_darbar",
      recordId: tokenId,
      description: `Called visitor token ${token.tokenNumber}`,
      oldData: { status: token.status },
      newData: { status: "CALLED" },
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/janata-darbar/:id/tokens/:tokenId/start
 */
export async function startToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const tokenId = req.params.tokenId as string;

    const token = await prisma.janataDarbarToken.findFirst({
      where: { id: tokenId, sessionId, tenantId },
    });
    if (!token) throw ApiError.notFound("Token not found");

    const updated = await prisma.janataDarbarToken.update({
      where: { id: tokenId },
      data: { status: "IN_PROGRESS" },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "janata_darbar",
      recordId: tokenId,
      description: `Started handling visitor token ${token.tokenNumber}`,
      oldData: { status: token.status },
      newData: { status: "IN_PROGRESS" },
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/janata-darbar/:id/tokens/:tokenId/resolve
 */
export async function resolveToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const tokenId = req.params.tokenId as string;
    const { notes } = req.body;

    const token = await prisma.janataDarbarToken.findFirst({
      where: { id: tokenId, sessionId, tenantId },
    });
    if (!token) throw ApiError.notFound("Token not found");

    const updated = await prisma.janataDarbarToken.update({
      where: { id: tokenId },
      data: { status: "RESOLVED", notes: notes || token.notes },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "janata_darbar",
      recordId: tokenId,
      description: `Resolved visitor token ${token.tokenNumber}`,
      oldData: { status: token.status },
      newData: { status: "RESOLVED", notes },
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/janata-darbar/:id/tokens/:tokenId/refer
 */
export async function referToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const tokenId = req.params.tokenId as string;
    const { assignedOfficerId, departmentId, notes } = req.body;

    const token = await prisma.janataDarbarToken.findFirst({
      where: { id: tokenId, sessionId, tenantId },
    });
    if (!token) throw ApiError.notFound("Token not found");

    // Department compliance checks
    if (assignedOfficerId || departmentId) {
      await validateAssignment(tenantId, assignedOfficerId || "", departmentId || "");
    }

    const updated = await prisma.janataDarbarToken.update({
      where: { id: tokenId },
      data: {
        status: "REFERRED",
        assignedOfficerId: assignedOfficerId || null,
        departmentId: departmentId || null,
        notes: notes || token.notes,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "janata_darbar",
      recordId: tokenId,
      description: `Referred visitor token ${token.tokenNumber} to officer/department`,
      oldData: { status: token.status },
      newData: { status: "REFERRED", assignedOfficerId, departmentId, notes },
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/janata-darbar/:id/tokens/:tokenId/absent
 */
export async function markTokenAbsent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const tokenId = req.params.tokenId as string;

    const token = await prisma.janataDarbarToken.findFirst({
      where: { id: tokenId, sessionId, tenantId },
    });
    if (!token) throw ApiError.notFound("Token not found");

    const updated = await prisma.janataDarbarToken.update({
      where: { id: tokenId },
      data: { status: "ABSENT" },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "janata_darbar",
      recordId: tokenId,
      description: `Marked visitor token ${token.tokenNumber} as absent`,
      oldData: { status: token.status },
      newData: { status: "ABSENT" },
      ...getRequestMeta(req),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/janata-darbar/:id/queue
 */
export async function getSessionQueue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;

    const session = await prisma.janataDarbarSession.findFirst({
      where: { id: sessionId, tenantId, isDeleted: false },
    });
    if (!session) throw ApiError.notFound("Session not found");

    const [
      currentToken,
      nextToken,
      waitingCount,
      completedCount,
    ] = await Promise.all([
      // Current token in progress or called
      prisma.janataDarbarToken.findFirst({
        where: { sessionId, tenantId, status: { in: ["IN_PROGRESS", "CALLED"] } },
        orderBy: { tokenNumber: "desc" },
      }),
      // Next waiting token
      prisma.janataDarbarToken.findFirst({
        where: { sessionId, tenantId, status: "WAITING" },
        orderBy: { tokenNumber: "asc" },
      }),
      prisma.janataDarbarToken.count({ where: { sessionId, tenantId, status: "WAITING" } }),
      prisma.janataDarbarToken.count({ where: { sessionId, tenantId, status: { in: ["RESOLVED", "REFERRED"] } } }),
    ]);

    res.json({
      success: true,
      data: {
        currentToken: currentToken || null,
        nextToken: nextToken || null,
        waitingCount,
        completedCount,
      },
    });
  } catch (error) {
    next(error);
  }
}
