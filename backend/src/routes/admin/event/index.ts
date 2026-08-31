import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { createEvent } from "./create.js";
import { listEvents, getEvent, getStats, getCalendar } from "./read.js";
import { updateEvent, changeStatus } from "./update.js";
import { deleteEvent } from "./delete.js";
import { getTeam, addTeamMember, removeTeamMember } from "./team.js";
import { getAgenda, createAgendaItem, updateAgendaItem, deleteAgendaItem } from "./agenda.js";
import { getGuests, createGuest, updateGuest, deleteGuest } from "./guests.js";
import { getAttendanceList, recordAttendance, checkIn, checkOut } from "./attendance.js";
import { getMedia, addMedia, deleteMedia } from "./media.js";
import { getReport, upsertReport } from "./report.js";
import { getEventTasks, createEventTask } from "./tasks.js";
import { getTimeline } from "./timeline.js";
import { exportEvents } from "./export.js";
import {
  createEventSchema,
  updateEventSchema,
  eventStatusSchema,
  eventTeamSchema,
  eventAgendaSchema,
  eventGuestSchema,
  eventAttendanceSchema,
  eventMediaSchema,
  eventReportSchema,
} from "../../../schemas/admin/event/index.js";

import { createUploader, enforceStorageAndTrack } from "../../../lib/upload.js";

const eventMediaUploader = createUploader("documents");

const router = Router();

// Stats, calendar, export routes registered BEFORE parameterized :id routes
router.get("/stats", requirePermission("events", "read"), getStats);
router.get("/calendar", requirePermission("events", "read"), getCalendar);
router.get("/export", requirePermission("events", "read"), exportEvents);

// CRUD
router.get("/", requirePermission("events", "read"), listEvents);
router.get("/:id", requirePermission("events", "read"), getEvent);
router.post("/", requirePermission("events", "create"), validate(createEventSchema), createEvent);
router.put("/:id", requirePermission("events", "update"), validate(updateEventSchema), updateEvent);
router.delete("/:id", requirePermission("events", "delete"), deleteEvent);
router.patch("/:id/status", requirePermission("events", "update"), validate(eventStatusSchema), changeStatus);

// Team sub-routes
router.get("/:id/team", requirePermission("events", "manage_team"), getTeam);
router.post("/:id/team", requirePermission("events", "manage_team"), validate(eventTeamSchema), addTeamMember);
router.delete("/:id/team/:userId", requirePermission("events", "manage_team"), removeTeamMember);

// Agenda sub-routes
router.get("/:id/agenda", requirePermission("events", "read"), getAgenda);
router.post("/:id/agenda", requirePermission("events", "update"), validate(eventAgendaSchema), createAgendaItem);
router.put("/:id/agenda/:agendaId", requirePermission("events", "update"), validate(eventAgendaSchema), updateAgendaItem);
router.delete("/:id/agenda/:agendaId", requirePermission("events", "update"), deleteAgendaItem);

// Guest sub-routes
router.get("/:id/guests", requirePermission("events", "manage_guests"), getGuests);
router.post("/:id/guests", requirePermission("events", "manage_guests"), validate(eventGuestSchema), createGuest);
router.put("/:id/guests/:guestId", requirePermission("events", "manage_guests"), validate(eventGuestSchema), updateGuest);
router.delete("/:id/guests/:guestId", requirePermission("events", "manage_guests"), deleteGuest);

// Attendance sub-routes
router.get("/:id/attendance", requirePermission("events", "manage_attendance"), getAttendanceList);
router.post("/:id/attendance", requirePermission("events", "manage_attendance"), validate(eventAttendanceSchema), recordAttendance);
router.post("/:id/attendance/:attendanceId/check-in", requirePermission("events", "manage_attendance"), checkIn);
router.post("/:id/attendance/:attendanceId/check-out", requirePermission("events", "manage_attendance"), checkOut);

// Media sub-routes
router.get("/:id/media", requirePermission("events", "manage_media"), getMedia);
router.post(
  "/:id/media",
  requirePermission("events", "manage_media"),
  eventMediaUploader.single("file"),
  enforceStorageAndTrack,
  validate(eventMediaSchema),
  addMedia
);
router.delete("/:id/media/:mediaId", requirePermission("events", "manage_media"), deleteMedia);

// Report sub-routes
router.get("/:id/report", requirePermission("events", "manage_report"), getReport);
router.post("/:id/report", requirePermission("events", "manage_report"), validate(eventReportSchema), upsertReport);

// Tasks sub-routes
router.get("/:id/tasks", requirePermission("events", "manage_tasks"), getEventTasks);
router.post("/:id/tasks", requirePermission("events", "manage_tasks"), createEventTask);

// Timeline sub-route
router.get("/:id/timeline", requirePermission("events", "read"), getTimeline);

export default router;
