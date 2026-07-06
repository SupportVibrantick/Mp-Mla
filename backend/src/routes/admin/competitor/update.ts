import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../utils/ApiError.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * PUT /competitors/:id — Update competitor profile
 *
 * Uses req.tenantPrisma so reads/writes are scoped to the authenticated tenant (AC-3).
 */
export async function updateCompetitor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);

    if (!req.tenantPrisma) {
      throw new Error("Tenant context not initialized");
    }

    const id = req.params.id as string;
    const data: any = { ...req.body };

    const existing = await req.tenantPrisma.competitor.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) throw ApiError.notFound("Competitor not found");

    // Clean empty string optional fields
    const optionalFields = [
      "email", "facebookUrl", "twitterUrl", "instagramUrl",
      "youtubeUrl", "websiteUrl", "candidatePhoto", "partyLogoUrl",
      "designation", "constituency", "phone", "notes",
    ];
    optionalFields.forEach((field) => {
      if (data[field] === "") data[field] = null;
    });

    const updated = await req.tenantPrisma.competitor.update({
      where: { id },
      data,
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "competitors",
      recordId: updated.id,
      description: `Updated competitor "${updated.candidateName}"`,
      oldData: { candidateName: existing.candidateName, partyName: existing.partyName },
      newData: { candidateName: updated.candidateName, partyName: updated.partyName },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Competitor "${updated.candidateName}" updated`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
