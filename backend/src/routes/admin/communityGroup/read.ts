import prisma from "../../../lib/prisma.js";

import { ApiError } from "../../../utils/ApiError.js";

import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import catchAsync from "@/utils/catchAsync.js";

/**
 * GET /api/admin/community-groups
 * Returns all Community Group in the system, grouped by module.
 * Used by admin UI to render the Communty Group editor grid.
 */
export const getCommunityGroup = catchAsync(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { wardId, wardAreaId, type, search, isActive } = req.query as Record<
    string,
    string
  >;
  const where: any = { isDeleted: false };
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
});

/**
 * GET /api/admin/community-group/stats
 * Gets dashboard statistics for community groups.
 */
export const getCommunityGroupStats = catchAsync(async (req, res) => {
  const wardId = req.query.wardId as string;
  const baseWhere: any = { isActive: true, isDeleted: false };
  const allWhere: any = { isDeleted: false };
  if (wardId) baseWhere.wardId = wardId;
  if (wardId) allWhere.wardId = wardId;

  const [total, totalAll, byType, byWard, memberAgg] = await Promise.all([
    prisma.communityGroup.count({ where: baseWhere }),
    prisma.communityGroup.count({ where: allWhere }),
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
});

/**
 * GET /api/admin/community-group/:id
 * Gets a single community group with its ward and ward area details.
 */
export const getOneCommunityGroup = catchAsync(async (req, res) => {
  const groupId = req.params.id as string;

  const group = await prisma.communityGroup.findUnique({
    where: { id: groupId },
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
  if (!group || group.isDeleted) throw ApiError.notFound("Community group not found");

  // Get other groups in same ward for context
  const relatedGroups = await prisma.communityGroup.findMany({
    where: {
      wardId: group.wardId,
      isActive: true,
      AND: [
        { id: { not: group.id } },
        { isDeleted: false },
      ],
    },
    select: { id: true, name: true, type: true, memberCount: true },
    orderBy: { name: "asc" },
    take: 10,
  });

  res.json({ success: true, data: { ...group, relatedGroups } });
});
