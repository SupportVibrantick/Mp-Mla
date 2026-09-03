import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import {
  getDepartments,
  getDepartmentGrievances,
  getDepartmentSlas,
  getDepartmentStats,
  getDepartmentTasks,
  getDepartmentUsers,
  getSingleDepartmentStats,
  getSingleDepartment,
} from "./read.js";
import {
  createSchema,
  upsertDepartmentSlasSchema,
  updateSchema,
} from "../../../schemas/admin/departments/index.js";
import { createDepartment } from "./create.js";
import { updateDepartment, toggleDepartment, upsertDepartmentSlas } from "./update.js";
import { deleteDepartment, bulkDeleteDepartments } from "./delete.js";
import { bulkCreateDepartments } from "./bulk.js";
import { exportDepartments } from "./export.js";

const router = Router();

// read departments
router.get("/", requirePermission("departments", "read"), getDepartments);
router.get(
  "/stats",
  requirePermission("departments", "read"),
  getDepartmentStats,
);
router.get(
  "/export",
  requirePermission("departments", "read"),
  exportDepartments,
);
router.post(
  "/bulk",
  requirePermission("departments", "create"),
  bulkCreateDepartments,
);
router.post(
  "/bulk-delete",
  requirePermission("departments", "delete"),
  bulkDeleteDepartments,
);

router.get(
  "/:id",
  requirePermission("departments", "read"),
  getSingleDepartment,
);
router.get(
  "/:id/users",
  requirePermission("departments", "read"),
  getDepartmentUsers,
);
router.get(
  "/:id/grievances",
  requirePermission("departments", "read"),
  getDepartmentGrievances,
);
router.get(
  "/:id/tasks",
  requirePermission("departments", "read"),
  getDepartmentTasks,
);
router.get(
  "/:id/slas",
  requirePermission("departments", "read"),
  getDepartmentSlas,
);
router.get(
  "/:id/stats",
  requirePermission("departments", "read"),
  getSingleDepartmentStats,
);

// create departments

router.post(
  "/",
  requirePermission("departments", "create"),
  validate(createSchema),
  createDepartment,
);

// update departments
router.put(
  "/:id",
  requirePermission("departments", "update"),
  validate(updateSchema),
  updateDepartment,
);
router.patch(
  "/:id/toggle-active",
  requirePermission("departments", "update"),
  toggleDepartment,
);
router.put(
  "/:id/slas",
  requirePermission("departments", "update"),
  validate(upsertDepartmentSlasSchema),
  upsertDepartmentSlas,
);
router.delete(
  "/:id",
  requirePermission("departments", "delete"),
  deleteDepartment,
);

export default router;
