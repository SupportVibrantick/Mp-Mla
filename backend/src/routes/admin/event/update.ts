import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { applyTransition } from "../../../services/event/eventWorkflow.service.js";

export async function updateEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const oldEvent = await prisma.event.findFirst({
      where: { id: eventId, tenantId, isDeleted: false },
    });
    if (!oldEvent) throw ApiError.notFound("Event not found");

    const data = req.body;

    // Validate organizer if changed
    if (data.organizerId && data.organizerId !== oldEvent.organizerId) {
      const user = await prisma.user.findFirst({
        where: { id: data.organizerId, tenantId, status: "ACTIVE" },
      });
      if (!user) {
        throw ApiError.badRequest("Organizer must be an active user in this organization.");
      }
    }

    // Validate ward if changed
    if (data.wardId && data.wardId !== oldEvent.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId, isDeleted: false },
      });
      if (!ward) {
        throw ApiError.notFound("Ward not found.");
      }
    }

    // Capture changed details for timeline comment
    const changes: string[] = [];
    if (data.title && data.title !== oldEvent.title) changes.push("title");
    if (data.description !== undefined && data.description !== oldEvent.description) changes.push("description");
    if (data.type && data.type !== oldEvent.type) changes.push("type");
    if (data.mode && data.mode !== oldEvent.mode) changes.push("mode");
    if (data.startDate && new Date(data.startDate).getTime() !== new Date(oldEvent.startDate).getTime()) changes.push("startDate");
    if (data.location !== undefined && data.location !== oldEvent.location) changes.push("location");
    if (data.address !== undefined && data.address !== oldEvent.address) changes.push("address");
    if (data.meetingLink !== undefined && data.meetingLink !== oldEvent.meetingLink) changes.push("meetingLink");

    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        mode: data.mode,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : data.endDate === null ? null : undefined,
        location: data.location,
        address: data.address,
        meetingLink: data.meetingLink,
        latitude: data.latitude ? parseFloat(String(data.latitude)) : undefined,
        longitude: data.longitude ? parseFloat(String(data.longitude)) : undefined,
        wardId: data.wardId,
        organizerId: data.organizerId,
      },
    });

    if (changes.length > 0) {
      await prisma.eventTimeline.create({
        data: {
          tenantId,
          eventId,
          action: "EVENT_UPDATED",
          description: `Event fields updated: ${changes.join(", ")}`,
          changedById: req.user!.id,
          metadata: { changes },
        },
      });
    }

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "events",
      recordId: event.id,
      description: `Updated event "${event.title}" (${event.eventCode})`,
      oldData: oldEvent as any,
      newData: event as any,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Event "${event.title}" updated successfully`,
      data: event,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/events/:id/status
 * Changes status using transitions checker.
 */
export async function changeStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const { status, comment } = req.body;

    const old = await prisma.event.findFirst({
      where: { id: eventId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Event not found");

    const event = await applyTransition(eventId, tenantId, status, {
      comment,
      user: req.user!,
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "events",
      recordId: eventId,
      description: `${event.eventCode}: ${old.status} → ${status}`,
      oldData: { status: old.status },
      newData: { status },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Event status transitioned to ${status}`,
      data: event,
    });
  } catch (error) {
    next(error);
  }
}
