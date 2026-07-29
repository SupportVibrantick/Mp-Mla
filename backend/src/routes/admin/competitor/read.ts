import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /competitors — List all competitors with stats
 */
export async function listCompetitors(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const {
      page = "1",
      limit = "20",
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { tenantId, isDeleted: false };

    if (search) {
      where.OR = [
        { candidateName: { contains: search, mode: "insensitive" } },
        { partyName: { contains: search, mode: "insensitive" } },
        { constituency: { contains: search, mode: "insensitive" } },
      ];
    }

    const [competitors, total] = await Promise.all([
      prisma.competitor.findMany({
        where,
        include: {
          _count: {
            select: {
              metrics: true,
              analyses: true,
            },
          },
          analyses: {
            where: { status: "COMPLETED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              overallScore: true,
              areasLeading: true,
              areasTrailing: true,
              areasTied: true,
              createdAt: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limitNum,
      }),
      prisma.competitor.count({ where }),
    ]);

    res.json({
      success: true,
      data: competitors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /competitors/:id — Get competitor detail
 */
export async function getCompetitor(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const competitor = await prisma.competitor.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        metrics: {
          orderBy: [{ period: "desc" }, { category: "asc" }],
        },
        analyses: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            overallScore: true,
            areasLeading: true,
            areasTrailing: true,
            areasTied: true,
            executiveSummary: true,
            createdAt: true,
          },
        },
        _count: {
          select: { metrics: true, analyses: true },
        },
      },
    });

    if (!competitor) {
      throw ApiError.notFound("Competitor not found");
    }

    res.json({ success: true, data: competitor });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /competitors/stats — Overall competitor stats
 */
export async function getCompetitorStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const [total, active, withAnalysis] = await Promise.all([
      prisma.competitor.count({ where: { tenantId, isDeleted: false } }),
      prisma.competitor.count({ where: { tenantId, isDeleted: false, isActive: true } }),
      prisma.competitor.count({
        where: {
          tenantId,
          isDeleted: false,
          analyses: { some: { status: "COMPLETED" } },
        },
      }),
    ]);

    const totalAnalyses = await prisma.competitorAnalysis.count({
      where: { status: "COMPLETED", competitor: { tenantId } },
    });

    res.json({
      success: true,
      data: {
        totalCompetitors: total,
        activeCompetitors: active,
        competitorsAnalyzed: withAnalysis,
        totalAnalyses,
      },
    });
  } catch (error) {
    next(error);
  }
}
