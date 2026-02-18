import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";

export const wardDemographicsSchema = z.object({
  wardAreaId: z.string().optional().nullable(),
  totalPopulation: z.number().int().min(0).default(0),
  maleCount: z.number().int().min(0).default(0),
  femaleCount: z.number().int().min(0).default(0),
  transgenderCount: z.number().int().min(0).default(0),
  age0to6: z.number().int().min(0).default(0),
  age7to18: z.number().int().min(0).default(0),
  age19to35: z.number().int().min(0).default(0),
  age36to60: z.number().int().min(0).default(0),
  age60plus: z.number().int().min(0).default(0),
  totalHouseholds: z.number().int().min(0).default(0),
  bplHouseholds: z.number().int().min(0).default(0),
  aplHouseholds: z.number().int().min(0).default(0),
  generalCount: z.number().int().min(0).default(0),
  obcCount: z.number().int().min(0).default(0),
  scCount: z.number().int().min(0).default(0),
  stCount: z.number().int().min(0).default(0),
  minorityCount: z.number().int().min(0).default(0),
  otherCount: z.number().int().min(0).default(0),
  literacyRate: z.number().min(0).max(100).optional(),
  maleLiteracyRate: z.number().min(0).max(100).optional(),
  femaleLiteracyRate: z.number().min(0).max(100).optional(),
  totalVoters: z.number().int().min(0).default(0),
  maleVoters: z.number().int().min(0).default(0),
  femaleVoters: z.number().int().min(0).default(0),
  source: z.string().optional(),
  notes: z.string().optional(),
  surveyDate: z.string().datetime().optional(),
});

export async function getWardDemographics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardId = req.params.wardId as string;

    const ward = await prisma.ward.findUnique({ where: { id: wardId } });
    if (!ward) throw ApiError.notFound("Ward not found");

    // Ward-level demographics
    const wardLevel = await prisma.demographics.findFirst({
      where: { wardId, wardAreaId: null },
      orderBy: { surveyDate: "desc" },
    });

    // Area-level demographics
    const areaLevel = await prisma.demographics.findMany({
      where: { wardId, wardAreaId: { not: null } },
      include: {
        wardArea: { select: { id: true, name: true, areaType: true } },
      },
      orderBy: { surveyDate: "desc" },
    });

    // Gender summary
    const genderDistribution = [
      {
        label: "Male",
        value: wardLevel?.maleCount || ward.totalMale,
        color: "#3b82f6",
      },
      {
        label: "Female",
        value: wardLevel?.femaleCount || ward.totalFemale,
        color: "#ec4899",
      },
    ];

    // Age summary
    const ageDistribution = wardLevel
      ? [
          { label: "0-6", value: wardLevel.age0to6 },
          { label: "7-18", value: wardLevel.age7to18 },
          { label: "19-35", value: wardLevel.age19to35 },
          { label: "36-60", value: wardLevel.age36to60 },
          { label: "60+", value: wardLevel.age60plus },
        ]
      : [];

    // Social category summary
    const categoryDistribution = wardLevel
      ? [
          { label: "General", value: wardLevel.generalCount },
          { label: "OBC", value: wardLevel.obcCount },
          { label: "SC", value: wardLevel.scCount },
          { label: "ST", value: wardLevel.stCount },
          { label: "Minority", value: wardLevel.minorityCount },
          { label: "Other", value: wardLevel.otherCount },
        ]
      : [];

    res.json({
      success: true,
      data: {
        wardLevel,
        areaLevel,
        charts: { genderDistribution, ageDistribution, categoryDistribution },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function upsertWardDemographics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardId = req.params.wardId as string;

    const ward = await prisma.ward.findUnique({ where: { id: wardId } });
    if (!ward) throw ApiError.notFound("Ward not found");

    const data: any = { ...req.body, wardId };
    if (data.surveyDate) data.surveyDate = new Date(data.surveyDate);
    else data.surveyDate = new Date();

    // Check if record exists for this ward+area combo
    const existing = await prisma.demographics.findFirst({
      where: { wardId, wardAreaId: data.wardAreaId || null },
      orderBy: { surveyDate: "desc" },
    });

    let demographics;
    if (existing) {
      demographics = await prisma.demographics.update({
        where: { id: existing.id },
        data,
      });
    } else {
      demographics = await prisma.demographics.create({ data });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: existing ? "UPDATE" : "CREATE",
      module: "demographics",
      recordId: demographics.id,
      description: `${existing ? "Updated" : "Created"} demographics for ward "${ward.name}"`,
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Demographics saved",
      data: demographics,
    });
  } catch (error) {
    next(error);
  }
}
