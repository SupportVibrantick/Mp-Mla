import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

export async function deleteScheme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const schemeId = req.params.id as string;

    const scheme = await prisma.scheme.findFirst({
      where: { id: schemeId, tenantId },
    });
    if (!scheme) throw ApiError.notFound("Scheme not found");
    if (scheme.isDeleted) throw ApiError.badRequest("Scheme is already deleted.");

    // Archive in recycle bin
    await archiveToRecycleBin({
      tenantId,
      module: "schemes",
      entityType: "scheme" as any,
      recordId: schemeId,
      recordLabel: scheme.name,
      payload: scheme,
      deletedById: req.user!.id,
    });

    // Soft delete
    await prisma.scheme.update({
      where: { id: schemeId },
      data: { isDeleted: true },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "schemes",
      recordId: schemeId,
      description: `Soft-deleted government scheme "${scheme.name}"`,
      oldData: { name: scheme.name, isDeleted: false },
      newData: { isDeleted: true },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Scheme "${scheme.name}" successfully moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
