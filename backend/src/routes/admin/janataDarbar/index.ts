import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { createSession } from "./create.js";
import { listSessions, getSession, getSessionStats } from "./read.js";
import { updateSession, transitionSessionStatus } from "./update.js";
import { deleteSession } from "./delete.js";
import {
  registerVisitorToken,
  callToken,
  startToken,
  resolveToken,
  referToken,
  markTokenAbsent,
  getSessionQueue,
} from "./tokens.js";
import {
  createGrievanceFromToken,
  createTaskFromToken,
} from "./actions.js";
import {
  createSessionSchema,
  updateSessionSchema,
  createTokenSchema,
  referTokenSchema,
} from "../../../schemas/admin/janataDarbar/index.js";

const router = Router();

// Sessions CRUD
router.get("/", requirePermission("janata_darbar", "read"), listSessions);
router.get("/:id", requirePermission("janata_darbar", "read"), getSession);
router.post("/", requirePermission("janata_darbar", "create"), validate(createSessionSchema), createSession);
router.put("/:id", requirePermission("janata_darbar", "update"), validate(updateSessionSchema), updateSession);
router.delete("/:id", requirePermission("janata_darbar", "delete"), deleteSession);
router.patch("/:id/status", requirePermission("janata_darbar", "update"), transitionSessionStatus);

// Queue and Visitor Tokens
router.get("/:id/queue", requirePermission("janata_darbar", "read"), getSessionQueue);
router.post("/:id/tokens", requirePermission("janata_darbar", "create"), validate(createTokenSchema), registerVisitorToken);
router.patch("/:id/tokens/:tokenId/call", requirePermission("janata_darbar", "update"), callToken);
router.patch("/:id/tokens/:tokenId/start", requirePermission("janata_darbar", "update"), startToken);
router.patch("/:id/tokens/:tokenId/resolve", requirePermission("janata_darbar", "update"), resolveToken);
router.patch("/:id/tokens/:tokenId/refer", requirePermission("janata_darbar", "update"), validate(referTokenSchema), referToken);
router.patch("/:id/tokens/:tokenId/absent", requirePermission("janata_darbar", "update"), markTokenAbsent);

// Direct Actions integrations
router.post("/:id/tokens/:tokenId/grievance", requirePermission("janata_darbar", "update"), createGrievanceFromToken);
router.post("/:id/tokens/:tokenId/task", requirePermission("janata_darbar", "update"), createTaskFromToken);

// Session report stats
router.get("/:id/stats", requirePermission("janata_darbar", "read"), getSessionStats);

export default router;
