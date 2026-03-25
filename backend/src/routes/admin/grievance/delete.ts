import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";

export async function deleteGrievance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const grievanceId = req.params.id as string;
    const g = await prisma.grievance.findUnique({
      where: { id: grievanceId },
      include: {
        timeline: true,
        attachments: true,
      },
    });
    if (!g) throw ApiError.notFound("Grievance not found");

    if (g.isDeleted) {
      throw ApiError.badRequest("Grievance is already in recycle bin");
    }

    await archiveToRecycleBin({
      module: "grievances",
      entityType: "grievance",
      recordId: g.id,
      recordLabel: g.ticketNumber,
      payload: g,
      deletedById: req.user?.id,
    });

    await prisma.grievance.update({
      where: { id: grievanceId },
      data: { isDeleted: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "grievances",
      recordId: g.id,
      description: `Moved grievance ${g.ticketNumber} to recycle bin`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `${g.ticketNumber} moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
