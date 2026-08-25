import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

export async function deleteEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });
    if (!event) throw ApiError.notFound("Event not found");
    if (event.isDeleted) throw ApiError.badRequest("Event is already deleted.");

    // Archive in recycle bin
    await archiveToRecycleBin({
      tenantId,
      module: "events",
      entityType: "event" as any,
      recordId: eventId,
      recordLabel: `${event.eventCode} - ${event.title}`,
      payload: event,
      deletedById: req.user!.id,
    });

    // Soft delete
    await prisma.event.update({
      where: { id: eventId },
      data: { isDeleted: true },
    });

    // Write to timeline
    await prisma.eventTimeline.create({
      data: {
        tenantId,
        eventId,
        action: "EVENT_DELETED",
        description: `Event "${event.title}" soft deleted by ${req.user!.name || req.user!.email}`,
        changedById: req.user!.id,
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "events",
      recordId: eventId,
      description: `Soft-deleted event "${event.title}" (${event.eventCode})`,
      oldData: { title: event.title, isDeleted: false },
      newData: { isDeleted: true },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Event "${event.title}" (${event.eventCode}) successfully moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
