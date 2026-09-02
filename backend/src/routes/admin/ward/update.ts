import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * PUT /api/admin/ward/:id
 * Updates an existing ward.
 */
export async function updateWard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const wardId = req.params.id as string;

    const old = await prisma.ward.findFirst({ where: { id: wardId, tenantId } });
    if (!old) throw ApiError.notFound("Ward not found");

    const updateData: any = { ...req.body };

    if (updateData.constituencyId === "") updateData.constituencyId = null;
    if (updateData.townVillageId === "") updateData.townVillageId = null;

    if (updateData.constituencyId) {
      const constituency = await prisma.constituency.findFirst({
        where: { id: updateData.constituencyId, tenantId, isDeleted: false },
      });
      if (!constituency) {
        throw ApiError.badRequest(
          "Selected constituency does not belong to this organization or is deleted.",
        );
      }
    }

    if (updateData.townVillageId) {
      const townVillage = await prisma.townVillage.findFirst({
        where: { id: updateData.townVillageId, tenantId, isDeleted: false },
      });
      if (!townVillage) {
        throw ApiError.badRequest(
          "Selected Town/Village does not belong to this organization or is deleted.",
        );
      }
    }

    if (updateData.establishedDate) {
      updateData.establishedDate = new Date(updateData.establishedDate);
    }

    const ward = await prisma.ward.update({
      where: { id: wardId },
      data: updateData,
      include: {
        areas: true,
        councillors: { where: { isCurrent: true }, orderBy: { sinceDate: "desc" } },
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "wards",
      recordId: ward.id,
      description: `Updated ward #${ward.wardNumber} "${ward.name}"`,
      oldData: { name: old.name, zone: old.zone, status: old.status },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: "Ward updated", data: ward });
  } catch (error) {
    next(error);
  }
}
