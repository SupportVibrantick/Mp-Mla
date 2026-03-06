import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";


/**
 * DELETE /api/admin/ward/:id
 * Deletes a ward.
 */

export async function deleteWard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardId = req.params.id as string;

    const ward = await prisma.ward.findUnique({
      where: { id: wardId },
      include: {
        _count: {
          select: { grievances: true, projects: true, institutions: true },
        },
      },
    });

    if (!ward) throw ApiError.notFound("Ward not found");

    const total =
      ward._count.grievances + ward._count.projects + ward._count.institutions;
    if (total > 0) {
      throw ApiError.badRequest(
        `Cannot delete ward with ${ward._count.grievances} grievances, ${ward._count.projects} projects, and ${ward._count.institutions} institutions. Deactivate instead.`,
      );
    }

    await prisma.ward.delete({ where: { id: wardId } });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "wards",
      recordId: ward.id,
      description: `Deleted ward #${ward.wardNumber} "${ward.name}"`,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: `Ward "${ward.name}" deleted` });
  } catch (error) {
    next(error);
  }
}
