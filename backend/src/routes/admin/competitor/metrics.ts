import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /competitors/:id/metrics — List metrics for a competitor
 */
export async function listCompetitorMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { period, category } = req.query as Record<string, string>;

    const competitor = await prisma.competitor.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!competitor) throw ApiError.notFound("Competitor not found");

    const where: any = { competitorId: id };
    if (period) where.period = period;
    if (category) where.category = category;

    const metrics = await prisma.competitorMetricEntry.findMany({
      where,
      orderBy: [{ period: "desc" }, { category: "asc" }, { metricKey: "asc" }],
    });

    // Group by period
    const grouped: Record<string, any[]> = {};
    metrics.forEach((m) => {
      if (!grouped[m.period]) grouped[m.period] = [];
      grouped[m.period].push(m);
    });

    // Get all distinct periods
    const periods = await prisma.competitorMetricEntry.findMany({
      where: { competitorId: id },
      select: { period: true },
      distinct: ["period"],
      orderBy: { period: "desc" },
    });

    res.json({
      success: true,
      data: {
        metrics,
        grouped,
        periods: periods.map((p) => p.period),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /competitors/:id/metrics — Add/Update metrics for a period (upsert)
 */
export async function submitCompetitorMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { period, metrics } = req.body;

    const competitor = await prisma.competitor.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!competitor) throw ApiError.notFound("Competitor not found");

    // Upsert each metric entry
    const results = await Promise.all(
      metrics.map((m: any) =>
        prisma.competitorMetricEntry.upsert({
          where: {
            competitorId_metricKey_period: {
              competitorId: id,
              metricKey: m.metricKey,
              period,
            },
          },
          create: {
            tenantId,
            competitorId: id,
            category: m.category,
            metricKey: m.metricKey,
            metricLabel: m.metricLabel,
            value: m.value,
            unit: m.unit || null,
            period,
            notes: m.notes || null,
            source: m.source || null,
          },
          update: {
            category: m.category,
            metricLabel: m.metricLabel,
            value: m.value,
            unit: m.unit || null,
            notes: m.notes || null,
            source: m.source || null,
          },
        }),
      ),
    );

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "competitor_metrics",
      recordId: id,
      description: `Submitted ${metrics.length} metrics for "${competitor.candidateName}" — period ${period}`,
      newData: { period, metricsCount: metrics.length },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `${results.length} metrics saved for ${competitor.candidateName} (${period})`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /competitors/:id/metrics/:metricId — Delete a single metric entry
 */
export async function deleteCompetitorMetric(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const metricId = req.params.metricId as string;

    const competitor = await prisma.competitor.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!competitor) throw ApiError.notFound("Competitor not found");

    const metric = await prisma.competitorMetricEntry.findFirst({
      where: { id: metricId, competitorId: id },
    });
    if (!metric) throw ApiError.notFound("Metric entry not found");

    await prisma.competitorMetricEntry.delete({ where: { id: metricId } });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "competitor_metrics",
      recordId: metricId,
      description: `Deleted metric "${metric.metricLabel}" for competitor`,
      oldData: {
        metricKey: metric.metricKey,
        value: metric.value,
        period: metric.period,
      },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Metric "${metric.metricLabel}" deleted`,
    });
  } catch (error) {
    next(error);
  }
}
