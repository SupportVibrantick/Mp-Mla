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
import { bulkCreateInstitutions } from "./bulk.js";
import { exportInstitutions } from "./exports.js";
import {
  listIncharges,
  getIncharge,
  createIncharge,
  updateIncharge,
  deleteIncharge,
  toggleInchargeActive,
} from "./incharges.js";
import {
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
} from "./requests.js";
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
router.get(
  "/export",
  requirePermission("institutions", "read"),
  exportInstitutions,
);
router.post(
  "/",
  requirePermission("institutions", "create"),
  validate(createInstitutionSchema),
  createInstitution,
);
router.post(
  "/bulk",
  requirePermission("institutions", "create"),
  bulkCreateInstitutions,
);

// ─── Registration Requests (admin review) ───────────────
// NOTE: These MUST come BEFORE /:id routes to avoid matching "requests" as :id
router.get(
  "/requests",
  requirePermission("institutions", "read"),
  listRequests,
);
router.get(
  "/requests/:requestId",
  requirePermission("institutions", "read"),
  getRequest,
);
router.patch(
  "/requests/:requestId/approve",
  requirePermission("institutions", "update"),
  approveRequest,
);
router.patch(
  "/requests/:requestId/reject",
  requirePermission("institutions", "update"),
  rejectRequest,
);

// ─── Single institution (must come AFTER /requests) ─────
router.get("/:id", requirePermission("institutions", "read"), getInstitution);
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
