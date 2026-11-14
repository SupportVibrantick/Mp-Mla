import { Router } from "express";
import { authorize } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import {
  createVolunteerSchema,
  updateVolunteerSchema,
  assignWardsSchema,
  volunteerVoterEntrySchema,
} from "../../../schemas/admin/volunteer/index.js";
import {
  listVolunteers,
  createVolunteer,
  getVolunteerStats,
  getVolunteer,
  getVolunteerVoters,
  updateVolunteer,
  assignVolunteerWards,
  revokeVolunteerWard,
  getVolunteerMeDashboard,
  getVolunteerMeWards,
  volunteerDirectRegisterVoter,
  getVolunteerMeVoters,
  getVolunteerMeActivity,
} from "./controllers.js";

const router = Router();

// ══════════════════════════════════════════════════════════
// VOLUNTEER SELF-SERVICE ENDPOINTS (/admin/volunteers/me/*)
// (Accessible by authenticated active user / WARD_VOLUNTEER)
// ══════════════════════════════════════════════════════════

router.get("/me/dashboard", getVolunteerMeDashboard);
router.get("/me/wards", getVolunteerMeWards);
router.get("/me/voters", getVolunteerMeVoters);
router.get("/me/activity", getVolunteerMeActivity);
router.post(
  "/me/voters",
  validate(volunteerVoterEntrySchema),
  volunteerDirectRegisterVoter
);

// ══════════════════════════════════════════════════════════
// ADMIN MANAGEMENT ENDPOINTS (/admin/volunteers/*)
// (Restricted to SYSTEM_ADMIN, MLA_MP, OFFICE_STAFF)
// ══════════════════════════════════════════════════════════

const adminOnly = authorize("SYSTEM_ADMIN", "MLA_MP", "OFFICE_STAFF");

router.get("/stats", adminOnly, getVolunteerStats);
router.get("/", adminOnly, listVolunteers);
router.post("/", adminOnly, validate(createVolunteerSchema), createVolunteer);
router.get("/:id", adminOnly, getVolunteer);
router.get("/:id/voters", adminOnly, getVolunteerVoters);
router.patch("/:id", adminOnly, validate(updateVolunteerSchema), updateVolunteer);
router.post(
  "/:id/wards",
  adminOnly,
  validate(assignWardsSchema),
  assignVolunteerWards
);
router.delete("/:id/wards/:wardId", adminOnly, revokeVolunteerWard);

export default router;
