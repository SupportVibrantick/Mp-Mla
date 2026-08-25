import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

export async function createScheme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    // Check unique name per tenant
    const existing = await prisma.scheme.findFirst({
      where: { tenantId, name: data.name, isDeleted: false },
    });
    if (existing) {
      throw ApiError.badRequest(`Scheme with name "${data.name}" already exists.`);
    }

    if (data.code) {
      const existingCode = await prisma.scheme.findFirst({
        where: { tenantId, code: data.code, isDeleted: false },
      });
      if (existingCode) {
        throw ApiError.badRequest(`Scheme with code "${data.code}" already exists.`);
      }
    }

    const scheme = await prisma.scheme.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code || null,
        department: data.department,
        level: data.level || "STATE",
        description: data.description || null,
        eligibility: data.eligibility || null,
        benefits: data.benefits || null,
        requiredDocuments: data.requiredDocuments || null,
        applicationUrl: data.applicationUrl || null,
        status: data.status || "ACTIVE",
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdById: req.user!.id,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "schemes",
      recordId: scheme.id,
      description: `Created government scheme "${scheme.name}"`,
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Scheme "${scheme.name}" created successfully`,
      data: scheme,
    });
  } catch (error) {
    next(error);
  }
}
