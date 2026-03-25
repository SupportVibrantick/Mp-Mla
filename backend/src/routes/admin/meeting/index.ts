import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingById,
  getMeetingStats,
} from "../../../controllers/admin/meeting.controller.js";

const router = Router();

router.get("/stats", requirePermission("meeting", "read"), getMeetingStats);
router.get("/", requirePermission("meeting", "read"), getMeetings);
router.post("/", requirePermission("meeting", "create"), createMeeting);
router.get("/:id", requirePermission("meeting", "read"), getMeetingById);
router.put("/:id", requirePermission("meeting", "update"), updateMeeting);
router.delete("/:id", requirePermission("meeting", "delete"), deleteMeeting);

export default router;
