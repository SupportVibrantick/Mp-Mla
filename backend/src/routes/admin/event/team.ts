import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function getTeam(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const team = await prisma.eventTeamMember.findMany({
      where: { eventId, tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, designation: true } },
      },
    });

    res.json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
}

export async function addTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const { userId, role } = req.body;

    const [event, user] = await Promise.all([
      prisma.event.findFirst({ where: { id: eventId, tenantId, isDeleted: false } }),
      prisma.user.findFirst({ where: { id: userId, tenantId, status: "ACTIVE" } }),
    ]);

    if (!event) throw ApiError.notFound("Event not found");
    if (!user) throw ApiError.badRequest("Active user not found in this tenant.");

    const member = await prisma.eventTeamMember.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { role },
      create: { tenantId, eventId, userId, role },
      include: { user: { select: { name: true } } },
    });

    await prisma.eventTimeline.create({
      data: {
        tenantId,
        eventId,
        action: "TEAM_ASSIGNED",
        description: `Team member ${member.user.name} assigned to role: ${role || "Member"}.`,
        changedById: req.user!.id,
      },
    });

    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
}

export async function removeTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const userId = req.params.userId as string;

    const member = await prisma.eventTeamMember.findFirst({
      where: { eventId, userId, tenantId },
      include: { user: { select: { name: true } } },
    });
    if (!member) throw ApiError.notFound("Team member not found");

    await prisma.eventTeamMember.delete({
      where: { id: member.id },
    });

    await prisma.eventTimeline.create({
      data: {
        tenantId,
        eventId,
        action: "TEAM_REMOVED",
        description: `Team member ${member.user.name} removed from the event team.`,
        changedById: req.user!.id,
      },
    });

    res.json({ success: true, message: "Team member successfully removed" });
  } catch (error) {
    next(error);
  }
}
