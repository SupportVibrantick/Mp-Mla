import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function getTimeline(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const timeline = await prisma.eventTimeline.findMany({
      where: { eventId, tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: timeline });
  } catch (error) {
    next(error);
  }
}
