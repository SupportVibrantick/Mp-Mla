import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function updateLeader(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const lenderId = req.params.id as string;
    const old = await prisma.leader.findFirst({
      where: { id: lenderId, tenantId },
    });
    if (!old) throw ApiError.notFound("Leader not found");

    const data: any = { ...req.body };
    if (data.email === "") delete data.email;
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.wardId && data.wardId !== old.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }
    if (data.adharNumber && data.adharNumber !== old.adharNumber) {
      const existingLeader = await prisma.leader.findFirst({
        where: { tenantId, adharNumber: data.adharNumber },
      });
      if (existingLeader) {
        throw ApiError.badRequest(`Leader with Aadhaar "${data.adharNumber}" already exists`);
      }
    }

    const leader = await prisma.leader.update({
      where: { id: lenderId },
      data,
      include: {
        ward: { select: { name: true, wardNumber: true } },
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "leaders",
      recordId: leader.id,
      description: `Updated leader "${leader.name}"`,
      oldData: { name: old.name, category: old.category },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${leader.name}" updated`,
      data: leader,
    });
  } catch (error) {
    next(error);
  }
}
