import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/ward/:wardId/councillors
 * Lists all councillors for a ward.
 */
export async function listCouncillors(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const wardId = req.params.wardId as string;

    const ward = await prisma.ward.findFirst({
      where: { id: wardId, tenantId },
    });
    if (!ward) throw ApiError.notFound("Ward not found");

    const councillors = await prisma.wardCouncillor.findMany({
      where: { wardId },
      include: { ward: { select: { id: true, name: true, wardNumber: true } } },
      orderBy: [{ isCurrent: "desc" }, { sinceDate: "desc" }],
    });
    res.json({ success: true, data: councillors });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/ward/:wardId/councillors
 * Creates a new councillor for a ward.
 */
export async function createCouncillor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const wardId = req.params.wardId as string;
    const ward = await prisma.ward.findFirst({
      where: { id: wardId, tenantId },
    });
    if (!ward) throw ApiError.notFound("Ward not found");

    // Allow multiple current councillors per ward
    const data: any = { tenantId, ...req.body, wardId, isCurrent: req.body.isCurrent ?? true };
    if (data.sinceDate) data.sinceDate = new Date(data.sinceDate);

    const councillor = await prisma.wardCouncillor.create({ data });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "wards",
      recordId: councillor.id,
      description: `Added ${councillor.name} as councillor of ward "${ward.name}"`,
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: "Councillor added",
      data: councillor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/ward/:wardId/councillors/:councillorId
 * Updates a councillor for a ward.
 */
export async function updateCouncillor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const councillorId = req.params.councillorId as string;

    const old = await prisma.wardCouncillor.findFirst({
      where: {
        id: councillorId,
        ward: { tenantId },
      },
    });
    if (!old) throw ApiError.notFound("Councillor not found");

    const data: any = { ...req.body };
    if (data.sinceDate) data.sinceDate = new Date(data.sinceDate);
    if (data.untilDate) data.untilDate = new Date(data.untilDate);

    const councillor = await prisma.wardCouncillor.update({
      where: { id: councillorId },
      data,
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "wards",
      recordId: councillor.id,
      description: `Updated councillor ${councillor.name}`,
      oldData: { name: old.name, isCurrent: old.isCurrent },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Councillor updated",
      data: councillor,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/ward/:wardId/councillors/:councillorId
 * Deletes a councillor for a ward.
 */
export async function deleteCouncillor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const councillorId = req.params.councillorId as string;

    const councillor = await prisma.wardCouncillor.findFirst({
      where: {
        id: councillorId,
        ward: { tenantId },
      },
    });
    if (!councillor) throw ApiError.notFound("Councillor not found");

    await prisma.wardCouncillor.delete({
      where: { id: councillorId },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "wards",
      recordId: councillorId,
      description: `Deleted councillor ${councillor.name}`,
      oldData: { name: councillor.name },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Councillor deleted",
    });
  } catch (error) {
    next(error);
  }
}
