// import { Router } from "express";
// import { create } from "./create.js";
// import { readAll, readOne } from "./read.js";
// import { update } from "./update.js";
// import { remove } from "./delete.js";
// import { authenticate, authorize } from "../../../middleware/auth.js";
// import { validate } from "../../../middleware/validate.js";
// import { auditLog } from "../../../middleware/auditLog.js";
// import { createUserSchema, updateUserSchema } from "../../../schemas/admin/user/index.js";

// const router = Router();

// // All user routes require SYSTEM_ADMIN role
// router.use(authenticate, authorize("SYSTEM_ADMIN"));

// router.get("/", readAll);
// router.get("/:id", readOne);
// router.post("/", validate(createUserSchema), auditLog("user", "CREATE"), create);
// router.patch("/:id", validate(updateUserSchema), auditLog("user", "UPDATE"), update);
// router.delete("/:id", auditLog("user", "DELETE"), remove);

// export default router;

import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { listUsers, getUser } from "./read.js";
import { createUser, createUserSchema } from "./create.js";
import { updateUser, updateUserSchema } from "./update.js";
import { deleteUser } from "./delete.js";
import {
  getUserPermissions,
  updateUserPermissions,
  updatePermissionsSchema,
} from "./permissions.js";

const router = Router();

// ─── LIST & GET ─────────────────────────────────────────
router.get("/", requirePermission("users", "read"), listUsers);
router.get("/:id", requirePermission("users", "read"), getUser);

// ─── CREATE (Admin creates MLA/Staff accounts here) ─────
router.post(
  "/",
  requirePermission("users", "create"),
  validate(createUserSchema),
  createUser,
);

// ─── UPDATE ─────────────────────────────────────────────
router.put(
  "/:id",
  requirePermission("users", "update"),
  validate(updateUserSchema),
  updateUser,
);

// ─── DELETE (Soft delete → INACTIVE) ────────────────────
router.delete("/:id", requirePermission("users", "delete"), deleteUser);

// ─── PERMISSIONS ────────────────────────────────────────
router.get(
  "/:id/permissions",
  requirePermission("users", "read"),
  getUserPermissions,
);
router.put(
  "/:id/permissions",
  requirePermission("users", "update"),
  validate(updatePermissionsSchema),
  updateUserPermissions,
);

export default router;
