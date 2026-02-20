import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { listLeaders, getLeader, getLeaderStats } from "./read.js";
import { createLeader, createSchema } from "./create.js";
import { updateLeader, updateSchema } from "./update.js";
import { deleteLeader } from "./delete.js";
import {
  getTodayBirthdays,
  getUpcomingBirthdays,
  getThisMonthBirthdays,
  getBirthdayCalendar,
} from "./birthdays.js";
import {
  sendGreeting,
  greetingSchema,
  sendBulkGreeting,
  bulkGreetingSchema,
  getGreetingHistory,
} from "./greetings.js";

const router = Router();

// CRUD
router.get("/", requirePermission("leaders", "read"), listLeaders);
router.get("/stats", requirePermission("leaders", "read"), getLeaderStats);
router.get("/:id", requirePermission("leaders", "read"), getLeader);
router.post(
  "/",
  requirePermission("leaders", "create"),
  validate(createSchema),
  createLeader,
);
router.put(
  "/:id",
  requirePermission("leaders", "update"),
  validate(updateSchema),
  updateLeader,
);
router.delete("/:id", requirePermission("leaders", "delete"), deleteLeader);

// Birthdays
router.get(
  "/birthdays/today",
  requirePermission("leaders", "read"),
  getTodayBirthdays,
);
router.get(
  "/birthdays/upcoming",
  requirePermission("leaders", "read"),
  getUpcomingBirthdays,
);
router.get(
  "/birthdays/month",
  requirePermission("leaders", "read"),
  getThisMonthBirthdays,
);
router.get(
  "/birthdays/calendar",
  requirePermission("leaders", "read"),
  getBirthdayCalendar,
);

// Greetings
router.post(
  "/:id/greetings",
  requirePermission("leaders", "update"),
  validate(greetingSchema),
  sendGreeting,
);
router.post(
  "/greetings/bulk",
  requirePermission("leaders", "update"),
  validate(bulkGreetingSchema),
  sendBulkGreeting,
);
router.get(
  "/:id/greetings",
  requirePermission("leaders", "read"),
  getGreetingHistory,
);

export default router;
