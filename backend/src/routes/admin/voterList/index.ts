import { Router, Request, Response, NextFunction } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { createUploader, getUploadPath } from "../../../lib/upload.js";
import {
  createVoterSchema,
  updateVoterSchema,
} from "../../../schemas/admin/voterList/index.js";

import { listVoters, getVoter, getVoterStats } from "./read.js";
import { createVoter } from "./create.js";
import { updateVoter, resetVoterPassword } from "./update.js";
import { deleteVoter, bulkDeleteVoters } from "./delete.js";
import { bulkUploadVoters, listBulkJobs, getBulkJob } from "./bulk.js";
import { exportVoters, downloadSampleExcel } from "./export.js";
import familyRouter from "./family.js";

const voterUploader = createUploader("voters");
const router = Router();

// ─── Upload Voter / Family Member Photo Endpoint ────────
router.post(
  "/upload-photo",
  requirePermission("voter_list", "update"),
  voterUploader.single("photo"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "Photo file is required." });
        return;
      }
      const photoUrl = getUploadPath(req.file.filename, "voters");
      res.json({ success: true, data: { photoUrl }, message: "Photo uploaded successfully." });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Family & Household Sub-router ───────────────────────
router.use("/", familyRouter);

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

// ─── Bulk Operations ─────────────────────────────────────
router.post(
  "/bulk",
  requirePermission("voter_list", "create"),
  bulkUploadVoters,
);

router.post(
  "/bulk-delete",
  requirePermission("voter_list", "delete"),
  bulkDeleteVoters,
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

router.post(
  "/:id/reset-password",
  requirePermission("voter_list", "update"),
  resetVoterPassword,
);

router.delete(
  "/:id",
  requirePermission("voter_list", "delete"),
  deleteVoter,
);

export default router;
