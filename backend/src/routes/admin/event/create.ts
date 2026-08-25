import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { generateEventCode } from "../../../services/event/eventCode.service.js";

export async function createEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    // Validate organizer if provided
    if (data.organizerId) {
      const user = await prisma.user.findFirst({
        where: { id: data.organizerId, tenantId, status: "ACTIVE" },
      });
      if (!user) {
        throw ApiError.badRequest("Organizer must be an active user in this organization.");
      }
    }

    // Validate ward if provided
    if (data.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId, isDeleted: false },
      });
      if (!ward) {
        throw ApiError.notFound("Ward not found.");
      }
    }

    const eventCode = await generateEventCode(tenantId);

    const event = await prisma.event.create({
      data: {
        tenantId,
        eventCode,
        title: data.title,
        description: data.description || null,
        type: data.type,
        status: data.status || "DRAFT",
        mode: data.mode || "OFFLINE",
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        location: data.location || null,
        address: data.address || null,
        meetingLink: data.meetingLink || null,
        latitude: data.latitude ? parseFloat(String(data.latitude)) : null,
        longitude: data.longitude ? parseFloat(String(data.longitude)) : null,
        wardId: data.wardId || null,
        organizerId: data.organizerId || null,
        createdById: req.user!.id,
      },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        ward: { select: { id: true, name: true, wardNumber: true } },
      },
    });

    // Write timeline
    await prisma.eventTimeline.create({
      data: {
        tenantId,
        eventId: event.id,
        action: "EVENT_CREATED",
        description: `Event "${event.title}" (${eventCode}) created.`,
        changedById: req.user!.id,
      },
    });

    // Notify organizer if created by another user
    if (event.organizerId && event.organizerId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          tenantId,
          userId: event.organizerId,
          channel: "IN_APP",
          title: "New Event Assigned",
          message: `You have been assigned as the organizer for event "${event.title}" (${eventCode}).`,
          status: "PENDING",
        },
      });
    }

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "events",
      recordId: event.id,
      description: `Created event "${event.title}" (${eventCode})`,
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Event "${event.title}" (${eventCode}) created successfully`,
      data: event,
    });
  } catch (error) {
    next(error);
  }
}
