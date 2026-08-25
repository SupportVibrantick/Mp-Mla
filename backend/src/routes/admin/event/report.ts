import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function getReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const report = await prisma.eventReport.findFirst({
      where: { eventId, tenantId },
    });

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

export async function upsertReport(
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

    const report = await prisma.eventReport.upsert({
      where: { eventId },
      update: {
        summary: data.summary,
        highlights: data.highlights,
        issues: data.issues,
        decisions: data.decisions,
        outcomes: data.outcomes,
        remarks: data.remarks,
        attendanceCount: data.attendanceCount ? parseInt(String(data.attendanceCount), 10) : 0,
      },
      create: {
        tenantId,
        eventId,
        summary: data.summary || null,
        highlights: data.highlights || null,
        issues: data.issues || null,
        decisions: data.decisions || null,
        outcomes: data.outcomes || null,
        remarks: data.remarks || null,
        attendanceCount: data.attendanceCount ? parseInt(String(data.attendanceCount), 10) : 0,
        createdById: req.user!.id,
      },
    });

    await prisma.eventTimeline.create({
      data: {
        tenantId,
        eventId,
        action: "REPORT_CREATED",
        description: `Official event report created / updated.`,
        changedById: req.user!.id,
      },
    });

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}
