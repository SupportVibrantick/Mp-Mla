import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function deleteGrievance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const grievanceId = req.params.id as string;
    const g = await prisma.grievance.findUnique({
      where: { id: grievanceId },
    });
    if (!g) throw ApiError.notFound("Grievance not found");

    await prisma.grievance.delete({
      where: { id: grievanceId },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "grievances",
      recordId: g.id,
      description: `Deleted grievance ${g.ticketNumber}`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `${g.ticketNumber} deleted`,
    });
  } catch (error) {
    next(error);
  }
}
