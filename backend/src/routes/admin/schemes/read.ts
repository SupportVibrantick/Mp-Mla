import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";

export async function listSchemes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const { department, level, status, search } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (department && department !== "all") where.department = department;
    if (level && level !== "all") where.level = level;
    if (status && status !== "all") where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.scheme.findMany({
        where,
        include: {
          _count: { select: { applications: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.scheme.count({ where }),
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

export async function getScheme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const schemeId = req.params.id as string;

    const scheme = await prisma.scheme.findFirst({
      where: { id: schemeId, tenantId, isDeleted: false },
    });
    if (!scheme) throw ApiError.notFound("Scheme not found");

    res.json({
      success: true,
      data: scheme,
    });
  } catch (error) {
    next(error);
  }
}

export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const schemeId = req.params.id as string; // Optional: stats for a single scheme

    const ws: any = { tenantId, isDeleted: false };
    const wa: any = { tenantId, isDeleted: false };
    if (schemeId) wa.schemeId = schemeId;

    const [
      totalSchemes,
      activeSchemes,
      totalApplications,
      byStatus,
    ] = await Promise.all([
      prisma.scheme.count({ where: ws }),
      prisma.scheme.count({ where: { ...ws, status: "ACTIVE" } }),
      prisma.schemeApplication.count({ where: wa }),
      prisma.schemeApplication.groupBy({ by: ["status"], where: wa, _count: true }),
    ]);

    const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

    res.json({
      success: true,
      data: {
        totalSchemes,
        activeSchemes,
        totalApplications,
        draft: sm["DRAFT"] || 0,
        submitted: sm["SUBMITTED"] || 0,
        underReview: sm["UNDER_REVIEW"] || 0,
        documentPending: sm["DOCUMENT_PENDING"] || 0,
        approved: sm["APPROVED"] || 0,
        rejected: sm["REJECTED"] || 0,
        completed: sm["COMPLETED"] || 0,
        cancelled: sm["CANCELLED"] || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
