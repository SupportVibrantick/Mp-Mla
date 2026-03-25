import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import {
  listGrievances,
  getGrievance,
  getGrievanceStats,
  getGrievanceAnalytics,
} from "./read.js";
import { createGrievance } from "./create.js";
import { updateGrievance, changeStatus, assignGrievance } from "./update.js";
import { deleteGrievance } from "./delete.js";
import { addTimelineEntry } from "./timeline.js";
import { exportGrievances } from "./export.js";
import { bulkCreateGrievances } from "./bulk.js";

import {
  createGrievanceSchema,
  updateGrievanceSchema,
  timelineSchema,
  changeStatusSchema,
  assignSchema,
} from "@/schemas/admin/grievance/index.js";

const router = Router();

router.get("/", requirePermission("grievances", "read"), listGrievances);
router.get(
  "/stats",
  requirePermission("grievances", "read"),
  getGrievanceStats,
);
router.get(
  "/analytics",
  requirePermission("grievances", "read"),
  getGrievanceAnalytics,
);
router.get(
  "/export",
  requirePermission("grievances", "read"),
  exportGrievances,
);
router.post(
  "/bulk",
  requirePermission("grievances", "create"),
  bulkCreateGrievances,
);

router.get("/:id", requirePermission("grievances", "read"), getGrievance);
router.post(
  "/",
  requirePermission("grievances", "create"),
  validate(createGrievanceSchema),
  createGrievance,
);
router.put(
  "/:id",
  requirePermission("grievances", "update"),
  validate(updateGrievanceSchema),
  updateGrievance,
);
router.delete(
  "/:id",
  requirePermission("grievances", "delete"),
  deleteGrievance,
);
router.patch(
  "/:id/status",
  requirePermission("grievances", "update"),
  validate(changeStatusSchema),
  changeStatus,
);
router.patch(
  "/:id/assign",
  requirePermission("grievances", "update"),
  validate(assignSchema),
  assignGrievance,
);
router.post(
  "/:id/timeline",
  requirePermission("grievances", "update"),
  validate(timelineSchema),
  addTimelineEntry,
);

export default router;
