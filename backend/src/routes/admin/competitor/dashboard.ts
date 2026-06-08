import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { collectOwnMetrics } from "../../../lib/ownMetricsCollector.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /competitor-analysis/dashboard — Overall competitive position summary
 */
export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    // 1. Get all active competitors with their latest analysis
    const competitors = await prisma.competitor.findMany({
      where: { tenantId, isDeleted: false, isActive: true },
      include: {
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
            executiveSummary: true,
            strengths: true,
            weaknesses: true,
            createdAt: true,
          },
        },
        _count: { select: { metrics: true, analyses: true } },
      },
    });

    // 2. Compute overall position
    const analyzedCompetitors = competitors.filter(
      (c) => c.analyses.length > 0,
    );
    const avgScore =
      analyzedCompetitors.length > 0
        ? Math.round(
            analyzedCompetitors.reduce(
              (sum, c) => sum + (c.analyses[0]?.overallScore || 0),
              0,
            ) / analyzedCompetitors.length,
          )
        : null;

    // 3. Determine threat levels per competitor
    const competitorSummaries = competitors.map((c) => {
      const analysis = c.analyses[0] || null;
      let threatLevel: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN" = "UNKNOWN";

      if (analysis) {
        const score = analysis.overallScore || 50;
        if (score >= 70) threatLevel = "LOW";
        else if (score >= 40) threatLevel = "MEDIUM";
        else threatLevel = "HIGH";
      }

      return {
        id: c.id,
        candidateName: c.candidateName,
        partyName: c.partyName,
        candidatePhoto: c.candidatePhoto,
        latestAnalysis: analysis,
        threatLevel,
        metricsCount: c._count.metrics,
        analysesCount: c._count.analyses,
      };
    });

    // 4. Get own metrics summary
    const autoMetrics = await collectOwnMetrics(tenantId);
    const totalAutoMetrics = autoMetrics.length;

    // Category-wise summary
    const categoryMap: Record<string, number> = {};
    autoMetrics.forEach((m) => {
      if (!categoryMap[m.category]) categoryMap[m.category] = 0;
      categoryMap[m.category]++;
    });

    // 5. Recent analyses
    const recentAnalyses = await prisma.competitorAnalysis.findMany({
      where: { status: "COMPLETED", competitor: { tenantId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        overallScore: true,
        executiveSummary: true,
        weaknesses: true,
        opportunities: true,
        createdAt: true,
        competitor: {
          select: { candidateName: true, partyName: true },
        },
      },
    });

    // 6. Overall stats
    const totalCompetitors = competitors.length;
    const totalAnalyzed = analyzedCompetitors.length;
    const totalHighThreat = competitorSummaries.filter(
      (c) => c.threatLevel === "HIGH",
    ).length;

    res.json({
      success: true,
      data: {
        overview: {
          totalCompetitors,
          totalAnalyzed,
          avgCompetitiveScore: avgScore,
          totalHighThreat,
          totalOwnMetrics: totalAutoMetrics,
          categoryBreakdown: categoryMap,
        },
        competitors: competitorSummaries,
        recentAnalyses: recentAnalyses.map((a: any) => ({
          id: a.id,
          competitorName: a.competitor.candidateName,
          competitorParty: a.competitor.partyName,
          overallScore: a.overallScore,
          summary: a.executiveSummary,
          vulnerabilities: a.weaknesses || [],
          opportunities: a.opportunities || [],
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
