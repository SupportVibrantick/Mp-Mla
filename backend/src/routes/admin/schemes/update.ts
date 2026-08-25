import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

export async function updateScheme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const schemeId = req.params.id as string;
    const data = req.body;

    const old = await prisma.scheme.findFirst({
      where: { id: schemeId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Scheme not found");

    // Check unique name if changed
    if (data.name && data.name !== old.name) {
      const existing = await prisma.scheme.findFirst({
        where: { tenantId, name: data.name, isDeleted: false },
      });
      if (existing) {
        throw ApiError.badRequest(`Scheme with name "${data.name}" already exists.`);
      }
    }

    const scheme = await prisma.scheme.update({
      where: { id: schemeId },
      data: {
        name: data.name,
        code: data.code,
        department: data.department,
        level: data.level,
        description: data.description,
        eligibility: data.eligibility,
        benefits: data.benefits,
        requiredDocuments: data.requiredDocuments,
        applicationUrl: data.applicationUrl,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "schemes",
      recordId: schemeId,
      description: `Updated government scheme "${scheme.name}"`,
      oldData: old as any,
      newData: scheme as any,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Scheme "${scheme.name}" updated successfully`,
      data: scheme,
    });
  } catch (error) {
    next(error);
  }
}
