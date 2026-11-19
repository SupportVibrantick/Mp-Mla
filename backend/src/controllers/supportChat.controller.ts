import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import {
  emitToConversation,
  emitToPlatform,
  isAnyAdminOnline,
} from "../services/socket.service.js";
import logger from "../utils/logger.js";

/**
 * Get or create the tenant's current active support session
 */
export async function getActiveConversation(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, message: "Tenant ID required" });
      return;
    }

    // Find latest open or in-progress conversation
    let conversation = await prisma.supportConversation.findFirst({
      where: {
        tenantId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      include: {
        assignedPlatformUser: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // If none exists, create a fresh one
    if (!conversation) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, constituencyName: true },
      });

      conversation = await prisma.supportConversation.create({
        data: {
          tenantId,
          subject: `${tenant?.constituencyName || "Constituency"} Live Support`,
          status: "OPEN",
          priority: "MEDIUM",
          category: "GENERAL",
          messages: {
            create: {
              senderType: "SYSTEM",
              senderId: "system",
              senderName: "Support Desk",
              senderRole: "System Bot",
              message: `Welcome to Priority Live Support! Our technical and operations team is here to assist ${tenant?.name || "your office"}. Please describe your query, request, or issue.`,
            },
          },
        },
        include: {
          assignedPlatformUser: {
            select: { id: true, name: true, role: true, avatarUrl: true },
          },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // Notify platform admins of new conversation
      emitToPlatform("new_conversation", {
        conversationId: conversation.id,
        tenantId,
        tenantName: tenant?.name,
        constituency: tenant?.constituencyName,
        status: conversation.status,
      });
    }

    res.json({
      success: true,
      data: {
        ...conversation,
        isSupportOnline: isAnyAdminOnline(),
      },
    });
  } catch (err: any) {
    logger.error(`[getActiveConversation] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to load support chat" });
  }
}

/**
 * List all conversations for this tenant (history)
 */
export async function listTenantConversations(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, message: "Tenant ID required" });
      return;
    }

    const conversations = await prisma.supportConversation.findMany({
      where: { tenantId },
      include: {
        assignedPlatformUser: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({
      success: true,
      data: conversations,
    });
  } catch (err: any) {
    logger.error(`[listTenantConversations] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to list conversations" });
  }
}

/**
 * Create a new targeted support ticket / conversation
 */
export async function createConversation(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = (req.user?.id || (req.user as any)?.userId) as string | undefined;
    if (!tenantId) {
      res.status(400).json({ success: false, message: "Tenant ID required" });
      return;
    }

    const { subject, category = "GENERAL", priority = "MEDIUM", message, attachments } = req.body;
    if (!message || !message.trim()) {
      res.status(400).json({ success: false, message: "Initial message is required" });
      return;
    }

    const tenantUser = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, role: true, avatarUrl: true },
        })
      : null;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, constituencyName: true },
    });

    const conversation = await prisma.supportConversation.create({
      data: {
        tenantId,
        subject: subject?.trim() || `${tenant?.constituencyName || "Constituency"} Support Request`,
        category,
        priority,
        status: "OPEN",
        lastMessageAt: new Date(),
        lastMessageText: message.trim(),
        unreadCountAdmin: 1,
        messages: {
          create: {
            senderType: "TENANT_USER",
            senderId: userId || "tenant-user",
            senderName: tenantUser?.name || tenant?.name || "Constituency Office",
            senderAvatar: tenantUser?.avatarUrl,
            senderRole: tenantUser?.role || "Admin",
            message: message.trim(),
            attachments: attachments || null,
          },
        },
      },
      include: {
        messages: true,
        assignedPlatformUser: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
      },
    });

    emitToPlatform("new_conversation", {
      conversation,
      tenantName: tenant?.name,
      constituency: tenant?.constituencyName,
    });

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (err: any) {
    logger.error(`[createConversation] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to create support conversation" });
  }
}

/**
 * Get messages of a specific conversation
 */
export async function getConversationMessages(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const conversationId = String(req.params.conversationId);

    const conversation = await prisma.supportConversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    const messages = await prisma.supportMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (err: any) {
    logger.error(`[getConversationMessages] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to load messages" });
  }
}

/**
 * Send a message from tenant user
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = (req.user?.id || (req.user as any)?.userId) as string | undefined;
    const conversationId = String(req.params.conversationId);
    const { message, attachments } = req.body;

    if (!message && (!attachments || attachments.length === 0)) {
      res.status(400).json({ success: false, message: "Message or attachment is required" });
      return;
    }

    const conversation = await prisma.supportConversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        tenant: {
          select: { name: true, constituencyName: true, logoUrl: true },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    const tenantUser = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, role: true, avatarUrl: true },
        })
      : null;

    const newMsg = await prisma.supportMessage.create({
      data: {
        conversationId,
        senderType: "TENANT_USER",
        senderId: userId || "tenant-user",
        senderName: tenantUser?.name || conversation.tenant.name || "Constituency User",
        senderAvatar: tenantUser?.avatarUrl,
        senderRole: tenantUser?.role || "Staff",
        message: message?.trim() || "Sent an attachment",
        attachments: attachments || null,
        isRead: false,
      },
    });

    // Update conversation metadata: reopen if closed, increment unread for admin
    const nextStatus = conversation.status === "RESOLVED" || conversation.status === "CLOSED" ? "IN_PROGRESS" : conversation.status;
    const updatedConv = await prisma.supportConversation.update({
      where: { id: conversationId },
      data: {
        status: nextStatus,
        lastMessageAt: new Date(),
        lastMessageText: newMsg.message,
        unreadCountAdmin: { increment: 1 },
      },
    });

    // Broadcast real-time message to conversation room
    emitToConversation(conversationId, "new_message", newMsg);

    // Notify Super Admin live desk
    emitToPlatform("conversation_updated", {
      conversationId,
      tenantId,
      tenantName: conversation.tenant.name,
      constituency: conversation.tenant.constituencyName,
      lastMessage: newMsg,
      status: updatedConv.status,
      unreadCountAdmin: updatedConv.unreadCountAdmin,
    });

    res.status(201).json({
      success: true,
      data: newMsg,
    });
  } catch (err: any) {
    logger.error(`[sendMessage] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
}

/**
 * Mark messages as read by tenant
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const conversationId = String(req.params.conversationId);

    const conversation = await prisma.supportConversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    const now = new Date();
    await prisma.supportMessage.updateMany({
      where: {
        conversationId,
        senderType: { in: ["SUPER_ADMIN", "SYSTEM"] },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    await prisma.supportConversation.update({
      where: { id: conversationId },
      data: { unreadCountTenant: 0 },
    });

    emitToConversation(conversationId, "messages_read", {
      conversationId,
      readBy: "tenant",
      readAt: now,
    });

    res.json({ success: true, message: "Messages marked as read" });
  } catch (err: any) {
    logger.error(`[markAsRead] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
}

/**
 * Mark conversation as resolved by tenant
 */
export async function resolveConversation(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const conversationId = String(req.params.conversationId);

    const conversation = await prisma.supportConversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    const updated = await prisma.supportConversation.update({
      where: { id: conversationId },
      data: { status: "RESOLVED" },
    });

    // Post system confirmation
    const sysMsg = await prisma.supportMessage.create({
      data: {
        conversationId,
        senderType: "SYSTEM",
        senderId: "system",
        senderName: "Support Desk",
        senderRole: "System Bot",
        message: "This issue has been marked as Resolved by the constituent office. You can message again at any time to reopen.",
      },
    });

    emitToConversation(conversationId, "new_message", sysMsg);
    emitToConversation(conversationId, "conversation_status_changed", {
      conversationId,
      status: "RESOLVED",
    });

    emitToPlatform("conversation_status_changed", {
      conversationId,
      status: "RESOLVED",
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    logger.error(`[resolveConversation] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to resolve conversation" });
  }
}
