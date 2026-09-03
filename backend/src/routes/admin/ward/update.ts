import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { syncWardDemographicsFromWard } from "./helpers.js";

/**
 * PUT /api/admin/ward/:id
 * Updates an existing ward.
 */
export async function updateWard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const wardId = req.params.id as string;

    const old = await prisma.ward.findFirst({
      where: {
        id: wardId,
        tenantId,
      },
    });

    if (!old) {
      throw ApiError.notFound("Ward not found");
    }

    const updateData: any = {
      ...req.body,
    };

    // Never allow tenantId to be changed from request body.
    delete updateData.tenantId;

    // These are handled separately by their own endpoints.
    delete updateData.areas;
    delete updateData.councillor;
    delete updateData.councillors;
    delete updateData.demographics;

    // Normalize nullable fields
    if (updateData.constituencyId === "") {
      updateData.constituencyId = null;
    }
    if (updateData.townVillageId === "") {
      updateData.townVillageId = null;
    }

    // Validate constituency
    if (updateData.constituencyId) {
      const constituency = await prisma.constituency.findFirst({
        where: {
          id: updateData.constituencyId,
          tenantId,
          isDeleted: false,
        },
      });
      if (!constituency) {
        throw ApiError.badRequest(
          "Selected constituency does not belong to this organization or is deleted.",
        );
      }
    }

    // Validate town/village
    if (updateData.townVillageId) {
      const townVillage = await prisma.townVillage.findFirst({
        where: {
          id: updateData.townVillageId,
          tenantId,
          isDeleted: false,
        },
      });
      if (!townVillage) {
        throw ApiError.badRequest(
          "Selected Town/Village does not belong to this organization or is deleted.",
        );
      }
    }

    // Date validation
    if (updateData.establishedDate) {
      const date = new Date(updateData.establishedDate);
      if (Number.isNaN(date.getTime())) {
        throw ApiError.badRequest("Invalid established date.");
      }
      updateData.establishedDate = date;
    }

    // Track whether authoritative demographic values changed
    const demographicFieldsChanged =
      updateData.totalPopulation !== undefined ||
      updateData.totalHouseholds !== undefined ||
      updateData.totalMale !== undefined ||
      updateData.totalFemale !== undefined;

    // Update ward
    const ward = await prisma.ward.update({
      where: {
        id: wardId,
      },
      data: updateData,
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
      },
    });

    // If authoritative ward population changed, synchronize ward demographics.
    if (demographicFieldsChanged) {
      await syncWardDemographicsFromWard(tenantId, wardId);
    }

    // Audit
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "wards",
      recordId: ward.id,
      description: `Updated ward #${ward.wardNumber} "${ward.name}"`,
      oldData: {
        name: old.name,
        zone: old.zone,
        status: old.status,
        totalPopulation: old.totalPopulation,
        totalHouseholds: old.totalHouseholds,
        totalMale: old.totalMale,
        totalFemale: old.totalFemale,
      },
      newData: req.body,
      ...getRequestMeta(req),
    });

    // Return fresh ward
    const fullWard = await prisma.ward.findFirst({
      where: {
        id: wardId,
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

    res.json({
      success: true,
      message: "Ward updated",
      data: fullWard,
    });
  } catch (error) {
    next(error);
  }
}
