import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { buildDemographicsData } from "./helpers.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { assertCanCreateWard } from "../../../lib/quota.js";



/**
 * POST /api/admin/ward
 * Creates a new ward with areas and councillor.
 */
export async function createWard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    await assertCanCreateWard(tenantId);
    const { areas, councillor, demographics, ...wardData } = req.body;

    // Step 1: Compute aggregates
    let totalPop = 0,
      totalHH = 0,
      totalMale = 0,
      totalFemale = 0;
    if (areas && areas.length > 0) {
      totalPop = areas.reduce(
        (s: number, a: any) => s + (a.population || 0),
        0,
      );
      totalHH = areas.reduce((s: number, a: any) => s + (a.households || 0), 0);
      totalMale = areas.reduce(
        (s: number, a: any) => s + (a.maleCount || 0),
        0,
      );
      totalFemale = areas.reduce(
        (s: number, a: any) => s + (a.femaleCount || 0),
        0,
      );
    }

    // Step 2: Strip per-area demographics for createMany
    const areasForDb =
      areas?.map(({ demographics: _d, ...rest }: any) => rest) || [];

    // Step 3: Create ward + areas + councillor
    const ward = await prisma.ward.create({
      data: {
        ...wardData,
        tenantId,
        establishedDate: wardData.establishedDate
          ? new Date(wardData.establishedDate)
          : undefined,
        totalPopulation: totalPop,
        totalHouseholds: totalHH,
        totalAreas: areasForDb.length,
        totalMale: totalMale,
        totalFemale: totalFemale,
        ...(areasForDb.length > 0
          ? { areas: { createMany: { data: areasForDb } } }
          : {}),
        ...(councillor
          ? {
            councillors: {
              create: {
                ...councillor,
                sinceDate: councillor.sinceDate
                  ? new Date(councillor.sinceDate)
                  : undefined,
                isCurrent: true,
              },
            },
          }
          : {}),
      },
      include: {
        areas: true,
        councillors: { where: { isCurrent: true } },
      },
    });

    // Step 4: Ward-level demographics
    await prisma.demographics.create({
      data: buildDemographicsData(
        tenantId,
        ward.id,
        null,
        totalPop,
        totalMale,
        totalFemale,
        totalHH,
        demographics,
      ),
    });

    // Step 5: Area-level demographics
    if (areas && areas.length > 0) {
      for (const areaInput of areas) {
        const createdArea = ward.areas.find((a) => a.name === areaInput.name);
        if (!createdArea) continue;

        // Create area-level demo: explicit if provided, auto-estimated otherwise
        await prisma.demographics.create({
          data: buildDemographicsData(
            tenantId,
            ward.id,
            createdArea.id,
            areaInput.population || 0,
            areaInput.maleCount || 0,
            areaInput.femaleCount || 0,
            areaInput.households || 0,
            areaInput.demographics || null,
          ),
        });
      }
    }

    // Step 6: Audit
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "wards",
      recordId: ward.id,
      description: `Created ward #${ward.wardNumber} "${ward.name}" with ${areasForDb.length} areas`,
      newData: {
        name: ward.name,
        wardNumber: ward.wardNumber,
        areas: areasForDb.length,
      },
      ...getRequestMeta(req),
    });

    // Step 7: Return full ward
    const fullWard = await prisma.ward.findFirst({
      where: { id: ward.id, tenantId },
      include: {
        areas: true,
        councillors: { where: { isCurrent: true } },
        demographics: true,
        _count: {
          select: { institutions: true, grievances: true, projects: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: `Ward "${ward.name}" created with ${areasForDb.length} areas and demographics`,
      data: fullWard,
    });
  } catch (error) {
    next(error);
  }
}
