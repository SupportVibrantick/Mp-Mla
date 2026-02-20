import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";

export async function listInstitutions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { wardId, category, status, search, sortBy, sortOrder } =
      req.query as Record<string, string>;

    const where: any = {};
    if (wardId) where.wardId = wardId;
    if (category && category !== "all") where.category = category;
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { subcategory: { contains: search, mode: "insensitive" } },
        { contactNo: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === "name") orderBy.name = sortOrder || "asc";
    else if (sortBy === "category") orderBy.category = sortOrder || "asc";
    else if (sortBy === "capacity") orderBy.capacity = sortOrder || "desc";
    else orderBy.createdAt = "desc";

    const [data, total] = await Promise.all([
      prisma.institution.findMany({
        where,
        include: {
          ward: {
            select: { id: true, name: true, wardNumber: true, zone: true },
          },
          _count: { select: { incharges: true } },
          incharges: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              designation: true,
              contactNo: true,
            },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.institution.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      pagination: buildPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function getInstitution(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: req.params.id },
      include: {
        ward: {
          select: {
            id: true,
            name: true,
            wardNumber: true,
            zone: true,
            totalPopulation: true,
            areaType: true,
          },
        },
        incharges: {
          orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!institution) throw ApiError.notFound("Institution not found");

    // Related institutions in same ward + category
    const related = await prisma.institution.findMany({
      where: {
        wardId: institution.wardId,
        id: { not: institution.id },
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
      },
      orderBy: { name: "asc" },
      take: 10,
    });

    res.json({
      success: true,
      data: { ...institution, relatedInstitutions: related },
    });
  } catch (error) {
    next(error);
  }
}

export async function getInstitutionStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardId = req.query.wardId as string;
    const baseWhere: any = {};
    if (wardId) baseWhere.wardId = wardId;

    const [
      total,
      active,
      inactive,
      byCategory,
      byStatus,
      byWard,
      totalIncharges,
      recentlyAdded,
    ] = await Promise.all([
      prisma.institution.count({ where: baseWhere }),
      prisma.institution.count({
        where: { ...baseWhere, status: "ACTIVE" },
      }),
      prisma.institution.count({
        where: {
          ...baseWhere,
          status: { in: ["INACTIVE", "CLOSED"] },
        },
      }),
      prisma.institution.groupBy({
        by: ["category"],
        where: baseWhere,
        _count: true,
        _sum: { capacity: true },
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.institution.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: true,
      }),
      prisma.institution.groupBy({
        by: ["wardId"],
        where: { ...baseWhere, status: "ACTIVE" },
        _count: true,
        orderBy: { _count: { wardId: "desc" } },
      }),
      prisma.incharge.count({
        where: {
          isActive: true,
          ...(wardId ? { institution: { wardId } } : {}),
        },
      }),
      prisma.institution.findMany({
        where: baseWhere,
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
          createdAt: true,
          ward: { select: { name: true, wardNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Get ward names for byWard
    const wardIds = byWard.map((w) => w.wardId);
    const wards = await prisma.ward.findMany({
      where: { id: { in: wardIds } },
      select: { id: true, name: true, wardNumber: true },
    });
    const wardMap = Object.fromEntries(wards.map((w) => [w.id, w]));

    const totalCapacity = byCategory.reduce(
      (s, c) => s + (c._sum.capacity || 0),
      0,
    );

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        totalIncharges,
        totalCapacity,
        byCategory: byCategory.map((c) => ({
          category: c.category,
          count: c._count,
          capacity: c._sum.capacity || 0,
        })),
        byStatus: byStatus.map((s) => ({
          status: s.status,
          count: s._count,
        })),
        byWard: byWard.map((w) => ({
          wardId: w.wardId,
          wardName: wardMap[w.wardId]?.name || "Unknown",
          wardNumber: wardMap[w.wardId]?.wardNumber || 0,
          count: w._count,
        })),
        recentlyAdded,
      },
    });
  } catch (error) {
    next(error);
  }
}
