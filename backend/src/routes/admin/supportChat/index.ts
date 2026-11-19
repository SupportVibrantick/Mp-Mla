import { Router } from "express";
import { createUploader } from "../../../lib/upload.js";
import {
  getActiveConversation,
  listTenantConversations,
  createConversation,
  getConversationMessages,
  sendMessage,
  markAsRead,
  resolveConversation,
} from "../../../controllers/supportChat.controller.js";

const router = Router();
const supportUpload = createUploader("support");

// Active conversation
router.get("/active", getActiveConversation);

// List past conversations
router.get("/conversations", listTenantConversations);

// Create new support ticket
router.post("/conversations", createConversation);

// Messages of conversation
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.post("/conversations/:conversationId/messages", sendMessage);

// Mark read
router.post("/conversations/:conversationId/read", markAsRead);

// Resolve
router.patch("/conversations/:conversationId/resolve", resolveConversation);

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
