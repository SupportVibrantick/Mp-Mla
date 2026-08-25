import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

/**
 * POST /api/admin/crm/contacts/:id/interactions
 * Log a new interaction
 */
export async function createInteraction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const contactId = req.params.id as string;
    const data = req.body;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId, isDeleted: false },
    });
    if (!contact) throw ApiError.notFound("Contact not found");

    // Validate integrated entities if provided
    if (data.grievanceId) {
      const g = await prisma.grievance.findFirst({ where: { id: data.grievanceId, tenantId, isDeleted: false } });
      if (!g) throw ApiError.notFound("Linked Grievance not found");
    }
    if (data.appointmentId) {
      const a = await prisma.appointment.findFirst({ where: { id: data.appointmentId, tenantId, isDeleted: false } });
      if (!a) throw ApiError.notFound("Linked Appointment not found");
    }
    if (data.eventId) {
      const e = await prisma.event.findFirst({ where: { id: data.eventId, tenantId, isDeleted: false } });
      if (!e) throw ApiError.notFound("Linked Event not found");
    }
    if (data.janataSessionId) {
      const s = await prisma.janataDarbarSession.findFirst({ where: { id: data.janataSessionId, tenantId, isDeleted: false } });
      if (!s) throw ApiError.notFound("Linked Janata Darbar Session not found");
    }
    if (data.janataTokenId) {
      const t = await prisma.janataDarbarToken.findFirst({ where: { id: data.janataTokenId, sessionId: data.janataSessionId || undefined, tenantId } });
      if (!t) throw ApiError.notFound("Linked Janata Darbar Token not found");
    }
    if (data.schemeApplicationId) {
      const sa = await prisma.schemeApplication.findFirst({ where: { id: data.schemeApplicationId, tenantId, isDeleted: false } });
      if (!sa) throw ApiError.notFound("Linked Scheme Application not found");
    }
    if (data.taskId) {
      const t = await prisma.task.findFirst({ where: { id: data.taskId, tenantId, isDeleted: false } });
      if (!t) throw ApiError.notFound("Linked Task not found");
    }

    const interaction = await prisma.cRMInteraction.create({
      data: {
        tenantId,
        contactId,
        channel: data.channel,
        date: data.date ? new Date(data.date) : new Date(),
        summary: data.summary,
        details: data.details || null,
        grievanceId: data.grievanceId || null,
        appointmentId: data.appointmentId || null,
        eventId: data.eventId || null,
        janataSessionId: data.janataSessionId || null,
        janataTokenId: data.janataTokenId || null,
        schemeApplicationId: data.schemeApplicationId || null,
        taskId: data.taskId || null,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "crm",
      recordId: interaction.id,
      description: `INTERACTION_CREATED: Logged ${data.channel} interaction for contact "${contact.name}"`,
      newData: interaction,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: "Interaction logged successfully",
      data: interaction,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/crm/contacts/:id/interactions
 * List logged interactions for a contact
 */
export async function listInteractions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const contactId = req.params.id as string;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId, isDeleted: false },
    });
    if (!contact) throw ApiError.notFound("Contact not found");

    const interactions = await prisma.cRMInteraction.findMany({
      where: { contactId, tenantId },
      orderBy: { date: "desc" },
      include: {
        grievance: { select: { id: true, ticketNumber: true, subject: true, status: true } },
        appointment: { select: { id: true, appointmentNumber: true, title: true, status: true } },
        event: { select: { id: true, eventCode: true, title: true } },
        janataSession: { select: { id: true, sessionNumber: true, title: true } },
        janataToken: { select: { id: true, tokenNumber: true, visitorName: true } },
        schemeApplication: { select: { id: true, applicationNumber: true, beneficiaryName: true, status: true } },
        task: { select: { id: true, taskCode: true, title: true, status: true } },
      },
    });

    res.json({
      success: true,
      data: interactions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/crm/contacts/:id/timeline
 * Central Aggregated Chronological Timeline for a contact
 */
export async function getContactTimeline(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const contactId = req.params.id as string;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId, isDeleted: false },
    });
    if (!contact) throw ApiError.notFound("Contact not found");

    const phone = contact.phone || undefined;
    const email = contact.email || undefined;

    // Pull custom CRMInteractions
    const crmInteractions = await prisma.cRMInteraction.findMany({
      where: { contactId, tenantId },
      include: {
        grievance: { select: { ticketNumber: true } },
        appointment: { select: { appointmentNumber: true } },
        event: { select: { eventCode: true } },
        janataSession: { select: { sessionNumber: true } },
        janataToken: { select: { tokenNumber: true } },
        schemeApplication: { select: { applicationNumber: true } },
        task: { select: { taskCode: true } },
      },
    });

    // Pull Grievances matching phone or email
    const grievances = (phone || email) ? await prisma.grievance.findMany({
      where: {
        tenantId,
        isDeleted: false,
        OR: [
          phone ? { complainantPhone: phone } : undefined,
          email ? { complainantEmail: email } : undefined,
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        createdAt: true,
        description: true,
      },
    }) : [];

    // Pull Appointments matching phone or email
    const appointments = (phone || email) ? await prisma.appointment.findMany({
      where: {
        tenantId,
        isDeleted: false,
        OR: [
          phone ? { requesterPhone: phone } : undefined,
          email ? { requesterEmail: email } : undefined,
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        appointmentNumber: true,
        title: true,
        status: true,
        date: true,
        startTime: true,
        purpose: true,
      },
    }) : [];

    // Pull Scheme Applications matching phone or email
    const schemeApplications = (phone || email) ? await prisma.schemeApplication.findMany({
      where: {
        tenantId,
        isDeleted: false,
        OR: [
          phone ? { beneficiaryPhone: phone } : undefined,
          email ? { beneficiaryEmail: email } : undefined,
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        applicationNumber: true,
        status: true,
        createdAt: true,
        notes: true,
        scheme: { select: { name: true } },
      },
    }) : [];

    // Pull Janata Darbar Tokens matching phone
    const janataTokens = phone ? await prisma.janataDarbarToken.findMany({
      where: {
        tenantId,
        phone,
      },
      select: {
        id: true,
        tokenNumber: true,
        status: true,
        createdAt: true,
        purpose: true,
        session: { select: { title: true } },
      },
    }) : [];

    // central timeline compiler array
    const timeline: any[] = [];

    // 1. Add Custom CRM Interactions
    crmInteractions.forEach((i) => {
      timeline.push({
        id: i.id,
        date: i.date,
        type: "CRM_INTERACTION",
        title: `Interaction - ${i.channel}`,
        summary: i.summary,
        status: "N/A",
        meta: {
          channel: i.channel,
          details: i.details,
          grievanceNumber: i.grievance?.ticketNumber || null,
          appointmentNumber: i.appointment?.appointmentNumber || null,
          eventCode: i.event?.eventCode || null,
          sessionNumber: i.janataSession?.sessionNumber || null,
          tokenNumber: i.janataToken?.tokenNumber || null,
          applicationNumber: i.schemeApplication?.applicationNumber || null,
          taskCode: i.task?.taskCode || null,
        },
      });
    });

    // 2. Add Grievances
    grievances.forEach((g) => {
      timeline.push({
        id: g.id,
        date: g.createdAt,
        type: "GRIEVANCE",
        title: `Grievance Escalation (${g.ticketNumber})`,
        summary: g.subject,
        status: g.status,
        meta: {
          ticketNumber: g.ticketNumber,
          description: g.description,
        },
      });
    });

    // 3. Add Appointments
    appointments.forEach((a) => {
      // Merge date + time if possible
      const dt = new Date(a.date);
      timeline.push({
        id: a.id,
        date: dt,
        type: "APPOINTMENT",
        title: `Office Appointment (${a.appointmentNumber})`,
        summary: a.title,
        status: a.status,
        meta: {
          appointmentNumber: a.appointmentNumber,
          startTime: a.startTime,
          purpose: a.purpose,
        },
      });
    });

    // 4. Add Scheme Applications
    schemeApplications.forEach((s) => {
      timeline.push({
        id: s.id,
        date: s.createdAt,
        type: "SCHEME_APPLICATION",
        title: `Government Scheme - ${s.scheme.name} (${s.applicationNumber})`,
        summary: s.notes || `Applied for scheme: ${s.scheme.name}`,
        status: s.status,
        meta: {
          applicationNumber: s.applicationNumber,
          schemeName: s.scheme.name,
        },
      });
    });

    // 5. Add Janata Tokens
    janataTokens.forEach((t) => {
      timeline.push({
        id: t.id,
        date: t.createdAt,
        type: "JANATA_TOKEN",
        title: `Janata Darbar Queue Token (${t.tokenNumber})`,
        summary: t.purpose || `Visitor token registered for session: ${t.session.title}`,
        status: t.status,
        meta: {
          tokenNumber: t.tokenNumber,
          sessionTitle: t.session.title,
        },
      });
    });

    // Sort by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    next(error);
  }
}
