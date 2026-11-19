import { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import {
  emitToConversation,
  emitToTenant,
  isTenantOnline,
} from "../../services/socket.service.js";
import logger from "../../utils/logger.js";

/**
 * Super Admin: List all tenant support conversations with search & status filters
 */
export async function listAllConversations(req: Request, res: Response): Promise<void> {
  try {
    const { status, priority, category, search } = req.query;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        {
          tenant: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { constituencyName: { contains: q, mode: "insensitive" } },
              { representativeName: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const conversations = await prisma.supportConversation.findMany({
      where,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            constituencyName: true,
            logoUrl: true,
            status: true,
            primaryColor: true,
            representativeName: true,
            representativeTitle: true,
            phone: true,
            email: true,
          },
        },
        assignedPlatformUser: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: [
        { unreadCountAdmin: "desc" },
        { lastMessageAt: "desc" },
      ],
    });

    const enriched = conversations.map((conv) => ({
      ...conv,
      isTenantOnline: isTenantOnline(conv.tenantId),
    }));

    res.json({
      success: true,
      data: enriched,
    });
  } catch (err: any) {
    logger.error(`[listAllConversations] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to list conversations" });
  }
}

/**
 * Super Admin: Get aggregate stats for support desk
 */
export async function getSupportStats(_req: Request, res: Response): Promise<void> {
  try {
    const [openCount, inProgressCount, resolvedCount, totalUnread] = await Promise.all([
      prisma.supportConversation.count({ where: { status: "OPEN" } }),
      prisma.supportConversation.count({ where: { status: "IN_PROGRESS" } }),
      prisma.supportConversation.count({ where: { status: "RESOLVED" } }),
      prisma.supportConversation.aggregate({
        _sum: { unreadCountAdmin: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        totalUnread: totalUnread._sum.unreadCountAdmin || 0,
      },
    });
  } catch (err: any) {
    logger.error(`[getSupportStats] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
}

/**
 * Super Admin: Get full details & messages of a specific conversation
 */
export async function getConversationDetail(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const conversation = await prisma.supportConversation.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            constituencyName: true,
            state: true,
            district: true,
            logoUrl: true,
            status: true,
            primaryColor: true,
            representativeName: true,
            representativeTitle: true,
            representativePhoto: true,
            partyName: true,
            phone: true,
            email: true,
            storageUsedMB: true,
          },
        },
        assignedPlatformUser: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        ...conversation,
        isTenantOnline: isTenantOnline(conversation.tenantId),
      },
    });
  } catch (err: any) {
    logger.error(`[getConversationDetail] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to load conversation" });
  }
}

/**
 * Super Admin: Send a response message to tenant
 */
export async function sendAdminMessage(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { message, attachments } = req.body;
    const adminUser = req.platformUser;
    const adminUserId = adminUser?.id || (adminUser as any)?.userId;

    if (!message && (!attachments || attachments.length === 0)) {
      res.status(400).json({ success: false, message: "Message or attachment is required" });
      return;
    }

    const conversation = await prisma.supportConversation.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    });

    if (!conversation) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    const platformUser = adminUserId
      ? await prisma.platformUser.findUnique({
          where: { id: adminUserId },
          select: { name: true, role: true, avatarUrl: true },
        })
      : null;

    const newMsg = await prisma.supportMessage.create({
      data: {
        conversationId: id,
        senderType: "SUPER_ADMIN",
        senderId: adminUserId || "super-admin",
        senderName: platformUser?.name || "Super Admin",
        senderAvatar: platformUser?.avatarUrl,
        senderRole: platformUser?.role || "Support Lead",
        message: message?.trim() || "Sent an attachment",
        attachments: attachments || null,
        isRead: false,
      },
    });

    // Automatically transition OPEN to IN_PROGRESS when admin replies
    const nextStatus = conversation.status === "OPEN" ? "IN_PROGRESS" : conversation.status;

    await prisma.supportConversation.update({
      where: { id },
      data: {
        status: nextStatus,
        lastMessageAt: new Date(),
        lastMessageText: newMsg.message,
        unreadCountTenant: { increment: 1 },
      },
    });

    // Realtime broadcast to conversation room
    emitToConversation(id, "new_message", newMsg);

    // Notify tenant's dashboard
    emitToTenant(conversation.tenantId, "support_message_received", {
      conversationId: id,
      message: newMsg,
    });

    res.status(201).json({
      success: true,
      data: newMsg,
    });
  } catch (err: any) {
    logger.error(`[sendAdminMessage] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to send admin message" });
  }
}

/**
 * Super Admin: Update status, priority, or assigned agent
 */
export async function updateConversation(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { status, priority, category, assignedPlatformUserId } = req.body;

    const existing = await prisma.supportConversation.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: "Conversation not found" });
      return;
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (category) updateData.category = category;
    if (assignedPlatformUserId !== undefined) {
      updateData.assignedPlatformUserId = assignedPlatformUserId || null;
    }

    const updated = await prisma.supportConversation.update({
      where: { id },
      data: updateData,
      include: {
        assignedPlatformUser: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
      },
    });

    // If status changed to RESOLVED or CLOSED, post system note
    if (status && status !== existing.status) {
      const sysNote = await prisma.supportMessage.create({
        data: {
          conversationId: id,
          senderType: "SYSTEM",
          senderId: "system",
          senderName: "Support Desk",
          senderRole: "System Bot",
          message: `Conversation status changed from ${existing.status} to ${status}.`,
        },
      });

      emitToConversation(id, "new_message", sysNote);
      emitToConversation(id, "conversation_status_changed", {
        conversationId: id,
        status,
      });

      emitToTenant(existing.tenantId, "support_status_updated", {
        conversationId: id,
        status,
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    logger.error(`[updateConversation] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to update conversation" });
  }
}

/**
 * Super Admin: Mark all tenant messages in this conversation as read
 */
export async function markAdminAsRead(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);

    const now = new Date();
    await prisma.supportMessage.updateMany({
      where: {
        conversationId: id,
        senderType: "TENANT_USER",
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    await prisma.supportConversation.update({
      where: { id },
      data: { unreadCountAdmin: 0 },
    });

    emitToConversation(id, "messages_read", {
      conversationId: id,
      readBy: "admin",
      readAt: now,
    });

    res.json({ success: true, message: "Admin marked messages as read" });
  } catch (err: any) {
    logger.error(`[markAdminAsRead] Error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
}
