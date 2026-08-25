import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import {
  createCorrespondence,
} from "./create.js";
import {
  listCorrespondence,
  getCorrespondence,
  getCorrespondenceTimeline,
} from "./read.js";
import {
  updateCorrespondence,
} from "./update.js";
import {
  deleteCorrespondence,
  restoreCorrespondence,
} from "./delete.js";
import {
  transitionStatus,
  logReply,
} from "./status.js";
import {
  assignCorrespondence,
} from "./assign.js";
import {
  attachDocument,
  listAttachedDocuments,
} from "./link.js";
import {
  createCorrespondenceTask,
} from "./task.js";
import {
  getCorrespondenceStats,
} from "./stats.js";
import {
  createCorrespondenceSchema,
  updateCorrespondenceSchema,
  assignCorrespondenceSchema,
  replyCorrespondenceSchema,
  linkDocumentCorrespondenceSchema,
  createTaskCorrespondenceSchema,
} from "../../../schemas/admin/correspondence/index.js";

const router = Router();

// Stats
router.get("/stats", requirePermission("correspondence", "read"), getCorrespondenceStats);

// Correspondence CRUD
router.get("/", requirePermission("correspondence", "read"), listCorrespondence);
router.post("/", requirePermission("correspondence", "create"), validate(createCorrespondenceSchema), createCorrespondence);
router.get("/:id", requirePermission("correspondence", "read"), getCorrespondence);
router.put("/:id", requirePermission("correspondence", "update"), validate(updateCorrespondenceSchema), updateCorrespondence);
router.delete("/:id", requirePermission("correspondence", "delete"), deleteCorrespondence);
router.post("/:id/restore", requirePermission("correspondence", "update"), restoreCorrespondence);

// Workflow status & assignment
router.patch("/:id/status", requirePermission("correspondence", "update"), transitionStatus);
router.patch("/:id/assign", requirePermission("correspondence", "update"), validate(assignCorrespondenceSchema), assignCorrespondence);
router.patch("/:id/reply", requirePermission("correspondence", "reply"), validate(replyCorrespondenceSchema), logReply);

// Timeline
router.get("/:id/timeline", requirePermission("correspondence", "read"), getCorrespondenceTimeline);

// Document attachment
router.get("/:id/documents", requirePermission("correspondence", "read"), listAttachedDocuments);
router.post("/:id/documents", requirePermission("correspondence", "create"), validate(linkDocumentCorrespondenceSchema), attachDocument);

// Task integration
router.post("/:id/create-task", requirePermission("correspondence", "create"), validate(createTaskCorrespondenceSchema), createCorrespondenceTask);

export default router;
