import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import {
  getDepartments,
  getDepartmentStats,
  getSingleDepartment,
} from "./read.js";
import {
  createSchema,
  updateSchema,
} from "../../../schemas/admin/departments/index.js";
import { createDepartment } from "./create.js";
import { updateDepartment, toggleDepartment } from "./update.js";
import { deleteDepartment } from "./delete.js";

const router = Router();

// read departments
router.get("/", requirePermission("departments", "read"), getDepartments);
router.get(
  "/stats",
  requirePermission("departments", "read"),
  getDepartmentStats,
);

router.get(
  "/:id",
  requirePermission("departments", "read"),
  getSingleDepartment,
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
router.delete(
  "/:id",
  requirePermission("departments", "delete"),
  deleteDepartment,
);

export default router;
