import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";

export async function deleteInstitution(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: req.params.id as string },
      include: {
        incharges: true,
        _count: { select: { incharges: true } },
      },
    });
    if (!institution) throw ApiError.notFound("Institution not found");

    if (institution.isDeleted) {
      throw ApiError.badRequest("Institution is already in recycle bin");
    }

    await archiveToRecycleBin({
      module: "institutions",
      entityType: "institution",
      recordId: institution.id,
      recordLabel: institution.name,
      payload: institution,
      deletedById: req.user?.id,
    });

    await prisma.institution.update({
      where: { id: req.params.id as string },
      data: { isDeleted: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "institutions",
      recordId: institution.id,
      description: `Moved institution "${institution.name}" (${institution.category}) to recycle bin`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${institution.name}" moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
