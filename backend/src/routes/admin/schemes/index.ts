import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { createScheme } from "./create.js";
import { listSchemes, getScheme, getStats } from "./read.js";
import { updateScheme } from "./update.js";
import { deleteScheme } from "./delete.js";
import {
  listApplications,
  createApplication,
  getApplication,
  updateApplication,
  updateApplicationStatus,
  assignApplication,
  updateApplicationFollowUp,
  createTaskFromApplication,
  createGrievanceFromApplication,
  uploadApplicationDocument,
  listApplicationDocuments,
  deleteApplicationDocument,
} from "./application.js";
import {
  createSchemeSchema,
  updateSchemeSchema,
  createApplicationSchema,
  updateApplicationSchema,
  schemeApplicationStatusSchema,
  schemeApplicationAssignSchema,
} from "../../../schemas/admin/scheme/index.js";

const router = Router();

// Schemes Global Stats
router.get("/stats", requirePermission("schemes", "read"), getStats);

// Schemes CRUD
router.get("/", requirePermission("schemes", "read"), listSchemes);
router.post("/", requirePermission("schemes", "create"), validate(createSchemeSchema), createScheme);
router.get("/:id", requirePermission("schemes", "read"), getScheme);
router.put("/:id", requirePermission("schemes", "update"), validate(updateSchemeSchema), updateScheme);
router.delete("/:id", requirePermission("schemes", "delete"), deleteScheme);
router.get("/:id/stats", requirePermission("schemes", "read"), getStats);

// Applications CRUD
router.get("/applications/all", requirePermission("scheme_applications", "read"), listApplications); // Use /applications/all or map carefully to avoid route conflict with /:id!
router.post("/applications", requirePermission("scheme_applications", "create"), validate(createApplicationSchema), createApplication);
router.get("/applications/:id", requirePermission("scheme_applications", "read"), getApplication);
router.put("/applications/:id", requirePermission("scheme_applications", "update"), validate(updateApplicationSchema), updateApplication);

// Application Actions
router.patch("/applications/:id/status", requirePermission("scheme_applications", "manage"), validate(schemeApplicationStatusSchema), updateApplicationStatus);
router.patch("/applications/:id/assign", requirePermission("scheme_applications", "manage"), validate(schemeApplicationAssignSchema), assignApplication);
router.patch("/applications/:id/follow-up", requirePermission("scheme_applications", "manage"), updateApplicationFollowUp);

router.post("/applications/:id/create-task", requirePermission("scheme_applications", "manage"), createTaskFromApplication);
router.post("/applications/:id/create-grievance", requirePermission("scheme_applications", "manage"), createGrievanceFromApplication);

// Documents
router.post("/applications/:id/documents", requirePermission("scheme_applications", "update"), uploadApplicationDocument);
router.get("/applications/:id/documents", requirePermission("scheme_applications", "read"), listApplicationDocuments);
router.delete("/applications/documents/:documentId", requirePermission("scheme_applications", "delete"), deleteApplicationDocument);

export default router;
