import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { buildDemographicsData } from "./helpers.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { assertCanCreateWard } from "../../../lib/quota.js";
import { ApiError } from "../../../utils/ApiError.js";

/**
 * POST /api/admin/ward
 * Creates a new ward with areas, councillors and demographics atomically.
 */
export async function createWard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);

    await assertCanCreateWard(tenantId);

    const {
      areas = [],
      councillor,
      councillors,
      demographics,
      ...wardData
    } = req.body;

    // Normalize nullable foreign keys
    if (wardData.constituencyId === "") {
      wardData.constituencyId = null;
    }
    if (wardData.townVillageId === "") {
      wardData.townVillageId = null;
    }

    // Validate constituency tenant ownership
    if (wardData.constituencyId) {
      const constituency = await prisma.constituency.findFirst({
        where: {
          id: wardData.constituencyId,
          tenantId,
          isDeleted: false,
        },
      });
      if (!constituency) {
        return next(
          ApiError.badRequest(
            "Selected constituency does not belong to this organization or is deleted.",
          ),
        );
      }
    }

    // Validate town/village tenant ownership
    if (wardData.townVillageId) {
      const townVillage = await prisma.townVillage.findFirst({
        where: {
          id: wardData.townVillageId,
          tenantId,
          isDeleted: false,
        },
      });
      if (!townVillage) {
        return next(
          ApiError.badRequest(
            "Selected Town/Village does not belong to this organization or is deleted.",
          ),
        );
      }
    }

    // Councillors
    const rawCouncillors =
      Array.isArray(councillors) && councillors.length > 0
        ? councillors
        : councillor
          ? [councillor]
          : [];

    const councillorsForDb = rawCouncillors.map((c: any) => ({
      tenantId,
      name: c.name,
      phone: c.phone || null,
      email: c.email || null,
      partyName: c.partyName || null,
      designation: c.designation || "Ward Councillor",
      sinceDate: c.sinceDate ? new Date(c.sinceDate) : null,
      isCurrent: c.isCurrent ?? true,
    }));

    // Population source
    // Explicit ward values are authoritative when supplied. Otherwise calculate from areas.
    const hasDirectPopulation =
      wardData.totalPopulation !== undefined &&
      wardData.totalPopulation !== null &&
      wardData.totalPopulation !== "";

    const hasDirectHouseholds =
      wardData.totalHouseholds !== undefined &&
      wardData.totalHouseholds !== null &&
      wardData.totalHouseholds !== "";

    const hasDirectMale =
      wardData.totalMale !== undefined &&
      wardData.totalMale !== null &&
      wardData.totalMale !== "";

    const hasDirectFemale =
      wardData.totalFemale !== undefined &&
      wardData.totalFemale !== null &&
      wardData.totalFemale !== "";

    const areaPopulation = areas.reduce(
      (sum: number, area: any) => sum + (Number(area.population) || 0),
      0,
    );

    const areaHouseholds = areas.reduce(
      (sum: number, area: any) => sum + (Number(area.households) || 0),
      0,
    );

    const areaMale = areas.reduce(
      (sum: number, area: any) => sum + (Number(area.maleCount) || 0),
      0,
    );

    const areaFemale = areas.reduce(
      (sum: number, area: any) => sum + (Number(area.femaleCount) || 0),
      0,
    );

    const totalPopulation = hasDirectPopulation
      ? Number(wardData.totalPopulation)
      : areaPopulation;

    const totalHouseholds = hasDirectHouseholds
      ? Number(wardData.totalHouseholds)
      : areaHouseholds;

    const totalMale = hasDirectMale
      ? Number(wardData.totalMale)
      : areaMale;

    const totalFemale = hasDirectFemale
      ? Number(wardData.totalFemale)
      : areaFemale;

    // Validate population numbers
    if (!Number.isFinite(totalPopulation) || totalPopulation < 0) {
      return next(
        ApiError.badRequest("Total population must be a valid non-negative number."),
      );
    }
    if (!Number.isFinite(totalHouseholds) || totalHouseholds < 0) {
      return next(
        ApiError.badRequest(
          "Total households must be a valid non-negative number.",
        ),
      );
    }
    if (!Number.isFinite(totalMale) || totalMale < 0) {
      return next(
        ApiError.badRequest(
          "Total male population must be a valid non-negative number.",
        ),
      );
    }
    if (!Number.isFinite(totalFemale) || totalFemale < 0) {
      return next(
        ApiError.badRequest(
          "Total female population must be a valid non-negative number.",
        ),
      );
    }

    // Strip nested demographics from areas and attach tenantId
    const areasForDb = areas.map(
      ({ demographics: _demographics, ...rest }: any) => ({
        ...rest,
        tenantId,
      }),
    );

    // Create everything atomically inside a Prisma transaction
    const ward = await prisma.$transaction(async (tx) => {
      const createdWard = await tx.ward.create({
        data: {
          ...wardData,
          tenantId,
          establishedDate: wardData.establishedDate
            ? new Date(wardData.establishedDate)
            : undefined,
          totalPopulation,
          totalHouseholds,
          totalAreas: areasForDb.length,
          totalMale,
          totalFemale,
          ...(areasForDb.length > 0
            ? {
                areas: {
                  createMany: {
                    data: areasForDb,
                  },
                },
              }
            : {}),
          ...(councillorsForDb.length > 0
            ? {
                councillors: {
                  createMany: {
                    data: councillorsForDb,
                  },
                },
              }
            : {}),
        },
        include: {
          areas: true,
          councillors: {
            where: {
              isCurrent: true,
            },
          },
        },
      });

      // Create ward demographics using authoritative ward totals.
      await tx.demographics.create({
        data: buildDemographicsData(
          tenantId,
          createdWard.id,
          null,
          totalPopulation,
          totalMale,
          totalFemale,
          totalHouseholds,
          demographics,
        ),
      });

      // Create area demographics.
      if (areas.length > 0) {
        for (const areaInput of areas) {
          const createdArea = createdWard.areas.find(
            (area) => area.name === areaInput.name,
          );
          if (!createdArea) {
            continue;
          }

          await tx.demographics.create({
            data: buildDemographicsData(
              tenantId,
              createdWard.id,
              createdArea.id,
              Number(areaInput.population) || 0,
              Number(areaInput.maleCount) || 0,
              Number(areaInput.femaleCount) || 0,
              Number(areaInput.households) || 0,
              areaInput.demographics || null,
            ),
          });
        }
      }

      return createdWard;
    });

    // Audit
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
        totalPopulation,
        totalHouseholds,
        totalMale,
        totalFemale,
      },
      ...getRequestMeta(req),
    });

    // Return complete ward
    const fullWard = await prisma.ward.findFirst({
      where: {
        id: ward.id,
        tenantId,
      },
      include: {
        areas: true,
        councillors: {
          where: {
            isCurrent: true,
          },
          orderBy: {
            sinceDate: "desc",
          },
        },
        demographics: true,
        _count: {
          select: {
            institutions: true,
            grievances: true,
            projects: true,
          },
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
