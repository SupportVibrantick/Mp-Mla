import { Request, Response, NextFunction } from "express";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * POST /competitors — Create competitor profile
 *
 * Uses req.tenantPrisma so tenantId is automatically injected (AC-3).
 */
export async function createCompetitor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);

    if (!req.tenantPrisma) {
      throw new Error("Tenant context not initialized");
    }

    const data: any = { ...req.body };

    // Clean empty string optional fields
    const optionalFields = [
      "email", "facebookUrl", "twitterUrl", "instagramUrl",
      "youtubeUrl", "websiteUrl", "candidatePhoto", "partyLogoUrl",
      "designation", "constituency", "phone", "notes",
    ];
    optionalFields.forEach((field) => {
      if (data[field] === "") delete data[field];
    });

    data.createdById = req.user!.id;

    // tenantPrisma auto-injects tenantId (no need to set data.tenantId manually)
    const competitor = await req.tenantPrisma.competitor.create({ data });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "competitors",
      recordId: competitor.id,
      description: `Added competitor "${competitor.candidateName}" (${competitor.partyName})`,
      newData: {
        candidateName: competitor.candidateName,
        partyName: competitor.partyName,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Competitor "${competitor.candidateName}" added successfully`,
      data: competitor,
    });
  } catch (error) {
    next(error);
  }
}
