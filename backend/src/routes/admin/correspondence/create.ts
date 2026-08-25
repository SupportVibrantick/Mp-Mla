import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { generateReferenceNumber } from "./helpers.js";

/**
 * POST /api/admin/correspondence
 * Create a new incoming or outgoing letter/application
 */
export async function createCorrespondence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    const referenceNumber = await generateReferenceNumber(tenantId, data.type);

    const correspondence = await prisma.$transaction(async (tx) => {
      const corr = await tx.correspondence.create({
        data: {
          tenantId,
          referenceNumber,
          type: data.type,
          subject: data.subject,
          description: data.description || null,
          senderName: data.senderName || null,
          senderPhone: data.senderPhone || null,
          senderEmail: data.senderEmail || null,
          senderAddress: data.senderAddress || null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          departmentId: data.departmentId || null,
          status: "RECEIVED",
          createdById: req.user!.id,
        },
      });

      // Write initial timeline entry
      await tx.correspondenceTimeline.create({
        data: {
          tenantId,
          correspondenceId: corr.id,
          action: "RECEIVED",
          comment: `Correspondence registered with Reference Number ${referenceNumber}`,
          changedById: req.user!.id,
        },
      });

      return corr;
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "correspondence",
      recordId: correspondence.id,
      description: `CORRESPONDENCE_CREATED: Registered ${correspondence.type} reference "${correspondence.referenceNumber}"`,
      newData: correspondence,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `${correspondence.type} created successfully with Ref: ${correspondence.referenceNumber}`,
      data: correspondence,
    });
  } catch (error) {
    next(error);
  }
}
