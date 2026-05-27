import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/ward/:wardId/demographics
 * Gets demographics for a ward.
 */
export async function getWardDemographics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const wardId = req.params.wardId as string;
    const ward = await prisma.ward.findFirst({ where: { id: wardId, tenantId } });
    if (!ward) throw ApiError.notFound("Ward not found");

    const wardLevel = await prisma.demographics.findFirst({
      where: { tenantId, wardId, wardAreaId: null },
      orderBy: { surveyDate: "desc" },
    });

    const areaLevel = await prisma.demographics.findMany({
      where: { tenantId, wardId, wardAreaId: { not: null } },
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
        vitalStatistics: [
          { label: "Births", value: wardLevel.totalBirths, color: "#22c55e" },
          { label: "Deaths", value: wardLevel.totalDeaths, color: "#ef4444" },
          { label: "New Voters", value: wardLevel.newVotersCount, color: "#3b82f6" },
        ],
      }
      : null;

    res.json({ success: true, data: { wardLevel, areaLevel, charts } });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/ward/:wardId/demographics
 * Creates or updates demographics for a ward.
 */
export async function upsertWardDemographics(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = requireTenantId(req);
    const wardId = req.params.wardId as string;
    const ward = await prisma.ward.findFirst({ where: { id: wardId, tenantId } });
    if (!ward) throw ApiError.notFound("Ward not found");

    const incoming = { ...req.body };
    if (incoming.surveyDate)
      incoming.surveyDate = new Date(incoming.surveyDate);
    else incoming.surveyDate = new Date();

    const existing = await prisma.demographics.findFirst({
      where: { tenantId, wardId, wardAreaId: incoming.wardAreaId || null },
      orderBy: { surveyDate: "desc" },
    });

    if (existing) {
      // merge only provided fields
      const data: any = {};
      for (const [k, v] of Object.entries(incoming)) {
        if (v !== undefined) data[k] = v;
      }
      const demographics = await prisma.demographics.update({
        where: { id: existing.id },
        data,
      });
      await createAuditLog({
        tenantId,
        userId: req.user!.id,
        action: "UPDATE",
        module: "demographics",
        recordId: demographics.id,
        description: `Updated demographics for ward "${ward.name}"`,
        newData: req.body,
        ...getRequestMeta(req),
      });
      return res.json({
        success: true,
        message: "Demographics saved",
        data: demographics,
      });
    } else {
      const demographics = await prisma.demographics.create({
        data: { tenantId, wardId, ...incoming, wardAreaId: incoming.wardAreaId || null },
      });
      await createAuditLog({
        tenantId,
        userId: req.user!.id,
        action: "CREATE",
        module: "demographics",
        recordId: demographics.id,
        description: `Created demographics for ward "${ward.name}"`,
        newData: req.body,
        ...getRequestMeta(req),
      });
      return res.json({
        success: true,
        message: "Demographics saved",
        data: demographics,
      });
    }
  } catch (error) {
    next(error);
  }
}
