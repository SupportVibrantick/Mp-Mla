import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import {
  createContact,
  listContacts,
  getContact,
  updateContact,
  deleteContact,
} from "./contacts.js";
import {
  createInteraction,
  listInteractions,
  getContactTimeline,
} from "./interactions.js";
import {
  createFollowUp,
  listFollowUps,
  updateFollowUp,
  transitionFollowUpStatus,
} from "./followups.js";
import {
  createContactSchema,
  updateContactSchema,
  createInteractionSchema,
  createFollowUpSchema,
  updateFollowUpSchema,
} from "../../../schemas/admin/crm/index.js";

const router = Router();

// Contacts CRUD
router.get("/contacts", requirePermission("crm", "read"), listContacts);
router.post("/contacts", requirePermission("crm", "create"), validate(createContactSchema), createContact);
router.get("/contacts/:id", requirePermission("crm", "read"), getContact);
router.put("/contacts/:id", requirePermission("crm", "update"), validate(updateContactSchema), updateContact);
router.delete("/contacts/:id", requirePermission("crm", "delete"), deleteContact);

// Aggregated chronological timeline
router.get("/contacts/:id/timeline", requirePermission("crm", "read"), getContactTimeline);

// Interactions
router.get("/contacts/:id/interactions", requirePermission("crm", "read"), listInteractions);
router.post("/contacts/:id/interactions", requirePermission("crm", "create"), validate(createInteractionSchema), createInteraction);

// Follow-ups
router.get("/contacts/:id/followups", requirePermission("crm", "read"), listFollowUps);
router.post("/contacts/:id/followups", requirePermission("crm", "create"), validate(createFollowUpSchema), createFollowUp);
router.put("/followups/:followUpId", requirePermission("crm", "update"), validate(updateFollowUpSchema), updateFollowUp);
router.patch("/followups/:followUpId/status", requirePermission("crm", "update"), transitionFollowUpStatus);

export default router;
