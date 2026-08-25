import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";

/**
 * POST /api/admin/crm/contacts
 * Create a new CRM Contact
 */
export async function createContact(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    if (data.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId, isDeleted: false },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        wardId: data.wardId || null,
        category: data.category || "CITIZEN",
        relationship: data.relationship || null,
        tags: data.tags || null,
        importantNotes: data.importantNotes || null,
        createdById: req.user!.id,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "crm",
      recordId: contact.id,
      description: `CONTACT_CREATED: Registered contact "${contact.name}" under category "${contact.category}"`,
      newData: contact,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Contact "${contact.name}" created successfully`,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/crm/contacts
 * List CRM Contacts
 */
export async function listContacts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const { category, wardId, search } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (category && category !== "all") where.category = category;
    if (wardId && wardId !== "all") where.wardId = wardId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { tags: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          ward: { select: { id: true, name: true, wardNumber: true } },
          _count: { select: { interactions: true, followUps: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      pagination: buildPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/crm/contacts/:id
 * Get single contact details
 */
export async function getContact(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const contactId = req.params.id as string;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId, isDeleted: false },
      include: {
        ward: { select: { id: true, name: true, wardNumber: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!contact) throw ApiError.notFound("Contact not found");

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/crm/contacts/:id
 * Update Contact details
 */
export async function updateContact(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const contactId = req.params.id as string;
    const data = req.body;

    const old = await prisma.contact.findFirst({
      where: { id: contactId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Contact not found");

    if (data.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId, isDeleted: false },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        wardId: data.wardId,
        category: data.category,
        relationship: data.relationship,
        tags: data.tags,
        importantNotes: data.importantNotes,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "crm",
      recordId: contactId,
      description: `CONTACT_UPDATED: Updated details for contact "${contact.name}"`,
      oldData: old as any,
      newData: contact as any,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Contact "${contact.name}" updated successfully`,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/crm/contacts/:id
 * Soft-delete Contact
 */
export async function deleteContact(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const contactId = req.params.id as string;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
    });
    if (!contact) throw ApiError.notFound("Contact not found");
    if (contact.isDeleted) throw ApiError.badRequest("Contact is already deleted.");

    // Archive in recycle bin
    await archiveToRecycleBin({
      tenantId,
      module: "crm",
      entityType: "contact" as any,
      recordId: contactId,
      recordLabel: `${contact.name} (${contact.category})`,
      payload: contact,
      deletedById: req.user!.id,
    });

    // Soft delete
    await prisma.contact.update({
      where: { id: contactId },
      data: { isDeleted: true },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "crm",
      recordId: contactId,
      description: `CONTACT_DELETED: Soft-deleted contact "${contact.name}"`,
      oldData: { name: contact.name, isDeleted: false },
      newData: { isDeleted: true },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Contact "${contact.name}" successfully moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
