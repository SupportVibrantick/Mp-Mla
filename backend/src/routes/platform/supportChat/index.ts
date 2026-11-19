import { Router } from "express";
import {
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform,
} from "../../../middleware/platformAuth.js";
import { createUploader } from "../../../lib/upload.js";
import {
  listAllConversations,
  getSupportStats,
  getConversationDetail,
  sendAdminMessage,
  updateConversation,
  markAdminAsRead,
} from "../../../controllers/platform/supportChat.controller.js";

const router = Router();
const supportUpload = createUploader("support");

// All platform support routes require platform authentication
router.use(
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN", "SUPPORT_STAFF"),
);

// Overview stats
router.get("/stats", getSupportStats);

// List all conversations
router.get("/conversations", listAllConversations);

// Conversation detail & messages
router.get("/conversations/:id", getConversationDetail);
router.post("/conversations/:id/messages", sendAdminMessage);
router.patch("/conversations/:id", updateConversation);
router.post("/conversations/:id/read", markAdminAsRead);

// Upload attachment
router.post(
  "/upload",
  supportUpload.single("file"),
  (req, res): void => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file provided" });
      return;
    }

    const fileUrl = `/uploads/support/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      },
    });
  },
);

export default router;
