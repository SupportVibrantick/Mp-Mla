import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import {
  createDocument,
} from "./create.js";
import {
  listDocuments,
  getDocument,
  downloadDocument,
} from "./read.js";
import {
  updateDocument,
} from "./update.js";
import {
  deleteDocument,
  restoreDocument,
} from "./delete.js";
import {
  uploadNewVersion,
  listDocumentVersions,
} from "./version.js";
import {
  linkDocument,
  unlinkDocument,
} from "./link.js";
import {
  getDocumentStats,
} from "./stats.js";
import {
  createDocumentSchema,
  updateDocumentSchema,
  uploadVersionSchema,
  linkDocumentSchema,
} from "../../../schemas/admin/document/index.js";

const router = Router();

// Stats
router.get("/stats", requirePermission("documents", "read"), getDocumentStats);

// Document CRUD
router.get("/", requirePermission("documents", "read"), listDocuments);
router.post("/", requirePermission("documents", "create"), validate(createDocumentSchema), createDocument);
router.get("/:id", requirePermission("documents", "read"), getDocument);
router.put("/:id", requirePermission("documents", "update"), validate(updateDocumentSchema), updateDocument);
router.delete("/:id", requirePermission("documents", "delete"), deleteDocument);
router.post("/:id/restore", requirePermission("documents", "update"), restoreDocument);

// Secure Download
router.get("/:id/download", requirePermission("documents", "download"), downloadDocument);

// Version history
router.get("/:id/versions", requirePermission("documents", "read"), listDocumentVersions);
router.post("/:id/versions", requirePermission("documents", "create"), validate(uploadVersionSchema), uploadNewVersion);

// Document Linking
router.post("/:id/link", requirePermission("documents", "create"), validate(linkDocumentSchema), linkDocument);
router.delete("/:id/link/:linkId", requirePermission("documents", "delete"), unlinkDocument);

export default router;
