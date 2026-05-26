import { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createAuditLog } from "../../middleware/auditLog.js";
import { sendEmail, buildMeetingEmailHtml } from "../../lib/email.js";
import { getSetting } from "../../lib/settings.js";
import { requireTenantId } from "../../utils/tenant.js";

// Validation Schemas
const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),   
  date: z.string().min(1, "Date is required").or(z.date()),
  time: z.string().optional().nullable(),
  type: z.enum(["ONLINE", "OFFLINE"]),
  location: z.string().optional().nullable(),
  meetingLink: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  attendees: z.string().optional().nullable(),
  organizedBy: z.string().optional().nullable(),
});

export const getMeetings = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = requireTenantId(req);

    const { status, type, search, page = "1", limit = "10" } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const where: Prisma.MeetingWhereInput = {
      tenantId,
      isDeleted: false,
    };

    if (status) {
      where.status = status as any;
    }
    
    if (type) {
      where.type = type as any;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        orderBy: { date: "asc" },
        skip,
        take: limitNumber,
      }),
      prisma.meeting.count({ where }),
    ]);

    res.json({
      success: true,
      data: meetings,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = requireTenantId(req);

    const validData = meetingSchema.parse(req.body);

    const meeting = await prisma.meeting.create({
      data: {
        ...validData,
        tenantId,
        date: new Date(validData.date),
        meetingLink: validData.meetingLink || null, // convert empty string to null safely
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: "CREATE" as any,
      module: "meeting",
      recordId: meeting.id,
      description: `Created meeting: ${meeting.title}`,
      newData: meeting as any,
    });

    // Send Notification
    const orgEmail = await getSetting("org_email");
    const subject = `New Meeting Scheduled: ${meeting.title}`;
    const html = buildMeetingEmailHtml({ meeting, action: "CREATED" });

    if (orgEmail) {
      sendEmail(orgEmail, subject, html).catch(err => console.error("Meeting email failed", err));
    }

    if (meeting.attendees) {
      const attendeeEmails = meeting.attendees.split(/[,\s]+/).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
      attendeeEmails.forEach(email => {
        sendEmail(email.trim(), subject, html).catch(err => console.error("Attendee email failed", err));
      });
    }

    res.status(201).json({ success: true, data: meeting });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

export const getMeetingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = requireTenantId(req);

    const id = req.params.id as string;
    const meeting = await prisma.meeting.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!meeting) {
      res.status(404).json({ success: false, error: "Meeting not found" });
      return;
    }

    res.json({ success: true, data: meeting });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = requireTenantId(req);

    const id = req.params.id as string;
    const validData = meetingSchema.partial().parse(req.body);

    const existingMeeting = await prisma.meeting.findFirst({
      where: { id, tenantId },
    });

    if (!existingMeeting || existingMeeting.isDeleted) {
      res.status(404).json({ success: false, error: "Meeting not found" });
      return;
    }
    
    // Ensure properly formatted data for DB
    const updateData: any = { ...validData };
    if (validData.date) {
      updateData.date = new Date(validData.date);
      updateData.reminderSent = false;
    }
    if (validData.time) {
      updateData.reminderSent = false;
    }
    if (validData.meetingLink === "") {
      updateData.meetingLink = null;
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: "UPDATE" as any,
      module: "meeting",
      recordId: meeting.id,
      description: `Updated meeting: ${meeting.title}`,
      oldData: existingMeeting as any,
      newData: meeting as any,
    });

    // Send Notification
    const orgEmail = await getSetting("org_email");
    let action: any = meeting.status === "CANCELLED" ? "CANCELLED" : "UPDATED";
    let subject = `Meeting Updated: ${meeting.title}`;
    
    if (meeting.status === "CANCELLED") {
      subject = `Meeting Cancelled: ${meeting.title}`;
    } else if (meeting.status === "COMPLETED") {
      subject = `Meeting Completed: ${meeting.title}`;
    }
    
    const html = buildMeetingEmailHtml({ meeting, action });


    if (orgEmail) {
      sendEmail(orgEmail, subject, html).catch(err => console.error("Meeting email failed", err));
    }

    if (meeting.attendees) {
      const attendeeEmails = meeting.attendees.split(/[,\s]+/).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
      attendeeEmails.forEach(email => {
        sendEmail(email.trim(), subject, html).catch(err => console.error("Attendee email failed", err));
      });
    }

    res.json({ success: true, data: meeting });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.errors });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

export const deleteMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = requireTenantId(req);

    const id = req.params.id as string;

    const existingMeeting = await prisma.meeting.findFirst({
      where: { id, tenantId },
    });

    if (!existingMeeting || existingMeeting.isDeleted) {
      res.status(404).json({ success: false, error: "Meeting not found" });
      return;
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: { isDeleted: true },
    });

    // Handle Recycle Bin
    await prisma.recycleBinEntry.create({
      data: {
        tenantId,
        module: "meetings",
        entityType: "meeting",
        recordId: existingMeeting.id,
        recordLabel: existingMeeting.title,
        payload: existingMeeting as any,
        deletedById: req.user?.id,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: "DELETE" as any,
      module: "meeting",
      recordId: id,
      description: `Deleted meeting: ${existingMeeting.title}`,
      oldData: existingMeeting as any,
    });

    // Send Notification (treating delete as cancelled for email purposes)
    const orgEmail = await getSetting("org_email");
    if (orgEmail) {
      const html = buildMeetingEmailHtml({ meeting: existingMeeting, action: "CANCELLED" });
      sendEmail(orgEmail, `Meeting Cancelled/Deleted: ${existingMeeting.title}`, html).catch(err => console.error("Meeting email failed", err));
    }

    res.json({ success: true, message: "Meeting deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMeetingStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = requireTenantId(req);

    const counts = await prisma.meeting.groupBy({
      by: ['status'],
      where: { tenantId, isDeleted: false },
      _count: true
    });

    const stats = {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
    };

    counts.forEach(c => {
      const count = c._count;
      stats.total += count;
      if (c.status === 'SCHEDULED') stats.scheduled = count;
      if (c.status === 'COMPLETED') stats.completed = count;
      if (c.status === 'CANCELLED') stats.cancelled = count;
    });

    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
