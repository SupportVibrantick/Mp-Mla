import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function getGuests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const guests = await prisma.eventGuest.findMany({
      where: { eventId, tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: guests });
  } catch (error) {
    next(error);
  }
}

export async function createGuest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const data = req.body;

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, isDeleted: false },
    });
    if (!event) throw ApiError.notFound("Event not found");

    const guest = await prisma.eventGuest.create({
      data: {
        tenantId,
        eventId,
        name: data.name,
        designation: data.designation || null,
        organization: data.organization || null,
        phone: data.phone || null,
        email: data.email || null,
        invitationStatus: data.invitationStatus || "PENDING",
        attendanceStatus: data.attendanceStatus || "PENDING",
      },
    });

    await prisma.eventTimeline.create({
      data: {
        tenantId,
        eventId,
        action: "GUEST_ADDED",
        description: `Guest "${guest.name}" (${guest.designation || "Invitee"}) added.`,
        changedById: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: guest });
  } catch (error) {
    next(error);
  }
}

export async function updateGuest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const guestId = req.params.guestId as string;
    const data = req.body;

    const guest = await prisma.eventGuest.findFirst({
      where: { id: guestId, eventId, tenantId },
    });
    if (!guest) throw ApiError.notFound("Guest not found");

    const updated = await prisma.eventGuest.update({
      where: { id: guestId },
      data: {
        name: data.name,
        designation: data.designation,
        organization: data.organization,
        phone: data.phone,
        email: data.email,
        invitationStatus: data.invitationStatus,
        attendanceStatus: data.attendanceStatus,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteGuest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const guestId = req.params.guestId as string;

    const guest = await prisma.eventGuest.findFirst({
      where: { id: guestId, eventId, tenantId },
    });
    if (!guest) throw ApiError.notFound("Guest not found");

    await prisma.eventGuest.delete({
      where: { id: guestId },
    });

    res.json({ success: true, message: "Guest successfully removed" });
  } catch (error) {
    next(error);
  }
}
