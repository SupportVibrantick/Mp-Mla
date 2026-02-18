// import { Request, Response, NextFunction } from "express";
// import prisma from "../../../lib/prisma.js";
// import {
//   createAuditLog,
//   getRequestMeta,
// } from "../../../middleware/auditLog.js";
// import { z } from "zod";
// import {
//   buildDemographicsData,
//   demographicsZodSchema,
// } from "./helpers.js";

// // ─── Schema ─────────────────────────────────────────────

// export const createWardSchema = z.object({
//   wardNumber: z.number().int().positive("Ward number must be positive"),
//   name: z.string().min(1, "Name is required").max(200),
//   zone: z.string().max(10).optional(),
//   status: z
//     .enum(["ACTIVE", "INACTIVE", "PROPOSED", "MERGED", "DELIMITATION_PENDING"])
//     .optional(),
//   areaType: z.string().default("Urban"),
//   pincode: z.string().max(10).optional(),
//   latitude: z.number().optional(),
//   longitude: z.number().optional(),
//   description: z.string().optional(),
//   establishedDate: z.string().datetime().optional(),

//   areas: z
//     .array(
//       z.object({
//         name: z.string().min(1),
//         areaType: z
//           .enum([
//             "RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "MIXED_USE",
//             "AGRICULTURAL", "INSTITUTIONAL", "SLUM", "CANTONMENT", "OTHER",
//           ])
//           .default("RESIDENTIAL"),
//         population: z.number().int().min(0).default(0),
//         households: z.number().int().min(0).default(0),
//         maleCount: z.number().int().min(0).default(0),
//         femaleCount: z.number().int().min(0).default(0),
//         pincode: z.string().optional(),
//         landmark: z.string().optional(),
//         description: z.string().optional(),
//         demographics: demographicsZodSchema,
//       }),
//     )
//     .optional(),

//   councillor: z
//     .object({
//       name: z.string().min(1),
//       phone: z.string().optional(),
//       email: z.string().email().optional(),
//       partyName: z.string().optional(),
//       designation: z.string().optional(),
//       sinceDate: z.string().datetime().optional(),
//     })
//     .optional(),

//   demographics: demographicsZodSchema,
// });

// // ─── Handler ────────────────────────────────────────────

// export async function createWard(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ): Promise<void> {
//   try {
//     const { areas, councillor, demographics, ...wardData } = req.body;

//     // Step 1: Compute aggregates
//     let totalPop = 0,
//       totalHH = 0,
//       totalMale = 0,
//       totalFemale = 0;
//     if (areas && areas.length > 0) {
//       totalPop = areas.reduce((s: number, a: any) => s + (a.population || 0), 0);
//       totalHH = areas.reduce((s: number, a: any) => s + (a.households || 0), 0);
//       totalMale = areas.reduce((s: number, a: any) => s + (a.maleCount || 0), 0);
//       totalFemale = areas.reduce((s: number, a: any) => s + (a.femaleCount || 0), 0);
//     }

//     // Step 2: Strip per-area demographics for createMany
//     const areasForDb =
//       areas?.map(({ demographics: _d, ...rest }: any) => rest) || [];

//     // Step 3: Create ward + areas + councillor
//     const ward = await prisma.ward.create({
//       data: {
//         ...wardData,
//         establishedDate: wardData.establishedDate
//           ? new Date(wardData.establishedDate)
//           : undefined,
//         totalPopulation: totalPop,
//         totalHouseholds: totalHH,
//         totalAreas: areasForDb.length,
//         totalMale: totalMale,
//         totalFemale: totalFemale,
//         ...(areasForDb.length > 0
//           ? { areas: { createMany: { data: areasForDb } } }
//           : {}),
//         ...(councillor
//           ? {
//               councillors: {
//                 create: {
//                   ...councillor,
//                   sinceDate: councillor.sinceDate
//                     ? new Date(councillor.sinceDate)
//                     : undefined,
//                   isCurrent: true,
//                 },
//               },
//             }
//           : {}),
//       },
//       include: {
//         areas: true,
//         councillors: { where: { isCurrent: true } },
//       },
//     });

//     // Step 4: Ward-level demographics
//     await prisma.demographics.create({
//       data: buildDemographicsData(
//         ward.id,
//         null,
//         totalPop,
//         totalMale,
//         totalFemale,
//         totalHH,
//         demographics,
//       ),
//     });

//     // Step 5: Area-level demographics
//     if (areas && areas.length > 0) {
//       for (const areaInput of areas) {
//         const createdArea = ward.areas.find((a) => a.name === areaInput.name);
//         if (!createdArea) continue;

//         // Create area-level demo: explicit if provided, auto-estimated otherwise
//         await prisma.demographics.create({
//           data: buildDemographicsData(
//             ward.id,
//             createdArea.id,
//             areaInput.population || 0,
//             areaInput.maleCount || 0,
//             areaInput.femaleCount || 0,
//             areaInput.households || 0,
//             areaInput.demographics || null,
//           ),
//         });
//       }
//     }

//     // Step 6: Audit
//     await createAuditLog({
//       userId: req.user!.id,
//       action: "CREATE",
//       module: "wards",
//       recordId: ward.id,
//       description: `Created ward #${ward.wardNumber} "${ward.name}" with ${areasForDb.length} areas`,
//       newData: {
//         name: ward.name,
//         wardNumber: ward.wardNumber,
//         areas: areasForDb.length,
//       },
//       ...getRequestMeta(req),
//     });

//     // Step 7: Return full ward
//     const fullWard = await prisma.ward.findUnique({
//       where: { id: ward.id },
//       include: {
//         areas: true,
//         councillors: { where: { isCurrent: true } },
//         demographics: true,
//         _count: {
//           select: { institutions: true, grievances: true, projects: true },
//         },
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: `Ward "${ward.name}" created with ${areasForDb.length} areas and demographics`,
//       data: fullWard,
//     });
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
import { z } from "zod";
import { buildDemographicsData, demographicsZodSchema } from "./helpers.js";

// ─── Schema ─────────────────────────────────────────────

export const createWardSchema = z.object({
  wardNumber: z.number().int().positive("Ward number must be positive"),
  name: z.string().min(1, "Name is required").max(200),
  zone: z.string().max(10).optional(),
  status: z
    .enum(["ACTIVE", "INACTIVE", "PROPOSED", "MERGED", "DELIMITATION_PENDING"])
    .optional(),
  areaType: z.string().default("Urban"),
  pincode: z.string().max(10).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  establishedDate: z.string().datetime().optional(),

  areas: z
    .array(
      z.object({
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
        demographics: demographicsZodSchema,
      }),
    )
    .optional(),

  councillor: z
    .object({
      name: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      partyName: z.string().optional(),
      designation: z.string().optional(),
      sinceDate: z.string().datetime().optional(),
    })
    .optional(),

  demographics: demographicsZodSchema,
});

// ─── Handler ────────────────────────────────────────────

export async function createWard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
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
    const fullWard = await prisma.ward.findUnique({
      where: { id: ward.id },
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
