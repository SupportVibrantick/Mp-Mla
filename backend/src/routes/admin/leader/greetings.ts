import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";
import { sendEmail } from "../../../lib/email.js";
import { requireTenantId } from "../../../utils/tenant.js";

export const greetingSchema = z.object({
  type: z
    .enum(["BIRTHDAY", "FESTIVAL", "ACHIEVEMENT", "CUSTOM"])
    .default("BIRTHDAY"),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  message: z.string().min(1, "Message required"),
});

export const bulkGreetingSchema = z.object({
  leaderIds: z.array(z.string()).min(1),
  type: z
    .enum(["BIRTHDAY", "FESTIVAL", "ACHIEVEMENT", "CUSTOM"])
    .default("BIRTHDAY"),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  message: z.string().min(1, "Message required"),
});

export async function sendGreeting(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const leader = await prisma.leader.findFirst({
      where: { id: req.params.id as string, tenantId },
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

    let status: "SENT" | "FAILED" | "PENDING" = "SENT";

    // Handle Email
    if (channel === "EMAIL") {
      if (!leader.email) {
        throw ApiError.badRequest("Leader does not have an email address");
      }
      const subject = `${type} Greeting from ${req.user!.name || "Admin"}`;
      const emailSent = await sendEmail(
        leader.email,
        subject,
        `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
          <h2 style="color: #6366f1;">${type} Greeting</h2>
          <p>${personalizedMsg.replace(/\n/g, "<br/>")}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px;">Sent via Constituency Management Portal</p>
        </div>`,
      );
      if (!emailSent) status = "FAILED";
    }

    const greeting = await prisma.leaderGreeting.create({
      data: {
        leaderId: leader.id,
        type,
        channel,
        message: personalizedMsg,
        status,
        sentAt: new Date(),
        sentBy: req.user!.name || req.user!.email,
        year,
      },
    });

    // Also create a notification record for tracking
    await prisma.notification.create({
      data: {
        tenantId,
        channel,
        title: `${type} Greeting — ${leader.name}`,
        message: personalizedMsg,
        status,
        recipientPhone:
          channel === "WHATSAPP"
            ? leader.whatsapp || leader.phone
            : undefined,
        recipientEmail: channel === "EMAIL" ? leader.email : undefined,
        sentAt: new Date(),
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "SEND_NOTIFICATION",
      module: "leaders",
      recordId: leader.id,
      description: `Sent ${type} greeting to "${leader.name}" via ${channel}`,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: status === "SENT" 
        ? `${type} greeting sent to ${leader.name} via ${channel}`
        : `Failed to send ${type} greeting via ${channel}`,
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
    const tenantId = requireTenantId(req);
    const { leaderIds, type, channel, message } = req.body;
    const year = new Date().getFullYear();
    const results: any[] = [];

    const leaders = await prisma.leader.findMany({
      where: { tenantId, id: { in: leaderIds } },
    });

    for (const leader of leaders) {
      const personalizedMsg = message
        .replace(/\{name\}/g, leader.name)
        .replace(
          /\{age\}/g,
          String(year - new Date(leader.dateOfBirth).getFullYear()),
        )
        .replace(/\{designation\}/g, leader.designation || "")
        .replace(/\{party\}/g, leader.partyName || "");

      let status: "SENT" | "FAILED" | "PENDING" = "SENT";

      if (channel === "EMAIL" && leader.email) {
        const subject = `${type} Greeting`;
        const emailSent = await sendEmail(
          leader.email,
          subject,
          `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <p>${personalizedMsg.replace(/\n/g, "<br/>")}</p>
          </div>`,
        );
        if (!emailSent) status = "FAILED";
      }

      const greeting = await prisma.leaderGreeting.create({
        data: {
          leaderId: leader.id,
          type,
          channel,
          message: personalizedMsg,
          status,
          sentAt: new Date(),
          sentBy: req.user!.name || req.user!.email,
          year,
        },
      });
      results.push(greeting);
    }

    await createAuditLog({
      tenantId,
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
    const tenantId = requireTenantId(req);
    const greetings = await prisma.leaderGreeting.findMany({
      where: { leaderId: req.params.id as string, leader: { tenantId } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, data: greetings });
  } catch (error) {
    next(error);
  }
}
