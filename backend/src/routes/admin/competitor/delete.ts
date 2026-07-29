import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * DELETE /competitors/:id — Soft-delete competitor
 */
export async function deleteCompetitor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const tenantId = requireTenantId(req);

    const existing = await prisma.competitor.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!existing) throw ApiError.notFound("Competitor not found");

    await prisma.competitor.update({
      where: { id, tenantId },
      data: { isDeleted: true, isActive: false },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "competitors",
      recordId: id,
      description: `Deleted competitor "${existing.candidateName}" (${existing.partyName})`,
      oldData: {
        candidateName: existing.candidateName,
        partyName: existing.partyName,
      },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Competitor "${existing.candidateName}" deleted`,
    });
  } catch (error) {
    next(error);
  }
}
