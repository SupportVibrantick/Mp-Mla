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

  hinduCount: z.number().int().min(0).default(0),
  muslimCount: z.number().int().min(0).default(0),
  sikhCount: z.number().int().min(0).default(0),
  christianCount: z.number().int().min(0).default(0),
  buddhistCount: z.number().int().min(0).default(0),
  jainCount: z.number().int().min(0).default(0),
  otherReligionCount: z.number().int().min(0).default(0),
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

    const wardLevel = await prisma.demographics.findFirst({
      where: { wardId, wardAreaId: null },
      orderBy: { surveyDate: "desc" },
    });

    const areaLevel = await prisma.demographics.findMany({
      where: { wardId, wardAreaId: { not: null } },
      include: {
        wardArea: { select: { id: true, name: true, areaType: true } },
      },
      orderBy: { surveyDate: "desc" },
    });

    const totalPop = wardLevel?.totalPopulation || ward.totalPopulation || 1;

    const charts = wardLevel
      ? {
          genderDistribution: [
            { label: "Male", value: wardLevel.maleCount, color: "#3b82f6" },
            { label: "Female", value: wardLevel.femaleCount, color: "#ec4899" },
          ],
          ageDistribution: [
            { label: "0-6", value: wardLevel.age0to6 },
            { label: "7-18", value: wardLevel.age7to18 },
            { label: "19-35", value: wardLevel.age19to35 },
            { label: "36-60", value: wardLevel.age36to60 },
            { label: "60+", value: wardLevel.age60plus },
          ],
          casteDistribution: [
            { label: "General", value: wardLevel.generalCount },
            { label: "OBC", value: wardLevel.obcCount },
            { label: "SC", value: wardLevel.scCount },
            { label: "ST", value: wardLevel.stCount },
            { label: "Minority", value: wardLevel.minorityCount },
          ],
          religionDistribution: [
            { label: "Hindu", value: wardLevel.hinduCount, color: "#f97316" },
            { label: "Muslim", value: wardLevel.muslimCount, color: "#16a34a" },
            { label: "Sikh", value: wardLevel.sikhCount, color: "#2563eb" },
            {
              label: "Christian",
              value: wardLevel.christianCount,
              color: "#ef4444",
            },
            {
              label: "Buddhist",
              value: wardLevel.buddhistCount,
              color: "#ca8a04",
            },
            { label: "Jain", value: wardLevel.jainCount, color: "#9333ea" },
            {
              label: "Other",
              value: wardLevel.otherReligionCount,
              color: "#6b7280",
            },
          ].filter((r) => r.value > 0),
        }
      : null;

    res.json({ success: true, data: { wardLevel, areaLevel, charts } });
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
