import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { generateJSON, generateText } from "../../../lib/deepseek.js";
import {
  buildAnalysisPrompt,
  buildChatPrompt,
  MetricDataPoint,
} from "../../../lib/competitorPrompts.js";
import {
  collectOwnMetrics,
  getCurrentPeriod,
  formatPeriodDisplay,
} from "../../../lib/ownMetricsCollector.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import logger from "../../../utils/logger.js";
import { z } from "zod";
import { requireTenantId } from "../../../utils/tenant.js";

const analysisResultSchema = z.object({
  executiveSummary: z.string().min(1),
  overallScore: z.coerce.number().min(0).max(100),
  areasLeading: z.coerce.number().int().min(0).default(0),
  areasTrailing: z.coerce.number().int().min(0).default(0),
  areasTied: z.coerce.number().int().min(0).default(0),
  metricComparisons: z
    .array(
      z.object({
        category: z.string(),
        categoryLabel: z.string().optional(),
        ours: z.coerce.number().min(0).max(100).default(0),
        theirs: z.coerce.number().min(0).max(100).default(0),
        gap: z.coerce.number().default(0),
        advantage: z.enum(["ours", "theirs", "tied"]).catch("tied"),
        insight: z.string().default("No insight available."),
        recommendation: z
          .string()
          .default("Collect more data before deciding action."),
      }),
    )
    .default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  threats: z.array(z.string()).default([]),
  recommendations: z
    .array(
      z.object({
        priority: z.enum(["HIGH", "MEDIUM", "LOW"]).catch("MEDIUM"),
        action: z.string(),
        expectedImpact: z
          .string()
          .default("Impact to be validated after execution."),
        timeline: z.string().default("1-2 weeks"),
        category: z.string().optional(),
      }),
    )
    .default([]),
});

/**
 * POST /competitors/:id/analyze — Trigger AI analysis
 */
export async function triggerAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { period } = req.body;
    const targetPeriod = period || getCurrentPeriod();

    // 1. Validate competitor exists
    const competitor = await prisma.competitor.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!competitor) throw ApiError.notFound("Competitor not found");

    // 2. Gather competitor metrics
    const competitorMetrics = await prisma.competitorMetricEntry.findMany({
      where: { competitorId: id, period: targetPeriod },
    });

    // 3. Gather own metrics: auto + manual
    const autoMetrics = await collectOwnMetrics(tenantId);
    const manualMetrics = await prisma.ownMetricEntry.findMany({
      where: { tenantId, period: targetPeriod },
    });

    // Merge own metrics (manual overrides auto for same key)
    const ownMetricsMap = new Map<string, MetricDataPoint>();
    autoMetrics.forEach((m) => {
      ownMetricsMap.set(m.metricKey, {
        category: m.category,
        metricKey: m.metricKey,
        metricLabel: m.metricLabel,
        value: m.value,
        unit: m.unit,
      });
    });
    manualMetrics.forEach((m) => {
      ownMetricsMap.set(m.metricKey, {
        category: m.category,
        metricKey: m.metricKey,
        metricLabel: m.metricLabel,
        value: m.value,
        unit: m.unit || undefined,
      });
    });

    const ownMetricsList = Array.from(ownMetricsMap.values());
    const competitorMetricsList: MetricDataPoint[] = competitorMetrics.map(
      (m) => ({
        category: m.category,
        metricKey: m.metricKey,
        metricLabel: m.metricLabel,
        value: m.value,
        unit: m.unit || undefined,
      }),
    );

    // Validate we have sufficient data
    if (ownMetricsList.length === 0 && competitorMetricsList.length === 0) {
      throw ApiError.badRequest(
        "No metrics data available. Please add own metrics and competitor metrics before running analysis.",
      );
    }

    // 4. Create analysis record as PROCESSING
    const analysis = await prisma.competitorAnalysis.create({
      data: {
        tenantId,
        competitorId: id,
        status: "PROCESSING",
        ownMetricsSnapshot: ownMetricsList as any,
        competitorMetricsSnapshot: competitorMetricsList as any,
        triggeredById: req.user!.id,
      },
    });

    // 5. Send immediate response (analysis runs async-style but we wait)
    // For production, you could use a job queue. Here we await inline for simplicity.

    try {
      // 6. Build prompt and call Gemini
      const prompt = buildAnalysisPrompt({
        competitorName: competitor.candidateName,
        competitorParty: competitor.partyName,
        constituency: competitor.constituency || undefined,
        designation: competitor.designation || undefined,
        notes: competitor.notes || undefined,
        ownMetrics: ownMetricsList,
        competitorMetrics: competitorMetricsList,
        period: formatPeriodDisplay(targetPeriod),
      });

      logger.info(
        `Triggering AI analysis for competitor "${competitor.candidateName}" — period ${targetPeriod}`,
      );

      const rawAiResult = await generateJSON<any>(prompt);
      const aiResult = analysisResultSchema.parse(rawAiResult);

      // 7. Save analysis result
      const completedAnalysis = await prisma.competitorAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "COMPLETED",
          executiveSummary: aiResult.executiveSummary || null,
          metricComparisons: aiResult.metricComparisons as any,
          strengths: aiResult.strengths as any,
          weaknesses: aiResult.weaknesses as any,
          opportunities: aiResult.opportunities as any,
          threats: aiResult.threats as any,
          recommendations: aiResult.recommendations as any,
          overallScore: aiResult.overallScore || null,
          areasLeading: aiResult.areasLeading || 0,
          areasTrailing: aiResult.areasTrailing || 0,
          areasTied: aiResult.areasTied || 0,
          completedAt: new Date(),
        },
      });

      await createAuditLog({
        userId: req.user!.id,
        tenantId,
        action: "CREATE",
        module: "competitor_analysis",
        recordId: analysis.id,
        description: `AI analysis completed for "${competitor.candidateName}" — Score: ${aiResult.overallScore}/100`,
        newData: {
          competitorName: competitor.candidateName,
          overallScore: aiResult.overallScore,
          period: targetPeriod,
        },
        ...getRequestMeta(req),
      });

      res.status(201).json({
        success: true,
        message: `AI analysis completed for "${competitor.candidateName}"`,
        data: completedAnalysis,
      });
    } catch (aiError: any) {
      // Mark analysis as failed
      await prisma.competitorAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "FAILED",
          errorMessage: aiError.message,
        },
      });

      logger.error(`AI analysis failed: ${aiError.message}`);

      throw ApiError.internal(
        `AI analysis failed: ${aiError.message}. The analysis has been saved as FAILED.`,
      );
    }
  } catch (error) {
    next(error);
  }
}

/**
 * GET /competitors/:id/analyses — List past analyses
 */
export async function listAnalyses(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { page = "1", limit = "10" } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));

    const competitor = await prisma.competitor.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!competitor) throw ApiError.notFound("Competitor not found");

    const [analyses, total] = await Promise.all([
      prisma.competitorAnalysis.findMany({
        where: { competitorId: id },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          status: true,
          executiveSummary: true,
          overallScore: true,
          areasLeading: true,
          areasTrailing: true,
          areasTied: true,
          errorMessage: true,
          completedAt: true,
          createdAt: true,
          _count: { select: { chatMessages: true } },
        },
      }),
      prisma.competitorAnalysis.count({ where: { competitorId: id } }),
    ]);

    res.json({
      success: true,
      data: analyses,
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
 * GET /competitors/:id/analyses/:analysisId — Get full analysis
 */
export async function getAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const analysisId = req.params.analysisId as string;

    const analysis = await prisma.competitorAnalysis.findFirst({
      where: { id: analysisId, competitorId: id, competitor: { tenantId } },
      include: {
        competitor: {
          select: {
            candidateName: true,
            partyName: true,
            constituency: true,
            candidatePhoto: true,
          },
        },
        chatMessages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!analysis) throw ApiError.notFound("Analysis not found");

    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /competitors/:id/analyses/:analysisId/chat — Send follow-up question
 */
export async function sendChatMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const analysisId = req.params.analysisId as string;
    const { message } = req.body;

    // 1. Validate analysis exists and is completed
    const analysis = await prisma.competitorAnalysis.findFirst({
      where: {
        id: analysisId,
        competitorId: id,
        status: "COMPLETED",
        competitor: { tenantId },
      },
      include: {
        competitor: {
          select: { candidateName: true, partyName: true },
        },
        chatMessages: {
          orderBy: { createdAt: "asc" },
          take: 20, // Last 20 messages for context
        },
      },
    });

    if (!analysis) {
      throw ApiError.notFound("Completed analysis not found");
    }

    // 2. Save user message
    await prisma.competitorChat.create({
      data: {
        tenantId,
        analysisId,
        role: "user",
        message,
        createdById: req.user!.id,
      },
    });

    // 3. Gather live database information
    const [tenant, wards, projects, grievanceStats, recentGrievances] =
      await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            name: true,
            constituencyName: true,
            state: true,
            district: true,
            representativeName: true,
            representativeTitle: true,
            partyName: true,
          },
        }),
        prisma.ward.findMany({
          where: { tenantId },
          select: {
            name: true,
            wardNumber: true,
          },
        }),
        prisma.project.findMany({
          where: { tenantId },
          select: {
            name: true,
            status: true,
            budgetSanctioned: true,
            budgetUsed: true,
          },
        }),
        prisma.grievance.groupBy({
          by: ["status"],
          where: { tenantId },
          _count: { id: true },
        }),
        prisma.grievance.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 15,
          select: {
            subject: true,
            status: true,
            category: true,
            priority: true,
          },
        }),
      ]);

    const databaseContext = `
## CURRENT TENANT & CONSTITUENCY DETAILS
- Tenant Name: ${tenant?.name || "N/A"}
- Constituency: ${tenant?.constituencyName || "N/A"} (State: ${tenant?.state || "N/A"}, District: ${tenant?.district || "N/A"})
- Representative: ${tenant?.representativeName || "N/A"} (${tenant?.representativeTitle || "N/A"})
- Party Name: ${tenant?.partyName || "N/A"}

## CONSTITUENCY WARDS IN DATABASE (${wards.length} Wards)
${wards.map((w) => `- Ward ${w.wardNumber}: ${w.name}`).join("\n")}

## DEVELOPMENT PROJECTS (${projects.length} Projects)
${projects.map((p) => `- Project: ${p.name} | Status: ${p.status} | Budget: ₹${p.budgetSanctioned} | Spent: ₹${p.budgetUsed || 0}`).join("\n")}

## GRIEVANCES SUMMARY
- Counts by Status: ${grievanceStats.map((g) => `${g.status}: ${g._count.id}`).join(", ") || "No grievances recorded."}
- Recent Grievances:
${recentGrievances.map((g) => `  * [${g.category}] ${g.subject} | Status: ${g.status} | Priority: ${g.priority}`).join("\n")}
`.trim();

    // 4. Build context from analysis
    const analysisContext = `
Competitor: ${analysis.competitor.candidateName} (${analysis.competitor.partyName})
Overall Score: ${analysis.overallScore}/100
Executive Summary: ${analysis.executiveSummary}
Areas Leading: ${analysis.areasLeading}, Trailing: ${analysis.areasTrailing}, Tied: ${analysis.areasTied}
Strengths: ${JSON.stringify(analysis.strengths)}
Weaknesses: ${JSON.stringify(analysis.weaknesses)}
Opportunities: ${JSON.stringify(analysis.opportunities)}
Threats: ${JSON.stringify(analysis.threats)}
Recommendations: ${JSON.stringify(analysis.recommendations)}
Metric Comparisons: ${JSON.stringify(analysis.metricComparisons)}
`.trim();

    // 5. Call DeepSeek for chat response (slice to last 6 messages for context)
    const chatHistory = analysis.chatMessages.slice(-6).map((m: any) => ({
      role: m.role as string,
      message: m.message as string,
    }));

    const chatPrompt = buildChatPrompt(
      analysisContext,
      databaseContext,
      chatHistory,
      message,
    );
    const aiResponse = await generateText(chatPrompt);

    // 5. Save AI response
    const assistantMsg = await prisma.competitorChat.create({
      data: {
        tenantId,
        analysisId,
        role: "assistant",
        message: aiResponse,
      },
    });

    res.json({
      success: true,
      data: {
        userMessage: message,
        assistantMessage: aiResponse,
        messageId: assistantMsg.id,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /competitors/:id/analyses/:analysisId/chat — Get chat history
 */
export async function getChatHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const analysisId = req.params.analysisId as string;

    const messages = await prisma.competitorChat.findMany({
      where: { analysisId, analysis: { competitor: { tenantId } } },
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
}
