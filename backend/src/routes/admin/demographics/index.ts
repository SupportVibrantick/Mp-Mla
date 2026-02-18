// import { Router } from "express";
// import { Request, Response } from "express";
// import prisma from "../../../lib/prisma.js";
// import { authenticate, authorize } from "../../../middleware/auth.js";
// import { validate } from "../../../middleware/validate.js";
// import { auditLog } from "../../../middleware/auditLog.js";
// import { createDemographicsSchema, updateDemographicsSchema } from "../../../schemas/admin/demographics/index.js";
// import { buildPaginationResponse } from "../../../schemas/common/index.js";

// const router = Router();
// router.use(authenticate);

// // GET all demographics
// router.get("/", async (req: Request, res: Response): Promise<void> => {
//     try {
//         const page = parseInt(req.query.page as string) || 1;
//         const limit = parseInt(req.query.limit as string) || 10;
//         const wardId = req.query.wardId ? parseInt(req.query.wardId as string) : undefined;
//         const communityGroup = req.query.communityGroup as string;
//         const skip = (page - 1) * limit;

//         const where: any = {};
//         if (wardId) where.wardId = wardId;
//         if (communityGroup) where.communityGroup = { contains: communityGroup, mode: "insensitive" };

//         const [demographics, total] = await Promise.all([
//             prisma.demographics.findMany({
//                 where,
//                 include: { ward: { select: { id: true, name: true } } },
//                 orderBy: { createdAt: "desc" },
//                 skip,
//                 take: limit,
//             }),
//             prisma.demographics.count({ where }),
//         ]);

//         res.json({ success: true, data: demographics, pagination: buildPaginationResponse(total, page, limit) });
//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// // GET one
// router.get("/:id", async (req: Request, res: Response): Promise<void> => {
//     try {
//         const id = parseInt(req.params.id);
//         const demographics = await prisma.demographics.findUnique({ where: { id }, include: { ward: true } });
//         if (!demographics) { res.status(404).json({ success: false, message: "Demographics record not found." }); return; }
//         res.json({ success: true, data: demographics });
//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// // GET ward summary (aggregate demographics for a ward)
// router.get("/ward/:wardId/summary", async (req: Request, res: Response): Promise<void> => {
//     try {
//         const wardId = parseInt(req.params.wardId);
//         const demographics = await prisma.demographics.findMany({ where: { wardId } });

//         const summary = demographics.reduce(
//             (acc, d) => ({
//                 totalMale: acc.totalMale + d.maleCount,
//                 totalFemale: acc.totalFemale + d.femaleCount,
//                 totalAge0to18: acc.totalAge0to18 + d.age0to18,
//                 totalAge19to35: acc.totalAge19to35 + d.age19to35,
//                 totalAge36to60: acc.totalAge36to60 + d.age36to60,
//                 totalAge60plus: acc.totalAge60plus + d.age60plus,
//                 communityGroups: [...acc.communityGroups, d.communityGroup],
//             }),
//             { totalMale: 0, totalFemale: 0, totalAge0to18: 0, totalAge19to35: 0, totalAge36to60: 0, totalAge60plus: 0, communityGroups: [] as string[] }
//         );

//         res.json({ success: true, data: { wardId, ...summary, totalRecords: demographics.length } });
//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// // POST
// router.post("/", authorize("SYSTEM_ADMIN", "STAFF"), validate(createDemographicsSchema), auditLog("demographics", "CREATE"), async (req: Request, res: Response): Promise<void> => {
//     try {
//         const demographics = await prisma.demographics.create({ data: req.body, include: { ward: { select: { name: true } } } });
//         res.status(201).json({ success: true, message: "Demographics created successfully", data: demographics });
//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// // PATCH
// router.patch("/:id", authorize("SYSTEM_ADMIN", "STAFF"), validate(updateDemographicsSchema), auditLog("demographics", "UPDATE"), async (req: Request, res: Response): Promise<void> => {
//     try {
//         const id = parseInt(req.params.id);
//         const existing = await prisma.demographics.findUnique({ where: { id } });
//         if (!existing) { res.status(404).json({ success: false, message: "Demographics not found." }); return; }
//         const demographics = await prisma.demographics.update({ where: { id }, data: req.body });
//         res.json({ success: true, message: "Demographics updated successfully", data: demographics });
//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// // DELETE
// router.delete("/:id", authorize("SYSTEM_ADMIN"), auditLog("demographics", "DELETE"), async (req: Request, res: Response): Promise<void> => {
//     try {
//         const id = parseInt(req.params.id);
//         await prisma.demographics.delete({ where: { id } });
//         res.json({ success: true, message: "Demographics deleted successfully" });
//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// export default router;

import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import catchAsync from "@/utils/catchAsync.js";

const router = Router();

// GET /api/admin/demographics — Constituency-wide summary (for Community page)
router.get(
  "/summary",
  requirePermission("demographics", "read"),
  catchAsync(async (req, res) => {
    const wardId = req.query.wardId as string;
    const where = wardId ? { id: wardId } : { status: "ACTIVE" as const };

    const wards = await prisma.ward.findMany({
      where,
      select: {
        id: true,
        name: true,
        wardNumber: true,
        zone: true,
        totalPopulation: true,
        totalMale: true,
        totalFemale: true,
        totalHouseholds: true,
        totalAreas: true,
      },
      orderBy: { wardNumber: "asc" },
    });

    const totalPop = wards.reduce((s, w) => s + w.totalPopulation, 0);
    const totalMale = wards.reduce((s, w) => s + w.totalMale, 0);
    const totalFemale = wards.reduce((s, w) => s + w.totalFemale, 0);
    const totalHH = wards.reduce((s, w) => s + w.totalHouseholds, 0);

    // Age from demographics table
    const demoWhere = wardId
      ? { wardId, wardAreaId: null }
      : { wardAreaId: null };
    const demos = await prisma.demographics.findMany({ where: demoWhere });

    const ageDistribution = [
      { label: "0-6", value: demos.reduce((s, d) => s + d.age0to6, 0) },
      { label: "7-18", value: demos.reduce((s, d) => s + d.age7to18, 0) },
      { label: "19-35", value: demos.reduce((s, d) => s + d.age19to35, 0) },
      { label: "36-60", value: demos.reduce((s, d) => s + d.age36to60, 0) },
      { label: "60+", value: demos.reduce((s, d) => s + d.age60plus, 0) },
    ];

    const categoryDistribution = [
      {
        label: "General",
        value: demos.reduce((s, d) => s + d.generalCount, 0),
      },
      { label: "OBC", value: demos.reduce((s, d) => s + d.obcCount, 0) },
      { label: "SC", value: demos.reduce((s, d) => s + d.scCount, 0) },
      { label: "ST", value: demos.reduce((s, d) => s + d.stCount, 0) },
      {
        label: "Minority",
        value: demos.reduce((s, d) => s + d.minorityCount, 0),
      },
    ];

    const communityGroupCount = await prisma.communityGroup.count({
      where: wardId ? { wardId } : { isActive: true },
    });

    const communityByType = await prisma.communityGroup.groupBy({
      by: ["type"],
      where: wardId ? { wardId } : { isActive: true },
      _count: true,
      _sum: { memberCount: true },
    });

    res.json({
      success: true,
      data: {
        totalPopulation: totalPop,
        totalMale: totalMale,
        totalFemale: totalFemale,
        totalHouseholds: totalHH,
        communityGroupCount,
        genderDistribution: [
          { label: "Male", value: totalMale, color: "#3b82f6" },
          { label: "Female", value: totalFemale, color: "#ec4899" },
        ],
        ageDistribution,
        categoryDistribution,
        communityByType: communityByType.map((c) => ({
          type: c.type,
          count: c._count,
          members: c._sum.memberCount || 0,
        })),
        wards,
        bplHouseholds: demos.reduce((s, d) => s + d.bplHouseholds, 0),
        aplHouseholds: demos.reduce((s, d) => s + d.aplHouseholds, 0),
      },
    });
  }),
);

// GET /api/admin/demographics — List all records
router.get(
  "/",
  requirePermission("demographics", "read"),
  catchAsync(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const wardId = req.query.wardId as string;
    const where: any = {};
    if (wardId) where.wardId = wardId;

    const [data, total] = await Promise.all([
      prisma.demographics.findMany({
        where,
        include: {
          ward: { select: { id: true, name: true, wardNumber: true } },
          wardArea: { select: { id: true, name: true, areaType: true } },
        },
        orderBy: { surveyDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.demographics.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      pagination: buildPagination(total, page, limit),
    });
  }),
);

export default router;
