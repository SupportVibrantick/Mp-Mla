import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { syncToLeaders } from "./incharges.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function createInstitution(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { incharges, ...data } = req.body;

    // Verify ward
    const ward = await prisma.ward.findFirst({
      where: { id: data.wardId, tenantId },
    });
    if (!ward) throw ApiError.notFound("Ward not found");

    // Clean data
    if (data.email === "") delete data.email;
    if (data.establishedDate)
      data.establishedDate = new Date(data.establishedDate);

    // Build incharge create data
    const inchargeData = (incharges || []).map((ic: any) => ({
      ...ic,
      email: ic.email === "" ? undefined : ic.email,
      dateOfBirth: ic.dateOfBirth ? new Date(ic.dateOfBirth) : undefined,
      appointedDate: ic.appointedDate ? new Date(ic.appointedDate) : undefined,
    }));

    const institution = await prisma.institution.create({
      data: {
        ...data,
        tenantId,
        ...(inchargeData.length > 0
          ? {
              incharges: {
                createMany: { data: inchargeData },
              },
            }
          : {}),
      },
      include: {
        ward: { select: { name: true, wardNumber: true } },
        incharges: true,
        _count: { select: { incharges: true } },
      },
    });

    // Sync incharges to Leaders
    if (institution.incharges && institution.incharges.length > 0) {
      for (const ic of institution.incharges) {
        await syncToLeaders(ic, institution.wardId);
      }
    }

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "institutions",
      recordId: institution.id,
      description: `Created institution "${institution.name}" (${institution.category}) in ward "${institution.ward.name}" with ${inchargeData.length} incharge(s)`,
      newData: {
        name: institution.name,
        category: institution.category,
        wardId: institution.wardId,
        incharges: inchargeData.length,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `"${institution.name}" created with ${inchargeData.length} incharge(s)`,
      data: institution,
    });
  } catch (error) {
    next(error);
  }
}
