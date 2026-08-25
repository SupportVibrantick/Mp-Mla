import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { createAppointment } from "./create.js";
import { listAppointments, getAppointment, getCalendar, getStats } from "./read.js";
import { updateAppointment } from "./update.js";
import { deleteAppointment } from "./delete.js";
import {
  approveAppointment,
  rejectAppointment,
  rescheduleAppointment,
  completeAppointment,
  cancelAppointment,
} from "./workflow.js";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  approveAppointmentSchema,
  rejectAppointmentSchema,
  rescheduleAppointmentSchema,
  completeAppointmentSchema,
  cancelAppointmentSchema,
} from "../../../schemas/admin/appointment/index.js";

const router = Router();

// Stats and Calendar registered BEFORE parameterized :id routes
router.get("/stats", requirePermission("appointments", "read"), getStats);
router.get("/calendar", requirePermission("appointments", "read"), getCalendar);

// CRUD
router.get("/", requirePermission("appointments", "read"), listAppointments);
router.get("/:id", requirePermission("appointments", "read"), getAppointment);
router.post("/", requirePermission("appointments", "create"), validate(createAppointmentSchema), createAppointment);
router.put("/:id", requirePermission("appointments", "update"), validate(updateAppointmentSchema), updateAppointment);
router.delete("/:id", requirePermission("appointments", "delete"), deleteAppointment);

// Status Workflow Transitions
router.patch("/:id/approve", requirePermission("appointments", "approve"), validate(approveAppointmentSchema), approveAppointment);
router.patch("/:id/reject", requirePermission("appointments", "reject"), validate(rejectAppointmentSchema), rejectAppointment);
router.patch("/:id/reschedule", requirePermission("appointments", "reschedule"), validate(rescheduleAppointmentSchema), rescheduleAppointment);
router.patch("/:id/complete", requirePermission("appointments", "complete"), validate(completeAppointmentSchema), completeAppointment);
router.patch("/:id/cancel", requirePermission("appointments", "update"), validate(cancelAppointmentSchema), cancelAppointment);

export default router;
