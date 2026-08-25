import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { createTask } from "./create.js";
import { listTasks, getTask, getStats } from "./read.js";
import { updateTask, changeStatus, assignTask } from "./update.js";
import { deleteTask } from "./delete.js";
import { bulkAssignTasks, bulkStatusUpdateTasks } from "./bulk.js";
import { exportTasks } from "./export.js";
import {
  createTaskSchema,
  updateTaskSchema,
  statusSchema,
  assignSchema,
  bulkAssignSchema,
  bulkStatusSchema,
} from "../../../schemas/admin/task/index.js";

const router = Router();

// Stats, export and bulk operations must be registered BEFORE parametrized :id routes!
router.get("/stats", requirePermission("tasks", "read"), getStats);
router.get("/export", requirePermission("tasks", "read"), exportTasks);
router.post(
  "/bulk-assign",
  requirePermission("tasks", "update"),
  validate(bulkAssignSchema),
  bulkAssignTasks
);
router.post(
  "/bulk-status",
  requirePermission("tasks", "update"),
  validate(bulkStatusSchema),
  bulkStatusUpdateTasks
);

router.get("/", requirePermission("tasks", "read"), listTasks);
router.get("/:id", requirePermission("tasks", "read"), getTask);
router.post("/", requirePermission("tasks", "create"), validate(createTaskSchema), createTask);
router.put("/:id", requirePermission("tasks", "update"), validate(updateTaskSchema), updateTask);
router.delete("/:id", requirePermission("tasks", "delete"), deleteTask);

router.patch(
  "/:id/status",
  requirePermission("tasks", "update"),
  validate(statusSchema),
  changeStatus
);
router.patch(
  "/:id/assign",
  requirePermission("tasks", "update"),
  validate(assignSchema),
  assignTask
);

export default router;
