import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { z } from "zod";
import {
  recomputeWardAggregates,
  recomputeWardDemographics,
  buildDemographicsData,
} from "./helpers.js";



/**
 * GET /api/admin/ward/:wardId/areas
 * Lists all areas within a ward.
 */
export async function listAreas(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardId = req.params.wardId as string;

    const ward = await prisma.ward.findUnique({
      where: { id: wardId },
      select: { id: true, name: true, wardNumber: true },
    });
    if (!ward) throw ApiError.notFound("Ward not found");

    const areas = await prisma.wardArea.findMany({
      where: { wardId, isDeleted: false },
      include: {
        _count: { select: { demographics: true, communityGroups: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: { ward, areas } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/ward/:wardId/areas/:areaId
 * Gets a single area within a ward.
 */
export async function getArea(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const area = await prisma.wardArea.findUnique({
      where: { id: req.params.areaId as string },
      include: {
        ward: { select: { id: true, name: true, wardNumber: true } },
        demographics: { orderBy: { surveyDate: "desc" }, take: 1 },
        communityGroups: {
          where: { isActive: true, isDeleted: false },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!area || area.isDeleted) throw ApiError.notFound("Area not found");
    res.json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/ward/:wardId/areas
 * Creates a new area within a ward.
 */
export async function createArea(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardId = req.params.wardId as string;
    // Separate demographics from the area fields
    const { demographics: demoInput, ...areaData } = req.body;

    const ward = await prisma.ward.findUnique({ where: { id: wardId } });
    if (!ward) throw ApiError.notFound("Ward not found");

    // 1. Create the area record
    const area = await prisma.wardArea.create({
      data: { ...areaData, wardId },
    });

    // 2. Create area-level demographics (explicit or auto-estimated)
    await prisma.demographics.create({
      data: buildDemographicsData(
        wardId,
        area.id,
        area.population,
        area.maleCount,
        area.femaleCount,
        area.households,
        demoInput || null,
      ),
    });

    // 3. Recompute ward totals
    await recomputeWardAggregates(wardId);

    // 4. Recompute ward-level demographics from all area demographics
    await recomputeWardDemographics(wardId);

    // 5. Audit log
    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "wards",
      recordId: area.id,
      description: `Added area "${area.name}" to ward "${ward.name}"`,
      newData: {
        name: area.name,
        population: area.population,
        households: area.households,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Area "${area.name}" added with demographics`,
      data: area,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/ward/:wardId/areas/:areaId
 * Updates an area within a ward.
 */
export async function updateArea(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const areaId = req.params.areaId as string;
    const { demographics: demoInput, ...areaData } = req.body;

    const old = await prisma.wardArea.findUnique({ where: { id: areaId } });
    if (!old) throw ApiError.notFound("Area not found");

    // 1. Update area fields (only non-demographics fields)
    const area = await prisma.wardArea.update({
      where: { id: areaId },
      data: areaData,
    });

    // 2. If demographics provided, update area-level demographics
    if (demoInput && Object.keys(demoInput).length > 0) {
      const existingDemo = await prisma.demographics.findFirst({
        where: { wardId: area.wardId, wardAreaId: area.id },
      });

      const demoData = buildDemographicsData(
        area.wardId,
        area.id,
        area.population,
        area.maleCount,
        area.femaleCount,
        area.households,
        demoInput,
      );

      if (existingDemo) {
        await prisma.demographics.update({
          where: { id: existingDemo.id },
          data: demoData,
        });
      } else {
        await prisma.demographics.create({ data: demoData });
      }
    } else {
      // Population changed → update auto-estimated demographics
      const popChanged =
        old.population !== area.population ||
        old.maleCount !== area.maleCount ||
        old.femaleCount !== area.femaleCount ||
        old.households !== area.households;

      if (popChanged) {
        const existingDemo = await prisma.demographics.findFirst({
          where: { wardId: area.wardId, wardAreaId: area.id },
        });

        if (existingDemo && existingDemo.source === "Auto-estimated") {
          const demoData = buildDemographicsData(
            area.wardId,
            area.id,
            area.population,
            area.maleCount,
            area.femaleCount,
            area.households,
            null,
          );
          await prisma.demographics.update({
            where: { id: existingDemo.id },
            data: demoData,
          });
        }
      }
    }

    // 3. Recompute ward
    await recomputeWardAggregates(area.wardId);
    await recomputeWardDemographics(area.wardId);

    // 4. Audit
    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "wards",
      recordId: area.id,
      description: `Updated area "${area.name}"`,
      oldData: {
        population: old.population,
        households: old.households,
        maleCount: old.maleCount,
        femaleCount: old.femaleCount,
      },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: "Area updated", data: area });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/ward/:wardId/areas/:areaId
 * Deletes an area within a ward.
 */
export async function deleteArea(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const areaId = req.params.areaId as string;

    const area = await prisma.wardArea.findUnique({
      where: { id: areaId },
      include: { demographics: true },
    });
    if (!area || area.isDeleted) throw ApiError.notFound("Area not found");

    const linkedGroups = await prisma.communityGroup.findMany({
      where: { wardAreaId: areaId, isDeleted: false },
      select: { id: true },
    });

    await archiveToRecycleBin({
      module: "wards",
      entityType: "ward_area",
      recordId: area.id,
      recordLabel: area.name,
      payload: {
        ...area,
        communityGroupIds: linkedGroups.map((g) => g.id),
      },
      deletedById: req.user?.id,
    });

    await prisma.wardArea.update({
      where: { id: areaId },
      data: { isDeleted: true },
    });

    // Recompute ward
    await recomputeWardAggregates(area.wardId);
    await recomputeWardDemographics(area.wardId);

    // Audit
    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "wards",
      recordId: area.id,
      description: `Moved area "${area.name}" to recycle bin`,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: `Area "${area.name}" moved to recycle bin` });
  } catch (error) {
    next(error);
  }
}


