import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";


export async function updateInstitution(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const institutionId = req.params.id as string;
    const old = await prisma.institution.findFirst({
      where: { id: institutionId, tenantId },
    });
    if (!old) throw ApiError.notFound("Institution not found");

    const data: any = { ...req.body };
    if (data.email === "") delete data.email;
    if (data.establishedDate)
      data.establishedDate = new Date(data.establishedDate);

    // Verify ward if changing
    if (data.wardId && data.wardId !== old.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    const institution = await prisma.institution.update({
      where: { id: institutionId },
      data,
      include: {
        ward: { select: { name: true, wardNumber: true } },
        incharges: { where: { isActive: true } },
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "institutions",
      recordId: institution.id,
      description: `Updated institution "${institution.name}"`,
      oldData: {
        name: old.name,
        category: old.category,
        status: old.status,
        capacity: old.capacity,
      },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${institution.name}" updated`,
      data: institution,
    });
  } catch (error) {
    next(error);
  }
}
