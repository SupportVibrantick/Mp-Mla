import {
  createSchemeSchema,
  updateSchemeSchema,
  bulkBeneficiarySchema,
  beneficiarySchema,
} from "./../../../schemas/admin/scheme/index";
import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";

import { createScheme } from "./create.js";
import {
  updateScheme,
  updateBeneficiary,
  bulkUpdateBeneficiary,
} from "./update";
import { getScheme, getSchemeStats, getSingleScheme } from "./read";
import { deleteBeneficiary, deleteScheme } from "./delete";

const router = Router();

// ─── LIST & GET ─────────────────────────────────────────
router.get("/", requirePermission("schemes", "read"), getScheme);
router.get("/stats", requirePermission("schemes", "read"), getSchemeStats);
router.get("/:id", requirePermission("schemes", "read"), getSingleScheme);

// ─── CREATE (Admin creates Scheme here)
router.post(
  "/",
  requirePermission("schemes", "create"),
  validate(createSchemeSchema),
  createScheme,
);

// ─── UPDATE ─────────────────────────────────────────────
router.put(
  "/:id",
  requirePermission("schemes", "update"),
  validate(updateSchemeSchema),
  updateScheme,
);
// ─── BENEFICIARIES ────────────────

router.post(
  "/:id/beneficiaries",
  requirePermission("schemes", "update"),
  validate(beneficiarySchema),
  updateBeneficiary,
);
router.post(
  "/:id/beneficiaries/bulk",
  requirePermission("schemes", "update"),
  validate(bulkBeneficiarySchema),
  bulkUpdateBeneficiary,
);

// ─── DELETE (Soft delete → INACTIVE) ────────────────────
router.delete("/:id", requirePermission("schemes", "delete"), deleteScheme);
router.delete(
  "/:id/beneficiaries/:beneficiaryId",
  requirePermission("schemes", "delete"),
  deleteBeneficiary,
);

export default router;
