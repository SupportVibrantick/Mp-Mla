import prisma from "../../../lib/prisma.js";

import { ApiError } from "../../../utils/ApiError.js";

import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import catchAsync from "@/utils/catchAsync.js";

// ─── List ───────────────────────────────────────────────

export const getCommunityGroup = catchAsync(async (req, res) => {
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
});

// ─── Stats ──────────────────────────────────────────────

export const getCommunityGroupStats = catchAsync(async (req, res) => {
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
});

// ─── Get One ────────────────────────────────────────────

export const getOneCommunityGroup = catchAsync(async (req, res) => {
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
});
