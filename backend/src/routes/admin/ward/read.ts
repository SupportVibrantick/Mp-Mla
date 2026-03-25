import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import catchAsync from "../../../utils/catchAsync.js";



/**
 * GET /api/admin/ward
 * Lists all wards with optional filtering and pagination.
 */
export const listWards = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, zone, status, areaType } = req.query as Record<
    string,
    string
  >;

  const where: any = { isDeleted: false };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { zone: { contains: search, mode: "insensitive" } },
    ];
  }
  if (zone) where.zone = zone;
  if (status) where.status = status;
  if (areaType) where.areaType = { contains: areaType, mode: "insensitive" };

  const [wards, total] = await Promise.all([
    prisma.ward.findMany({
      where,
      include: {
        areas: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            areaType: true,
            population: true,
            households: true,
          },
          orderBy: { name: "asc" },
        },
        councillors: {
          where: { isCurrent: true },
          select: {
            id: true,
            name: true,
            phone: true,
            partyName: true,
            sinceDate: true,
            photoUrl: true,
            isCurrent: true,
          },
          take: 1,
        },
        _count: {
          select: {
            institutions: true,
            grievances: true,
            projects: true,
            communityGroups: true,
            demographics: true,
          },
        },
      },
      orderBy: { wardNumber: "asc" },
      skip,
      take: limit,
    }),
    prisma.ward.count({ where }),
  ]);

  const pagination = buildPagination(total, page, limit);

  res.json(
    ApiResponse.success(
      {
        wards,
        pagination,
      },
      "Wards fetched successfully",
    ),
  );
});




/**
 * GET /api/admin/ward/:id
 * Gets a single ward by ID with detailed information.
 */
export const getWard = catchAsync(async (req: Request, res: Response) => {
  const wardId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;
  if (!wardId) throw ApiError.badRequest("Ward ID is required");

  const ward = await prisma.ward.findFirst({
    where: { id: wardId, isDeleted: false },
    include: {
      areas: { where: { isDeleted: false }, orderBy: { name: "asc" } },
      councillors: { orderBy: { isCurrent: "desc" } },
      _count: {
        select: {
          institutions: true,
          grievances: true,
          projects: true,
          communityGroups: true,
          demographics: true,
          // schemeBeneficiaries: true,
        },
      },
    },
  });

  if (!ward) throw ApiError.notFound("Ward not found");

  // Fetch aggregated grievance stats for this ward
  const grievanceStats = await prisma.grievance.groupBy({
    by: ["status"],
    where: { wardId: ward.id, isDeleted: false },
    _count: true,
  });

  // Fetch project stats
  const projectStats = await prisma.project.groupBy({
    by: ["status"],
    where: { wardId: ward.id, isDeleted: false },
    _count: true,
  });

  // Fetch community groups summary
  const communityGroupStats = await prisma.communityGroup.groupBy({
    by: ["type"],
    where: { wardId: ward.id, isDeleted: false },
    _count: true,
    _sum: { memberCount: true },
  });

  // Fetch latest demographics (ward-level)
  const demographics = await prisma.demographics.findFirst({
    where: { wardId: ward.id, wardAreaId: null },
    orderBy: { surveyDate: "desc" },
  });

  res.json({
    success: true,
    data: {
      ...ward,
      currentCouncillor: ward.councillors.find((c) => c.isCurrent) || null,
      grievanceStats: grievanceStats.map((g) => ({
        status: g.status,
        count: g._count,
      })),
      projectStats: projectStats.map((p) => ({
        status: p.status,
        count: p._count,
      })),
      communityGroupStats: communityGroupStats.map((c) => ({
        type: c.type,
        count: c._count,
        totalMembers: c._sum.memberCount || 0,
      })),
      demographics,
    },
  });
});



/**
 * GET /api/admin/ward/stats
 * Gets aggregated statistics for all wards.
 */
export async function getWardStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardWhere = { isDeleted: false };

    const [totalWards, wardsByZone, wardsByStatus, populationAgg] =
      await Promise.all([
        prisma.ward.count({ where: wardWhere }),
        prisma.ward.groupBy({
          by: ["zone"],
          where: wardWhere,
          _count: true,
          _sum: { totalPopulation: true },
        }),
        prisma.ward.groupBy({ by: ["status"], where: wardWhere, _count: true }),
        prisma.ward.aggregate({
          where: wardWhere,
          _sum: {
            totalPopulation: true,
            totalHouseholds: true,
            totalMale: true,
            totalFemale: true,
          },
          _avg: { totalPopulation: true },
        }),
      ]);

    const totalAreas = await prisma.wardArea.count({ where: { isDeleted: false } });
    const areasByType = await prisma.wardArea.groupBy({
      by: ["areaType"],
      where: { isDeleted: false },
      _count: true,
      _sum: { population: true, households: true },
    });

    res.json({
      success: true,
      data: {
        totalWards,
        totalAreas,
        totalPopulation: populationAgg._sum.totalPopulation || 0,
        totalHouseholds: populationAgg._sum.totalHouseholds || 0,
        totalMale: populationAgg._sum.totalMale || 0,
        totalFemale: populationAgg._sum.totalFemale || 0,
        avgPopulation: Math.round(populationAgg._avg.totalPopulation || 0),
        byZone: wardsByZone.map((z) => ({
          zone: z.zone || "Unassigned",
          count: z._count,
          population: z._sum.totalPopulation || 0,
        })),
        byStatus: wardsByStatus.map((s) => ({
          status: s.status,
          count: s._count,
        })),
        areasByType: areasByType.map((a) => ({
          type: a.areaType,
          count: a._count,
          population: a._sum.population || 0,
          households: a._sum.households || 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
