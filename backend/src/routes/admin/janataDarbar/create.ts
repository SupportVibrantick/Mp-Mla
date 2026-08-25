import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

async function generateSessionNumber(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `JD-SESS-${currentYear}-`;

  const lastSession = await prisma.janataDarbarSession.findFirst({
    where: {
      tenantId,
      sessionNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      sessionNumber: "desc",
    },
    select: {
      sessionNumber: true,
    },
  });

  let count = 1;
  if (lastSession) {
    const parts = lastSession.sessionNumber.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      count = lastNum + 1;
    }
  }

  return `${prefix}${String(count).padStart(6, "0")}`;
}

export async function createSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    const sessionNumber = await generateSessionNumber(tenantId);
    const dateObj = new Date(data.date);
    dateObj.setHours(0, 0, 0, 0);

    const session = await prisma.janataDarbarSession.create({
      data: {
        tenantId,
        sessionNumber,
        title: data.title,
        type: data.type,
        status: "SCHEDULED",
        date: dateObj,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        description: data.description || null,
        createdById: req.user!.id,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "janata_darbar",
      recordId: session.id,
      description: `Scheduled Janata Darbar session "${session.title}" (${sessionNumber})`,
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Session "${session.title}" (${sessionNumber}) scheduled successfully`,
      data: session,
    });
  } catch (error) {
    next(error);
  }
}
