import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function getAttendanceList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const list = await prisma.eventAttendance.findMany({
      where: { eventId, tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
}

export async function recordAttendance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const { name, phone, category } = req.body;

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, isDeleted: false },
    });
    if (!event) throw ApiError.notFound("Event not found");

    const record = await prisma.eventAttendance.create({
      data: {
        tenantId,
        eventId,
        name,
        phone: phone || null,
        category: category || null,
        checkedInAt: new Date(),
      },
    });

    await prisma.eventTimeline.create({
      data: {
        tenantId,
        eventId,
        action: "ATTENDANCE_RECORDED",
        description: `Attendance registered for "${record.name}" (${record.category || "Attendee"}).`,
        changedById: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}

export async function checkIn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const attendanceId = req.params.attendanceId as string;

    const record = await prisma.eventAttendance.findFirst({
      where: { id: attendanceId, eventId, tenantId },
    });
    if (!record) throw ApiError.notFound("Attendance record not found");

    const updated = await prisma.eventAttendance.update({
      where: { id: attendanceId },
      data: { checkedInAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function checkOut(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const attendanceId = req.params.attendanceId as string;

    const record = await prisma.eventAttendance.findFirst({
      where: { id: attendanceId, eventId, tenantId },
    });
    if (!record) throw ApiError.notFound("Attendance record not found");

    const updated = await prisma.eventAttendance.update({
      where: { id: attendanceId },
      data: { checkedOutAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
