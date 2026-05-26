import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
export async function createLeader(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data: any = { ...req.body, tenantId };

    if (data.email === "") delete data.email;
    data.dateOfBirth = new Date(data.dateOfBirth);

    if (data.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    if (data.adharNumber) {
      const existingLeader = await prisma.leader.findFirst({
        where: { tenantId, adharNumber: data.adharNumber },
      });
      if (existingLeader) {
        throw ApiError.badRequest(`Leader with Aadhaar "${data.adharNumber}" already exists`);
      }
    }

    const leader = await prisma.leader.create({
      data,
      include: {
        ward: {
          select: { name: true, wardNumber: true },
        },
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "leaders",
      recordId: leader.id,
      description: `Added leader "${leader.name}" (${leader.category})`,
      newData: {
        name: leader.name,
        category: leader.category,
        dateOfBirth: leader.dateOfBirth,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `"${leader.name}" added`,
      data: leader,
    });
  } catch (error) {
    next(error);
  }
}
