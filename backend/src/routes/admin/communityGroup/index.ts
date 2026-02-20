// import { Router } from "express";
// import prisma from "../../../lib/prisma.js";
// import { requirePermission } from "../../../middleware/permission.js";
// import {
//   createAuditLog,
//   getRequestMeta,
// } from "../../../middleware/auditLog.js";
// import { ApiError } from "../../../utils/ApiError.js";
// import { validate } from "../../../middleware/validate.js";
// import { buildPagination, parsePagination } from "../../../utils/helpers.js";
// import { z } from "zod";
// import catchAsync from "@/utils/catchAsync.js";

// const router = Router();

// const createSchema = z.object({
//   name: z.string().min(1, "Name is required"),
//   type: z.enum([
//     "MARKET",
//     "SLUM",
//     "SPORTS_TEAM",
//     "CLUB",
//     "RWA",
//     "SENIOR_CITIZEN",
//     "BUDDHIJEEVI",
//     "WOMEN_GROUP",
//     "YOUTH_GROUP",
//     "CULTURAL_ORG",
//     "NGO",
//     "FESTIVAL_COMMITTEE",
//     "TRADE_UNION",
//     "OTHER",
//   ]),
//   wardId: z.string().min(1, "Ward is required"),
//   wardAreaId: z.string().optional().nullable(),
//   address: z.string().optional(),
//   description: z.string().optional(),
//   memberCount: z.number().int().min(0).optional(),
//   maleMembers: z.number().int().min(0).optional(),
//   femaleMembers: z.number().int().min(0).optional(),
//   headName: z.string().optional(),
//   headPhone: z.string().optional(),
//   headEmail: z.string().email().optional().or(z.literal("")),
//   headDesignation: z.string().optional(),
//   headPhotoUrl: z.string().optional(),
//   foundedDate: z.string().datetime().optional(),
//   registrationNo: z.string().optional(),
//   isActive: z.boolean().default(true),
// });

// // ─── List ───────────────────────────────────────────────

// router.get(
//   "/",
//   requirePermission("community_groups", "read"),
//   catchAsync(async (req, res) => {
//     const { page, limit, skip } = parsePagination(req.query);
//     const { wardId, wardAreaId, type, search, isActive } = req.query as Record<
//       string,
//       string
//     >;

//     const where: any = {};
//     if (wardId) where.wardId = wardId;
//     if (wardAreaId) where.wardAreaId = wardAreaId;
//     if (type) where.type = type;
//     if (isActive !== undefined) where.isActive = isActive === "true";
//     if (search) {
//       where.OR = [
//         { name: { contains: search, mode: "insensitive" } },
//         { headName: { contains: search, mode: "insensitive" } },
//       ];
//     }

//     const [data, total] = await Promise.all([
//       prisma.communityGroup.findMany({
//         where,
//         include: {
//           ward: { select: { id: true, name: true, wardNumber: true } },
//           wardArea: { select: { id: true, name: true, areaType: true } },
//         },
//         orderBy: { name: "asc" },
//         skip,
//         take: limit,
//       }),
//       prisma.communityGroup.count({ where }),
//     ]);

//     res.json({
//       success: true,
//       data,
//       pagination: buildPagination(total, page, limit),
//     });
//   }),
// );

// // ─── Stats ──────────────────────────────────────────────

// router.get(
//   "/stats",
//   requirePermission("community_groups", "read"),
//   catchAsync(async (req, res) => {
//     const wardId = req.query.wardId as string;
//     const where = wardId ? { wardId } : {};

//     const [total, byType, byWard, memberAgg] = await Promise.all([
//       prisma.communityGroup.count({ where: { ...where, isActive: true } }),
//       prisma.communityGroup.groupBy({
//         by: ["type"],
//         where: { ...where, isActive: true },
//         _count: true,
//         _sum: { memberCount: true, maleMembers: true, femaleMembers: true },
//       }),
//       prisma.communityGroup.groupBy({
//         by: ["wardId"],
//         where: { ...where, isActive: true },
//         _count: true,
//         _sum: { memberCount: true },
//       }),
//       prisma.communityGroup.aggregate({
//         where: { ...where, isActive: true },
//         _sum: { memberCount: true, maleMembers: true, femaleMembers: true },
//       }),
//     ]);

//     // Fetch ward names for the byWard stats
//     const wardIds = byWard.map((w) => w.wardId);
//     const wards = await prisma.ward.findMany({
//       where: { id: { in: wardIds } },
//       select: { id: true, name: true, wardNumber: true },
//     });
//     const wardMap = Object.fromEntries(wards.map((w) => [w.id, w]));

//     res.json({
//       success: true,
//       data: {
//         total,
//         totalMembers: memberAgg._sum.memberCount || 0,
//         totalMale: memberAgg._sum.maleMembers || 0,
//         totalFemale: memberAgg._sum.femaleMembers || 0,
//         byType: byType.map((t) => ({
//           type: t.type,
//           count: t._count,
//           members: t._sum.memberCount || 0,
//           male: t._sum.maleMembers || 0,
//           female: t._sum.femaleMembers || 0,
//         })),
//         byWard: byWard.map((w) => ({
//           wardId: w.wardId,
//           wardName: wardMap[w.wardId]?.name || "Unknown",
//           wardNumber: wardMap[w.wardId]?.wardNumber,
//           count: w._count,
//           members: w._sum.memberCount || 0,
//         })),
//       },
//     });
//   }),
// );

// // ─── Get One ────────────────────────────────────────────

// router.get(
//   "/:id",
//   requirePermission("community_groups", "read"),
//   catchAsync(async (req, res) => {
//     const group = await prisma.communityGroup.findUnique({
//       where: { id: req.params.id as string },
//       include: {
//         ward: {
//           select: { id: true, name: true, wardNumber: true, zone: true },
//         },
//         wardArea: {
//           select: { id: true, name: true, areaType: true, population: true },
//         },
//       },
//     });
//     if (!group) throw ApiError.notFound("Community group not found");
//     res.json({ success: true, data: group });
//   }),
// );

// // ─── Create ─────────────────────────────────────────────

// router.post(
//   "/",
//   requirePermission("community_groups", "create"),
//   validate(createSchema),
//   catchAsync(async (req, res) => {
//     const data: any = { ...req.body };
//     if (data.foundedDate) data.foundedDate = new Date(data.foundedDate);
//     if (data.wardAreaId === "") data.wardAreaId = null;

//     const group = await prisma.communityGroup.create({
//       data,
//       include: {
//         ward: { select: { name: true } },
//         wardArea: { select: { name: true } },
//       },
//     });

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "CREATE",
//       module: "community_groups",
//       recordId: group.id,
//       description: `Created community group "${group.name}" (${group.type})`,
//       newData: { name: group.name, type: group.type, wardId: group.wardId },
//       ...getRequestMeta(req),
//     });

//     res.status(201).json({ success: true, data: group });
//   }),
// );

// // ─── Update ─────────────────────────────────────────────

// router.put(
//   "/:id",
//   requirePermission("community_groups", "update"),
//   validate(createSchema.partial()),
//   catchAsync(async (req, res) => {
//     const comunityId = req.params.id as string;
//     const old = await prisma.communityGroup.findUnique({
//       where: { id: comunityId },
//     });
//     if (!old) throw ApiError.notFound("Community group not found");

//     const data: any = { ...req.body };
//     if (data.foundedDate) data.foundedDate = new Date(data.foundedDate);
//     if (data.wardAreaId === "") data.wardAreaId = null;

//     const group = await prisma.communityGroup.update({
//       where: { id: comunityId },
//       data,
//     });

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "UPDATE",
//       module: "community_groups",
//       recordId: group.id,
//       description: `Updated community group "${group.name}"`,
//       oldData: { name: old.name, type: old.type, memberCount: old.memberCount },
//       newData: req.body,
//       ...getRequestMeta(req),
//     });

//     res.json({ success: true, data: group });
//   }),
// );

// // ─── Delete ─────────────────────────────────────────────

// router.delete(
//   "/:id",
//   requirePermission("community_groups", "delete"),
//   catchAsync(async (req, res) => {
//     const group = await prisma.communityGroup.findUnique({
//       where: { id: req.params.id as string },
//     });
//     if (!group) throw ApiError.notFound("Community group not found");

//     await prisma.communityGroup.delete({
//       where: { id: req.params.id as string },
//     });

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "DELETE",
//       module: "community_groups",
//       recordId: group.id,
//       description: `Deleted community group "${group.name}"`,
//       ...getRequestMeta(req),
//     });

//     res.json({ success: true, message: `"${group.name}" deleted` });
//   }),
// );

// export default router;

import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { validate } from "../../../middleware/validate.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import { z } from "zod";
import catchAsync from "@/utils/catchAsync.js";

const router = Router();

// ─── Schemas ────────────────────────────────────────────

const COMMUNITY_TYPES = [
  "MARKET",
  "SLUM",
  "SPORTS_TEAM",
  "CLUB",
  "RWA",
  "SENIOR_CITIZEN",
  "BUDDHIJEEVI",
  "WOMEN_GROUP",
  "YOUTH_GROUP",
  "CULTURAL_ORG",
  "NGO",
  "FESTIVAL_COMMITTEE",
  "TRADE_UNION",
  "OTHER",
] as const;

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(COMMUNITY_TYPES),
  wardId: z.string().min(1, "Ward is required"),
  wardAreaId: z.string().optional().nullable(),
  address: z.string().optional(),
  description: z.string().optional(),
  memberCount: z.number().int().min(0).default(0),
  maleMembers: z.number().int().min(0).default(0),
  femaleMembers: z.number().int().min(0).default(0),
  headName: z.string().optional(),
  headPhone: z.string().optional(),
  headEmail: z.string().email().optional().or(z.literal("")),
  headDesignation: z.string().optional(),
  headPhotoUrl: z.string().optional(),
  foundedDate: z.string().datetime().optional(),
  registrationNo: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateSchema = createSchema.partial();

// ─── List ───────────────────────────────────────────────

router.get(
  "/",
  requirePermission("community_groups", "read"),
  catchAsync(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { wardId, wardAreaId, type, search, isActive } = req.query as Record<
      string,
      string
    >;

    const where: any = {};
    if (wardId) where.wardId = wardId;
    if (wardAreaId) where.wardAreaId = wardAreaId;
    if (type && type !== "all") where.type = type;
    if (isActive !== undefined && isActive !== "all")
      where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { headName: { contains: search, mode: "insensitive" } },
        { registrationNo: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.communityGroup.findMany({
        where,
        include: {
          ward: {
            select: { id: true, name: true, wardNumber: true, zone: true },
          },
          wardArea: {
            select: { id: true, name: true, areaType: true },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.communityGroup.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      pagination: buildPagination(total, page, limit),
    });
  }),
);

// ─── Stats ──────────────────────────────────────────────

router.get(
  "/stats",
  requirePermission("community_groups", "read"),
  catchAsync(async (req, res) => {
    const wardId = req.query.wardId as string;
    const baseWhere: any = { isActive: true };
    if (wardId) baseWhere.wardId = wardId;

    const [total, totalAll, byType, byWard, memberAgg] = await Promise.all([
      prisma.communityGroup.count({ where: baseWhere }),
      prisma.communityGroup.count(),
      prisma.communityGroup.groupBy({
        by: ["type"],
        where: baseWhere,
        _count: true,
        _sum: {
          memberCount: true,
          maleMembers: true,
          femaleMembers: true,
        },
        orderBy: { _count: { type: "desc" } },
      }),
      prisma.communityGroup.groupBy({
        by: ["wardId"],
        where: baseWhere,
        _count: true,
        _sum: { memberCount: true },
        orderBy: { _count: { wardId: "desc" } },
      }),
      prisma.communityGroup.aggregate({
        where: baseWhere,
        _sum: {
          memberCount: true,
          maleMembers: true,
          femaleMembers: true,
        },
      }),
    ]);

    // Ward names
    const wardIds = byWard.map((w) => w.wardId);
    const wards = await prisma.ward.findMany({
      where: { id: { in: wardIds } },
      select: { id: true, name: true, wardNumber: true },
    });
    const wardMap = Object.fromEntries(wards.map((w) => [w.id, w]));

    const inactive = totalAll - total;

    res.json({
      success: true,
      data: {
        total,
        inactive,
        totalMembers: memberAgg._sum.memberCount || 0,
        totalMale: memberAgg._sum.maleMembers || 0,
        totalFemale: memberAgg._sum.femaleMembers || 0,
        byType: byType.map((t) => ({
          type: t.type,
          count: t._count,
          members: t._sum.memberCount || 0,
          male: t._sum.maleMembers || 0,
          female: t._sum.femaleMembers || 0,
        })),
        byWard: byWard.map((w) => ({
          wardId: w.wardId,
          wardName: wardMap[w.wardId]?.name || "Unknown",
          wardNumber: wardMap[w.wardId]?.wardNumber || 0,
          count: w._count,
          members: w._sum.memberCount || 0,
        })),
      },
    });
  }),
);

// ─── Get One ────────────────────────────────────────────

router.get(
  "/:id",
  requirePermission("community_groups", "read"),
  catchAsync(async (req, res) => {
    const group = await prisma.communityGroup.findUnique({
      where: { id: req.params.id as string },
      include: {
        ward: {
          select: {
            id: true,
            name: true,
            wardNumber: true,
            zone: true,
            totalPopulation: true,
          },
        },
        wardArea: {
          select: {
            id: true,
            name: true,
            areaType: true,
            population: true,
            households: true,
          },
        },
      },
    });
    if (!group) throw ApiError.notFound("Community group not found");

    // Get other groups in same ward for context
    const relatedGroups = await prisma.communityGroup.findMany({
      where: {
        wardId: group.wardId,
        id: { not: group.id },
        isActive: true,
      },
      select: { id: true, name: true, type: true, memberCount: true },
      orderBy: { name: "asc" },
      take: 10,
    });

    res.json({ success: true, data: { ...group, relatedGroups } });
  }),
);

// ─── Create ─────────────────────────────────────────────

router.post(
  "/",
  requirePermission("community_groups", "create"),
  validate(createSchema),
  catchAsync(async (req, res) => {
    const data: any = { ...req.body };
    if (data.foundedDate) data.foundedDate = new Date(data.foundedDate);
    if (data.wardAreaId === "" || data.wardAreaId === undefined)
      data.wardAreaId = null;
    if (data.headEmail === "") delete data.headEmail;

    // Verify ward exists
    const ward = await prisma.ward.findUnique({
      where: { id: data.wardId },
    });
    if (!ward) throw ApiError.notFound("Ward not found");

    // Verify area if provided
    if (data.wardAreaId) {
      const area = await prisma.wardArea.findUnique({
        where: { id: data.wardAreaId },
      });
      if (!area) throw ApiError.notFound("Area not found");
      if (area.wardId !== data.wardId)
        throw ApiError.badRequest("Area does not belong to selected ward");
    }

    const group = await prisma.communityGroup.create({
      data,
      include: {
        ward: { select: { name: true, wardNumber: true } },
        wardArea: { select: { name: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "community_groups",
      recordId: group.id,
      description: `Created community group "${group.name}" (${group.type}) in ward "${group.ward.name}"`,
      newData: {
        name: group.name,
        type: group.type,
        wardId: group.wardId,
        memberCount: group.memberCount,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `"${group.name}" created successfully`,
      data: group,
    });
  }),
);

// ─── Update ─────────────────────────────────────────────

router.put(
  "/:id",
  requirePermission("community_groups", "update"),
  validate(updateSchema),
  catchAsync(async (req, res) => {
    const old = await prisma.communityGroup.findUnique({
      where: { id: req.params.id as string },
    });
    if (!old) throw ApiError.notFound("Community group not found");

    const data: any = { ...req.body };
    if (data.foundedDate) data.foundedDate = new Date(data.foundedDate);
    if (data.wardAreaId === "") data.wardAreaId = null;
    if (data.headEmail === "") delete data.headEmail;

    // Verify area belongs to ward
    if (data.wardAreaId && data.wardId) {
      const area = await prisma.wardArea.findUnique({
        where: { id: data.wardAreaId },
      });
      if (area && area.wardId !== (data.wardId || old.wardId)) {
        throw ApiError.badRequest("Area does not belong to selected ward");
      }
    }

    const group = await prisma.communityGroup.update({
      where: { id: req.params.id as string },
      data,
      include: {
        ward: { select: { name: true } },
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "community_groups",
      recordId: group.id,
      description: `Updated community group "${group.name}"`,
      oldData: {
        name: old.name,
        type: old.type,
        memberCount: old.memberCount,
        isActive: old.isActive,
      },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${group.name}" updated`,
      data: group,
    });
  }),
);

// ─── Delete ─────────────────────────────────────────────

router.delete(
  "/:id",
  requirePermission("community_groups", "delete"),
  catchAsync(async (req, res) => {
    const group = await prisma.communityGroup.findUnique({
      where: { id: req.params.id as string },
    });
    if (!group) throw ApiError.notFound("Community group not found");

    await prisma.communityGroup.delete({
      where: { id: req.params.id as string },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "community_groups",
      recordId: group.id,
      description: `Deleted community group "${group.name}"`,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: `"${group.name}" deleted` });
  }),
);

// ─── Toggle Active ──────────────────────────────────────

router.patch(
  "/:id/toggle-active",
  requirePermission("community_groups", "update"),
  catchAsync(async (req, res) => {
    const group = await prisma.communityGroup.findUnique({
      where: { id: req.params.id as string },
    });
    if (!group) throw ApiError.notFound("Community group not found");

    const updated = await prisma.communityGroup.update({
      where: { id: req.params.id as string },
      data: { isActive: !group.isActive },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "community_groups",
      recordId: group.id,
      description: `${updated.isActive ? "Activated" : "Deactivated"} "${group.name}"`,
      oldData: { isActive: group.isActive },
      newData: { isActive: updated.isActive },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${group.name}" ${updated.isActive ? "activated" : "deactivated"}`,
      data: updated,
    });
  }),
);

export default router;
