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
    const g = await prisma.grievance.findUnique({
      where: { id: req.params.id },
    });
    if (!g) throw ApiError.notFound("Grievance not found");

    await prisma.grievance.delete({
      where: { id: req.params.id },
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
