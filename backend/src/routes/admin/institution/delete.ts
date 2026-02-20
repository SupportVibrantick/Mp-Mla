import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function deleteInstitution(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { incharges: true } } },
    });
    if (!institution) throw ApiError.notFound("Institution not found");

    // Cascade deletes incharges via schema relation
    await prisma.institution.delete({ where: { id: req.params.id } });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "institutions",
      recordId: institution.id,
      description: `Deleted institution "${institution.name}" (${institution.category}) and ${institution._count.incharges} incharge(s)`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${institution.name}" deleted`,
    });
  } catch (error) {
    next(error);
  }
}
