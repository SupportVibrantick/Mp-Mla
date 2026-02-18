// import { Request, Response, NextFunction } from "express";
// import prisma from "../../../lib/prisma.js";
// import {
//   createAuditLog,
//   getRequestMeta,
// } from "../../../middleware/auditLog.js";
// import { ApiError } from "../../../utils/ApiError.js";
// import { z } from "zod";

// export const createAreaSchema = z.object({
//   name: z.string().min(1),
//   areaType: z
//     .enum([
//       "RESIDENTIAL",
//       "COMMERCIAL",
//       "INDUSTRIAL",
//       "MIXED_USE",
//       "AGRICULTURAL",
//       "INSTITUTIONAL",
//       "SLUM",
//       "CANTONMENT",
//       "OTHER",
//     ])
//     .default("RESIDENTIAL"),
//   population: z.number().int().min(0).default(0),
//   households: z.number().int().min(0).default(0),
//   maleCount: z.number().int().min(0).default(0),
//   femaleCount: z.number().int().min(0).default(0),
//   pincode: z.string().optional(),
//   landmark: z.string().optional(),
//   description: z.string().optional(),
//   latitude: z.number().optional(),
//   longitude: z.number().optional(),
// });

// export const updateAreaSchema = createAreaSchema.partial();

// async function recomputeWardAggregates(wardId: string) {
//   const areas = await prisma.wardArea.findMany({
//     where: { wardId, isActive: true },
//     select: {
//       population: true,
//       households: true,
//       maleCount: true,
//       femaleCount: true,
//     },
//   });
//   await prisma.ward.update({
//     where: { id: wardId },
//     data: {
//       totalPopulation: areas.reduce((s, a) => s + a.population, 0),
//       totalHouseholds: areas.reduce((s, a) => s + a.households, 0),
//       totalMale: areas.reduce((s, a) => s + a.maleCount, 0),
//       totalFemale: areas.reduce((s, a) => s + a.femaleCount, 0),
//       totalAreas: areas.length,
//     },
//   });
// }

// export async function listAreas(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ): Promise<void> {
//   try {
//     const wardId = req.params.wardId as string;

//     const ward = await prisma.ward.findUnique({
//       where: { id: wardId },
//       select: { id: true, name: true, wardNumber: true },
//     });
//     if (!ward) throw ApiError.notFound("Ward not found");

//     const areas = await prisma.wardArea.findMany({
//       where: { wardId },
//       include: {
//         _count: { select: { demographics: true, communityGroups: true } },
//       },
//       orderBy: { name: "asc" },
//     });

//     res.json({ success: true, data: { ward, areas } });
//   } catch (error) {
//     next(error);
//   }
// }

// export async function getArea(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ): Promise<void> {
//   try {
//     const area = await prisma.wardArea.findUnique({
//       where: { id: req.params.areaId as string },
//       include: {
//         ward: { select: { id: true, name: true, wardNumber: true } },
//         demographics: { orderBy: { surveyDate: "desc" }, take: 1 },
//         communityGroups: {
//           where: { isActive: true },
//           orderBy: { name: "asc" },
//         },
//       },
//     });
//     if (!area) throw ApiError.notFound("Area not found");
//     res.json({ success: true, data: area });
//   } catch (error) {
//     next(error);
//   }
// }

// // Inside createArea handler, after creating the area:

// export async function createArea(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ): Promise<void> {
//   try {
//     const { wardId } = req.params;
//     const { demographics: demoInput, ...areaData } = req.body;

//     const ward = await prisma.ward.findUnique({ where: { id: wardId } });
//     if (!ward) throw ApiError.notFound("Ward not found");

//     // Create area
//     const area = await prisma.wardArea.create({
//       data: { ...areaData, wardId },
//     });

//     // Create area-level demographics
//     const demoData = buildWardDemographics(
//       wardId,
//       area.id,
//       area.population,
//       area.maleCount,
//       area.femaleCount,
//       area.households,
//       demoInput,
//     );
//     await prisma.demographics.create({ data: demoData });

//     // Recompute ward aggregates
//     await recomputeWardAggregates(wardId);

//     // Also recompute ward-level demographics
//     await recomputeWardDemographics(wardId);

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "CREATE",
//       module: "wards",
//       recordId: area.id,
//       description: `Added area "${area.name}" to ward "${ward.name}" with demographics`,
//       newData: { name: area.name, population: area.population },
//       ...getRequestMeta(req),
//     });

//     res.status(201).json({
//       success: true,
//       message: `Area "${area.name}" added with demographics`,
//       data: area,
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// // ─── Recompute ward-level demographics from all area demographics ───

// async function recomputeWardDemographics(wardId: string) {
//   // Get all area-level demographics
//   const areaDemos = await prisma.demographics.findMany({
//     where: { wardId, wardAreaId: { not: null } },
//   });

//   if (areaDemos.length === 0) return;

//   // Sum up all area demographics
//   const aggregated = {
//     totalPopulation: areaDemos.reduce((s, d) => s + d.totalPopulation, 0),
//     maleCount: areaDemos.reduce((s, d) => s + d.maleCount, 0),
//     femaleCount: areaDemos.reduce((s, d) => s + d.femaleCount, 0),
//     transgenderCount: areaDemos.reduce((s, d) => s + d.transgenderCount, 0),
//     age0to6: areaDemos.reduce((s, d) => s + d.age0to6, 0),
//     age7to18: areaDemos.reduce((s, d) => s + d.age7to18, 0),
//     age19to35: areaDemos.reduce((s, d) => s + d.age19to35, 0),
//     age36to60: areaDemos.reduce((s, d) => s + d.age36to60, 0),
//     age60plus: areaDemos.reduce((s, d) => s + d.age60plus, 0),
//     totalHouseholds: areaDemos.reduce((s, d) => s + d.totalHouseholds, 0),
//     bplHouseholds: areaDemos.reduce((s, d) => s + d.bplHouseholds, 0),
//     aplHouseholds: areaDemos.reduce((s, d) => s + d.aplHouseholds, 0),
//     generalCount: areaDemos.reduce((s, d) => s + d.generalCount, 0),
//     obcCount: areaDemos.reduce((s, d) => s + d.obcCount, 0),
//     scCount: areaDemos.reduce((s, d) => s + d.scCount, 0),
//     stCount: areaDemos.reduce((s, d) => s + d.stCount, 0),
//     minorityCount: areaDemos.reduce((s, d) => s + d.minorityCount, 0),
//     otherCount: areaDemos.reduce((s, d) => s + d.otherCount, 0),
//     totalVoters: areaDemos.reduce((s, d) => s + d.totalVoters, 0),
//     maleVoters: areaDemos.reduce((s, d) => s + d.maleVoters, 0),
//     femaleVoters: areaDemos.reduce((s, d) => s + d.femaleVoters, 0),
//   };

//   // Weighted average for literacy rates
//   const totalPop = aggregated.totalPopulation || 1;
//   const litRates = areaDemos.filter((d) => d.literacyRate !== null);
//   if (litRates.length > 0) {
//     const weightedLit = litRates.reduce(
//       (s, d) => s + (d.literacyRate || 0) * d.totalPopulation,
//       0,
//     );
//     (aggregated as any).literacyRate = weightedLit / totalPop;
//   }

//   // Upsert ward-level demographics
//   const existing = await prisma.demographics.findFirst({
//     where: { wardId, wardAreaId: null },
//   });

//   if (existing) {
//     await prisma.demographics.update({
//       where: { id: existing.id },
//       data: { ...aggregated, source: "Aggregated from areas" },
//     });
//   } else {
//     await prisma.demographics.create({
//       data: {
//         wardId,
//         wardAreaId: null,
//         ...aggregated,
//         source: "Aggregated from areas",
//         surveyDate: new Date(),
//       },
//     });
//   }
// }

// export async function updateArea(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ): Promise<void> {
//   try {
//     const old = await prisma.wardArea.findUnique({
//       where: { id: req.params.areaId as string },
//     });
//     if (!old) throw ApiError.notFound("Area not found");

//     const area = await prisma.wardArea.update({
//       where: { id: req.params.areaId as string },
//       data: req.body,
//     });
//     await recomputeWardAggregates(area.wardId);

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "UPDATE",
//       module: "wards",
//       recordId: area.id,
//       description: `Updated area "${area.name}"`,
//       oldData: { population: old.population, households: old.households },
//       newData: req.body,
//       ...getRequestMeta(req),
//     });

//     res.json({ success: true, message: "Area updated", data: area });
//   } catch (error) {
//     next(error);
//   }
// }

// export async function deleteArea(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ): Promise<void> {
//   try {
//     const area = await prisma.wardArea.findUnique({
//       where: { id: req.params.areaId as string },
//     });
//     if (!area) throw ApiError.notFound("Area not found");

//     await prisma.wardArea.delete({
//       where: { id: req.params.areaId as string },
//     });
//     await recomputeWardAggregates(area.wardId);

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "DELETE",
//       module: "wards",
//       recordId: area.id,
//       description: `Deleted area "${area.name}"`,
//       ...getRequestMeta(req),
//     });

//     res.json({ success: true, message: `Area "${area.name}" deleted` });
//   } catch (error) {
//     next(error);
//   }
// }

import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";
import {
  recomputeWardAggregates,
  recomputeWardDemographics,
  buildDemographicsData,
  demographicsZodSchema,
} from "./helpers.js";

// ─── Schemas ────────────────────────────────────────────

export const createAreaSchema = z.object({
  name: z.string().min(1),
  areaType: z
    .enum([
      "RESIDENTIAL",
      "COMMERCIAL",
      "INDUSTRIAL",
      "MIXED_USE",
      "AGRICULTURAL",
      "INSTITUTIONAL",
      "SLUM",
      "CANTONMENT",
      "OTHER",
    ])
    .default("RESIDENTIAL"),
  population: z.number().int().min(0).default(0),
  households: z.number().int().min(0).default(0),
  maleCount: z.number().int().min(0).default(0),
  femaleCount: z.number().int().min(0).default(0),
  pincode: z.string().optional(),
  landmark: z.string().optional(),
  description: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Optional detailed demographics for this area
  demographics: demographicsZodSchema,
});

export const updateAreaSchema = createAreaSchema.partial();

// ─── List Areas ─────────────────────────────────────────

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
      where: { wardId },
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

// ─── Get Single Area ────────────────────────────────────

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
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!area) throw ApiError.notFound("Area not found");
    res.json({ success: true, data: area });
  } catch (error) {
    next(error);
  }
}

// ─── Create Area ────────────────────────────────────────

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

// ─── Update Area ────────────────────────────────────────

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

// ─── Delete Area ────────────────────────────────────────

export async function deleteArea(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const areaId = req.params.areaId as string;

    const area = await prisma.wardArea.findUnique({ where: { id: areaId } });
    if (!area) throw ApiError.notFound("Area not found");

    // Demographics cascade-deletes because of onDelete: Cascade on WardArea
    await prisma.wardArea.delete({ where: { id: areaId } });

    // Recompute ward
    await recomputeWardAggregates(area.wardId);
    await recomputeWardDemographics(area.wardId);

    // Audit
    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "wards",
      recordId: area.id,
      description: `Deleted area "${area.name}"`,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: `Area "${area.name}" deleted` });
  } catch (error) {
    next(error);
  }
}
