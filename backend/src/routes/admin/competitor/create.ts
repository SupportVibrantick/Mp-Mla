import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";

/**
 * POST /competitors — Create competitor profile
 */
export async function createCompetitor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data: any = { ...req.body };

    // Clean empty string optional fields
    const optionalFields = [
      "email",
      "facebookUrl",
      "twitterUrl",
      "instagramUrl",
      "youtubeUrl",
      "websiteUrl",
      "candidatePhoto",
      "partyLogoUrl",
      "designation",
      "constituency",
      "phone",
      "notes",
    ];
    optionalFields.forEach((field) => {
      if (data[field] === "") delete data[field];
    });

    data.createdById = req.user!.id;

    const competitor = await prisma.competitor.create({ data });

    await createAuditLog({
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
