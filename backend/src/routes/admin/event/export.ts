import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/events/export
 * Flat export for Excel/CSV lists.
 */
export async function exportEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);

    const events = await prisma.event.findMany({
      where: { tenantId, isDeleted: false },
      include: {
        organizer: { select: { name: true, email: true } },
        ward: { select: { name: true, wardNumber: true } },
        _count: {
          select: { team: true, guests: true, attendance: true, tasks: true },
        },
      },
      orderBy: { startDate: "asc" },
    });

    const flatData = events.map((e) => ({
      eventCode: e.eventCode,
      title: e.title,
      description: e.description || "",
      type: e.type,
      status: e.status,
      mode: e.mode,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate ? e.endDate.toISOString() : "",
      location: e.location || "",
      address: e.address || "",
      meetingLink: e.meetingLink || "",
      wardName: e.ward ? `${e.ward.name} (Ward ${e.ward.wardNumber})` : "",
      organizerName: e.organizer?.name || "",
      organizerEmail: e.organizer?.email || "",
      teamMembersCount: e._count.team,
      guestsCount: e._count.guests,
      attendanceCount: e._count.attendance,
      followUpTasksCount: e._count.tasks,
      createdAt: e.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: flatData,
    });
  } catch (error) {
    next(error);
  }
}
