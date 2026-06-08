import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  collectOwnMetrics,
  getCurrentPeriod,
} from "../../../lib/ownMetricsCollector.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /competitor-analysis/own-metrics — Get own metrics (auto + manual combined)
 */
export async function getOwnMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { period } = req.query as Record<string, string>;
    const targetPeriod = period || getCurrentPeriod();

    // 1. Get auto-computed metrics from DB
    const autoMetrics = await collectOwnMetrics(tenantId);

    // 2. Get manually entered metrics for this period
    const manualMetrics = await prisma.ownMetricEntry.findMany({
      where: { tenantId, period: targetPeriod, isAuto: false },
      orderBy: [{ category: "asc" }, { metricKey: "asc" }],
    });

    // 3. Get auto-saved entries from previous auto-collection
    const savedAutoMetrics = await prisma.ownMetricEntry.findMany({
      where: { tenantId, period: targetPeriod, isAuto: true },
      orderBy: [{ category: "asc" }, { metricKey: "asc" }],
    });

    // 4. Combine: manual entries + fresh auto-computed (for display)
    const allMetrics = [
      ...autoMetrics.map((m) => ({
        ...m,
        period: targetPeriod,
        isAuto: true,
        id: null as string | null,
      })),
      ...manualMetrics.map((m) => ({
        category: m.category,
        metricKey: m.metricKey,
        metricLabel: m.metricLabel,
        value: m.value,
        unit: m.unit,
        period: m.period,
        isAuto: false,
        id: m.id,
        notes: m.notes,
      })),
    ];

    // Group by category
    const grouped: Record<string, any[]> = {};
    allMetrics.forEach((m) => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    });

    // Get all distinct periods with manual data
    const periods = await prisma.ownMetricEntry.findMany({
      where: { tenantId },
      select: { period: true },
      distinct: ["period"],
      orderBy: { period: "desc" },
    });

    res.json({
      success: true,
      data: {
        period: targetPeriod,
        metrics: allMetrics,
        grouped,
        autoMetricsCount: autoMetrics.length,
        manualMetricsCount: manualMetrics.length,
        availablePeriods: periods.map((p) => p.period),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /competitor-analysis/own-metrics — Save manual own metrics
 */
export async function submitOwnMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { period, metrics } = req.body;

    const results = await Promise.all(
      metrics.map((m: any) =>
        prisma.ownMetricEntry.upsert({
          where: {
            tenantId_metricKey_period: {
              tenantId,
              metricKey: m.metricKey,
              period,
            },
          },
          create: {
            category: m.category,
            tenantId,
            metricKey: m.metricKey,
            metricLabel: m.metricLabel,
            value: m.value,
            unit: m.unit || null,
            period,
            isAuto: false,
            notes: m.notes || null,
            createdById: req.user!.id,
          },
          update: {
            category: m.category,
            metricLabel: m.metricLabel,
            value: m.value,
            unit: m.unit || null,
            notes: m.notes || null,
          },
        }),
      ),
    );

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "own_metrics",
      description: `Submitted ${metrics.length} own metrics for period ${period}`,
      newData: { period, metricsCount: metrics.length },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `${results.length} own metrics saved for period ${period}`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /competitor-analysis/own-metrics/auto — Get auto-computed metrics only (live)
 */
export async function getAutoMetrics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const autoMetrics = await collectOwnMetrics(tenantId);

    // Group by category
    const grouped: Record<string, any[]> = {};
    autoMetrics.forEach((m) => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    });

    res.json({
      success: true,
      data: {
        metrics: autoMetrics,
        grouped,
        totalMetrics: autoMetrics.length,
        computedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}
