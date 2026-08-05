import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import {
  createVoterSchema,
  updateVoterSchema,
} from "../../../schemas/admin/voterList/index.js";

import { listVoters, getVoter, getVoterStats } from "./read.js";
import { createVoter } from "./create.js";
import { updateVoter } from "./update.js";
import { deleteVoter } from "./delete.js";
import { bulkUploadVoters, listBulkJobs, getBulkJob } from "./bulk.js";
import { exportVoters, downloadSampleExcel } from "./export.js";

const router = Router();

// ─── Sample Template Download (Excel with Dropdowns) ─────
router.get(
  "/sample",
  requirePermission("voter_list", "read"),
  downloadSampleExcel,
);

router.get(
  "/sample/excel",
  requirePermission("voter_list", "read"),
  downloadSampleExcel,
);

router.get(
  "/bulk/sample",
  requirePermission("voter_list", "read"),
  downloadSampleExcel,
);

router.get(
  "/bulk/sample/excel",
  requirePermission("voter_list", "read"),
  downloadSampleExcel,
);

// ─── Stats & Export (must come BEFORE /:id) ─────────────
router.get(
  "/stats",
  requirePermission("voter_list", "read"),
  getVoterStats,
);

router.get(
  "/export",
  requirePermission("voter_list", "export"),
  exportVoters,
);

// ─── Bulk Upload ─────────────────────────────────────────
router.post(
  "/bulk",
  requirePermission("voter_list", "create"),
  bulkUploadVoters,
);

// ─── Bulk Upload Job Tracking ────────────────────────────
router.get(
  "/bulk/jobs",
  requirePermission("voter_list", "read"),
  listBulkJobs,
);

router.get(
  "/bulk/jobs/:jobId",
  requirePermission("voter_list", "read"),
  getBulkJob,
);

// ─── CRUD ────────────────────────────────────────────────
router.get(
  "/",
  requirePermission("voter_list", "read"),
  listVoters,
);

router.post(
  "/",
  requirePermission("voter_list", "create"),
  validate(createVoterSchema),
  createVoter,
);

router.get(
  "/:id",
  requirePermission("voter_list", "read"),
  getVoter,
);

router.put(
  "/:id",
  requirePermission("voter_list", "update"),
  validate(updateVoterSchema),
  updateVoter,
);

router.delete(
  "/:id",
  requirePermission("voter_list", "delete"),
  deleteVoter,
);

export default router;
