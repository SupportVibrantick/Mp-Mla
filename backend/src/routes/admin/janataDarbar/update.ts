import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

export async function updateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const data = req.body;

    const old = await prisma.janataDarbarSession.findFirst({
      where: { id: sessionId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Session not found");

    if (old.status === "COMPLETED" || old.status === "CANCELLED") {
      throw ApiError.badRequest("Cannot update completed or cancelled sessions.");
    }

    const updateData: any = {
      title: data.title,
      type: data.type,
      location: data.location,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
    };

    if (data.date) {
      const dObj = new Date(data.date);
      dObj.setHours(0, 0, 0, 0);
      updateData.date = dObj;
    }

    const session = await prisma.janataDarbarSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "janata_darbar",
      recordId: sessionId,
      description: `Updated Janata Darbar session "${session.title}" (${session.sessionNumber})`,
      oldData: old as any,
      newData: session as any,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Session "${session.title}" updated successfully`,
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

export async function transitionSessionStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const { status } = req.body; // ONGOING, COMPLETED, CANCELLED

    const old = await prisma.janataDarbarSession.findFirst({
      where: { id: sessionId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Session not found");

    if (old.status === "COMPLETED" || old.status === "CANCELLED") {
      throw ApiError.badRequest("Cannot change status of a completed or cancelled session.");
    }

    const session = await prisma.janataDarbarSession.update({
      where: { id: sessionId },
      data: { status },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "janata_darbar",
      recordId: sessionId,
      description: `Transitioned Janata Darbar session (${session.sessionNumber}) status from ${old.status} to ${status}`,
      oldData: { status: old.status },
      newData: { status },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Session status transitioned to ${status}`,
      data: session,
    });
  } catch (error) {
    next(error);
  }
}
