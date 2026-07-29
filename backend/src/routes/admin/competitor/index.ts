import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";

// Competitor CRUD
import { listCompetitors, getCompetitor, getCompetitorStats } from "./read.js";
import { createCompetitor } from "./create.js";
import { updateCompetitor } from "./update.js";
import { deleteCompetitor } from "./delete.js";

// Competitor Metrics
import {
  listCompetitorMetrics,
  submitCompetitorMetrics,
  deleteCompetitorMetric,
} from "./metrics.js";

// Own Metrics
import {
  getOwnMetrics,
  submitOwnMetrics,
  getAutoMetrics,
} from "./ownMetrics.js";

// AI Analysis & Chat
import {
  triggerAnalysis,
  listAnalyses,
  getAnalysis,
  sendChatMessage,
  getChatHistory,
} from "./analysis.js";

// Dashboard
import { getDashboard } from "./dashboard.js";

// Schemas
import {
  createCompetitorSchema,
  updateCompetitorSchema,
  submitMetricsSchema,
  submitOwnMetricsSchema,
  triggerAnalysisSchema,
  chatMessageSchema,
} from "@/schemas/admin/competitor/index.js";

const router = Router();

// ═══════════════════════════════════════════════════
// DASHBOARD & OWN METRICS (no :id param)
// ═══════════════════════════════════════════════════

router.get(
  "/dashboard",
  requirePermission("competitors", "read"),
  getDashboard,
);

router.get(
  "/own-metrics",
  requirePermission("competitors", "read"),
  getOwnMetrics,
);

router.get(
  "/own-metrics/auto",
  requirePermission("competitors", "read"),
  getAutoMetrics,
);

router.post(
  "/own-metrics",
  requirePermission("competitors", "create"),
  validate(submitOwnMetricsSchema),
  submitOwnMetrics,
);

// ═══════════════════════════════════════════════════
// COMPETITOR CRUD
// ═══════════════════════════════════════════════════

router.get(
  "/stats",
  requirePermission("competitors", "read"),
  getCompetitorStats,
);

router.get("/", requirePermission("competitors", "read"), listCompetitors);

router.get("/:id", requirePermission("competitors", "read"), getCompetitor);

router.post(
  "/",
  requirePermission("competitors", "create"),
  validate(createCompetitorSchema),
  createCompetitor,
);

router.put(
  "/:id",
  requirePermission("competitors", "update"),
  validate(updateCompetitorSchema),
  updateCompetitor,
);

router.delete(
  "/:id",
  requirePermission("competitors", "delete"),
  deleteCompetitor,
);

// ═══════════════════════════════════════════════════
// COMPETITOR METRICS
// ═══════════════════════════════════════════════════

router.get(
  "/:id/metrics",
  requirePermission("competitors", "read"),
  listCompetitorMetrics,
);

router.post(
  "/:id/metrics",
  requirePermission("competitors", "create"),
  validate(submitMetricsSchema),
  submitCompetitorMetrics,
);

router.delete(
  "/:id/metrics/:metricId",
  requirePermission("competitors", "delete"),
  deleteCompetitorMetric,
);

// ═══════════════════════════════════════════════════
// AI ANALYSIS
// ═══════════════════════════════════════════════════

router.post(
  "/:id/analyze",
  requirePermission("competitors", "create"),
  validate(triggerAnalysisSchema),
  triggerAnalysis,
);

router.get(
  "/:id/analyses",
  requirePermission("competitors", "read"),
  listAnalyses,
);

router.get(
  "/:id/analyses/:analysisId",
  requirePermission("competitors", "read"),
  getAnalysis,
);

// ═══════════════════════════════════════════════════
// AI CHAT (Follow-up)
// ═══════════════════════════════════════════════════

router.post(
  "/:id/analyses/:analysisId/chat",
  requirePermission("competitors", "create"),
  validate(chatMessageSchema),
  sendChatMessage,
);

router.get(
  "/:id/analyses/:analysisId/chat",
  requirePermission("competitors", "read"),
  getChatHistory,
);

export default router;
