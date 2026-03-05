import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { listProjects, getProject, getProjectStats } from "./read.js";
import { createProject } from "./create.js";
import { updateProject, updateStatus } from "./update.js";
import { deleteProject } from "./delete.js";
import {
  addMilestone,
  updateMilestone,
  deleteMilestone,
  toggleMilestone,
} from "./milestones.js";
import { addUpdate } from "./updates.js";
import {
  createProjectSchema,
  updateProjectSchema,
  statusSchema,
  updateEntrySchema,
  milestoneSchema,
} from "@/schemas/admin/project/index.js";

const router = Router();

router.get("/", requirePermission("projects", "read"), listProjects);
router.get("/stats", requirePermission("projects", "read"), getProjectStats);
router.get("/:id", requirePermission("projects", "read"), getProject);
router.post(
  "/",
  requirePermission("projects", "create"),
  validate(createProjectSchema),
  createProject,
);
router.put(
  "/:id",
  requirePermission("projects", "update"),
  validate(updateProjectSchema),
  updateProject,
);
router.delete("/:id", requirePermission("projects", "delete"), deleteProject);
router.patch(
  "/:id/status",
  requirePermission("projects", "update"),
  validate(statusSchema),
  updateStatus,
);

// Milestones
router.post(
  "/:id/milestones",
  requirePermission("projects", "update"),
  validate(milestoneSchema),
  addMilestone,
);
router.put(
  "/:id/milestones/:msId",
  requirePermission("projects", "update"),
  updateMilestone,
);
router.delete(
  "/:id/milestones/:msId",
  requirePermission("projects", "update"),
  deleteMilestone,
);
router.patch(
  "/:id/milestones/:msId/toggle",
  requirePermission("projects", "update"),
  toggleMilestone,
);

// Updates
router.post(
  "/:id/updates",
  requirePermission("projects", "update"),
  validate(updateEntrySchema),
  addUpdate,
);

export default router;
