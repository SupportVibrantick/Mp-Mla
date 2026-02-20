import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";

export const greetingSchema = z.object({
  type: z
    .enum(["BIRTHDAY", "FESTIVAL", "ACHIEVEMENT", "CUSTOM"])
    .default("BIRTHDAY"),
  channel: z.enum(["SMS", "EMAIL", "WHATSAPP", "IN_APP"]),
  message: z.string().min(1, "Message required"),
});

export const bulkGreetingSchema = z.object({
  leaderIds: z.array(z.string()).min(1),
  type: z
    .enum(["BIRTHDAY", "FESTIVAL", "ACHIEVEMENT", "CUSTOM"])
    .default("BIRTHDAY"),
  channel: z.enum(["SMS", "EMAIL", "WHATSAPP", "IN_APP"]),
  message: z.string().min(1, "Message required"),
});

export async function sendGreeting(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const leader = await prisma.leader.findUnique({
      where: { id: req.params.id },
    });
    if (!leader) throw ApiError.notFound("Leader not found");

    const { type, channel, message } = req.body;
    const year = new Date().getFullYear();

    // Check duplicate birthday greeting
    if (type === "BIRTHDAY") {
      const existing = await prisma.leaderGreeting.findFirst({
        where: {
          leaderId: leader.id,
          type: "BIRTHDAY",
          year,
          channel,
          status: { in: ["SENT", "DELIVERED", "PENDING"] },
        },
      });
      if (existing) {
        throw ApiError.badRequest(
          `Birthday greeting via ${channel} already sent this year`,
        );
      }
    }

    // Personalize message
    const personalizedMsg = message
      .replace(/\{name\}/g, leader.name)
      .replace(
        /\{age\}/g,
        String(year - new Date(leader.dateOfBirth).getFullYear()),
      )
      .replace(/\{designation\}/g, leader.designation || "")
      .replace(/\{party\}/g, leader.partyName || "");

    // In production: integrate SMS/WhatsApp/Email API here
    // For now, mark as SENT
    const greeting = await prisma.leaderGreeting.create({
      data: {
        leaderId: leader.id,
        type,
        channel,
        message: personalizedMsg,
        status: "SENT",
        sentAt: new Date(),
        sentBy: req.user!.name || req.user!.email,
        year,
      },
    });

    // Also create a notification record for tracking
    await prisma.notification.create({
      data: {
        channel,
        title: `${type} Greeting — ${leader.name}`,
        message: personalizedMsg,
        status: "SENT",
        recipientPhone:
          channel === "SMS" || channel === "WHATSAPP"
            ? leader.whatsapp || leader.phone
            : undefined,
        recipientEmail: channel === "EMAIL" ? leader.email : undefined,
        sentAt: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "SEND_NOTIFICATION",
      module: "leaders",
      recordId: leader.id,
      description: `Sent ${type} greeting to "${leader.name}" via ${channel}`,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `${type} greeting sent to ${leader.name} via ${channel}`,
      data: greeting,
    });
  } catch (error) {
    next(error);
  }
}

export async function sendBulkGreeting(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { leaderIds, type, channel, message } = req.body;
    const year = new Date().getFullYear();
    const results: any[] = [];

    const leaders = await prisma.leader.findMany({
      where: { id: { in: leaderIds } },
    });

    for (const leader of leaders) {
      const personalizedMsg = message
        .replace(/\{name\}/g, leader.name)
        .replace(
          /\{age\}/g,
          String(year - new Date(leader.dateOfBirth).getFullYear()),
        );

      const greeting = await prisma.leaderGreeting.create({
        data: {
          leaderId: leader.id,
          type,
          channel,
          message: personalizedMsg,
          status: "SENT",
          sentAt: new Date(),
          sentBy: req.user!.name || req.user!.email,
          year,
        },
      });
      results.push(greeting);
    }

    await createAuditLog({
      userId: req.user!.id,
      action: "SEND_NOTIFICATION",
      module: "leaders",
      description: `Bulk ${type} greeting to ${results.length} leaders via ${channel}`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Sent to ${results.length} leaders`,
      data: { sent: results.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function getGreetingHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const greetings = await prisma.leaderGreeting.findMany({
      where: { leaderId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, data: greetings });
  } catch (error) {
    next(error);
  }
}
