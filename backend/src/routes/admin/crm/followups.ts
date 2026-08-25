import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

/**
 * POST /api/admin/crm/contacts/:id/followups
 * Schedule a new follow-up
 */
export async function createFollowUp(
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

    if (data.assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: data.assignedToId, tenantId, status: "ACTIVE" },
      });
      if (!user) throw ApiError.badRequest("Active assignee user not found in this tenant.");
    }

    const followUp = await prisma.cRMFollowUp.create({
      data: {
        tenantId,
        contactId,
        followUpDate: new Date(data.followUpDate),
        assignedToId: data.assignedToId || null,
        purpose: data.purpose,
        notes: data.notes || null,
        status: "PENDING",
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "crm",
      recordId: followUp.id,
      description: `CRM_FOLLOWUP_CREATED: Scheduled follow-up for contact "${contact.name}" on ${data.followUpDate}`,
      newData: followUp,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: "Follow-up scheduled successfully",
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/crm/contacts/:id/followups
 * List follow-ups for a contact
 */
export async function listFollowUps(
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

    const followUps = await prisma.cRMFollowUp.findMany({
      where: { contactId, tenantId },
      orderBy: { followUpDate: "asc" },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      success: true,
      data: followUps,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/crm/followups/:followUpId
 * Update follow-up details
 */
export async function updateFollowUp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const followUpId = req.params.followUpId as string;
    const data = req.body;

    const old = await prisma.cRMFollowUp.findFirst({
      where: { id: followUpId, tenantId },
    });
    if (!old) throw ApiError.notFound("Follow-up not found");

    if (data.assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: data.assignedToId, tenantId, status: "ACTIVE" },
      });
      if (!user) throw ApiError.badRequest("Active assignee user not found in this tenant.");
    }

    const updated = await prisma.cRMFollowUp.update({
      where: { id: followUpId },
      data: {
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : undefined,
        purpose: data.purpose,
        notes: data.notes,
        status: data.status,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "crm",
      recordId: followUpId,
      description: `CRM_FOLLOWUP_UPDATED: Updated details for follow-up ID ${followUpId}`,
      oldData: old as any,
      newData: updated as any,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Follow-up details updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/crm/followups/:followUpId/status
 * Transition follow-up status
 */
export async function transitionFollowUpStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const followUpId = req.params.followUpId as string;
    const { status, notes } = req.body; // COMPLETED, CANCELLED

    const old = await prisma.cRMFollowUp.findFirst({
      where: { id: followUpId, tenantId },
    });
    if (!old) throw ApiError.notFound("Follow-up not found");

    const updated = await prisma.cRMFollowUp.update({
      where: { id: followUpId },
      data: {
        status,
        notes: notes || old.notes,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "crm",
      recordId: followUpId,
      description: `CRM_FOLLOWUP_STATUS_CHANGE: Transitioned status for follow-up ID ${followUpId} to ${status}`,
      oldData: { status: old.status },
      newData: { status },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Follow-up status transitioned to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
