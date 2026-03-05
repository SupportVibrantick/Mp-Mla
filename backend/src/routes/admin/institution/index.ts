import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import {
  listInstitutions,
  getInstitution,
  getInstitutionStats,
} from "./read.js";
import { createInstitution } from "./create.js";
import { updateInstitution } from "./update.js";
import { deleteInstitution } from "./delete.js";
import {
  listIncharges,
  getIncharge,
  createIncharge,
  updateIncharge,
  deleteIncharge,
  toggleInchargeActive,
} from "./incharges.js";
import {
  createInstitutionSchema,
  updateInstitutionSchema,
  createInchargeSchema,
  updateInchargeSchema,
} from "@/schemas/admin/institution/index.js";

const router = Router();

// ─── Institution CRUD ───────────────────────────────────
router.get("/", requirePermission("institutions", "read"), listInstitutions);
router.get(
  "/stats",
  requirePermission("institutions", "read"),
  getInstitutionStats,
);
router.get("/:id", requirePermission("institutions", "read"), getInstitution);
router.post(
  "/",
  requirePermission("institutions", "create"),
  validate(createInstitutionSchema),
  createInstitution,
);
router.put(
  "/:id",
  requirePermission("institutions", "update"),
  validate(updateInstitutionSchema),
  updateInstitution,
);
router.delete(
  "/:id",
  requirePermission("institutions", "delete"),
  deleteInstitution,
);

// ─── Incharges (nested under institution) ───────────────
router.get(
  "/:institutionId/incharges",
  requirePermission("institutions", "read"),
  listIncharges,
);
router.get(
  "/:institutionId/incharges/:inchargeId",
  requirePermission("institutions", "read"),
  getIncharge,
);
router.post(
  "/:institutionId/incharges",
  requirePermission("institutions", "create"),
  validate(createInchargeSchema),
  createIncharge,
);
router.put(
  "/:institutionId/incharges/:inchargeId",
  requirePermission("institutions", "update"),
  validate(updateInchargeSchema),
  updateIncharge,
);
router.delete(
  "/:institutionId/incharges/:inchargeId",
  requirePermission("institutions", "delete"),
  deleteIncharge,
);
router.patch(
  "/:institutionId/incharges/:inchargeId/toggle-active",
  requirePermission("institutions", "update"),
  toggleInchargeActive,
);

export default router;
