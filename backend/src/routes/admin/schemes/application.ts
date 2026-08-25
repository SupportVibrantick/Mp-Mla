import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import { generateApplicationNumber } from "./helpers.js";
import { applyTransition } from "../../../services/scheme/schemeWorkflow.service.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { generateTicketNumber } from "../grievance/helpers.js";

async function generateTaskCode(tenantId: string): Promise<string> {
  const prefix = `TSK-${new Date().getFullYear()}-`;
  const last = await prisma.task.findFirst({
    where: { tenantId, taskCode: { startsWith: prefix } },
    orderBy: { taskCode: "desc" },
    select: { taskCode: true },
  });
  let count = 1;
  if (last) {
    const parts = last.taskCode.split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) count = num + 1;
  }
  return `${prefix}${String(count).padStart(5, "0")}`;
}

export async function listApplications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const { schemeId, status, assignedToId, search } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (schemeId && schemeId !== "all") where.schemeId = schemeId;
    if (status && status !== "all") where.status = status;
    if (assignedToId && assignedToId !== "all") where.assignedToId = assignedToId;

    if (search) {
      where.OR = [
        { beneficiaryName: { contains: search, mode: "insensitive" } },
        { beneficiaryPhone: { contains: search, mode: "insensitive" } },
        { applicationNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.schemeApplication.findMany({
        where,
        include: {
          scheme: { select: { name: true, department: true } },
          assignedTo: { select: { id: true, name: true } },
          ward: { select: { id: true, name: true, wardNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.schemeApplication.count({ where }),
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

export async function createApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    const scheme = await prisma.scheme.findFirst({
      where: { id: data.schemeId, tenantId, isDeleted: false },
    });
    if (!scheme) throw ApiError.notFound("Scheme not found");

    if (data.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId, isDeleted: false },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    const applicationNumber = await generateApplicationNumber(tenantId);

    const app = await prisma.schemeApplication.create({
      data: {
        tenantId,
        schemeId: data.schemeId,
        applicationNumber,
        beneficiaryName: data.beneficiaryName,
        beneficiaryPhone: data.beneficiaryPhone || null,
        beneficiaryEmail: data.beneficiaryEmail || null,
        address: data.address || null,
        wardId: data.wardId || null,
        status: "DRAFT",
        notes: data.notes || null,
        createdById: req.user!.id,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "schemes",
      recordId: app.id,
      description: `Created scheme application ${applicationNumber} for beneficiary ${app.beneficiaryName}`,
      newData: app,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Application ${applicationNumber} registered successfully`,
      data: app,
    });
  } catch (error) {
    next(error);
  }
}

export async function getApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const app = await prisma.schemeApplication.findFirst({
      where: { id: req.params.id as string, tenantId, isDeleted: false },
      include: {
        scheme: true,
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        ward: { select: { id: true, name: true, wardNumber: true } },
        documents: true,
        grievances: { select: { id: true, ticketNumber: true, subject: true, status: true } },
        tasks: { select: { id: true, taskCode: true, title: true, status: true } },
      },
    });

    if (!app) throw ApiError.notFound("Application not found");

    res.json({
      success: true,
      data: app,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appId = req.params.id as string;
    const data = req.body;

    const old = await prisma.schemeApplication.findFirst({
      where: { id: appId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Application not found");

    if (data.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId, isDeleted: false },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    const app = await prisma.schemeApplication.update({
      where: { id: appId },
      data: {
        beneficiaryName: data.beneficiaryName,
        beneficiaryPhone: data.beneficiaryPhone,
        beneficiaryEmail: data.beneficiaryEmail,
        address: data.address,
        wardId: data.wardId,
        notes: data.notes,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "schemes",
      recordId: appId,
      description: `Updated beneficiary details on application ${app.applicationNumber}`,
      oldData: old as any,
      newData: app as any,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Application updated successfully",
      data: app,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateApplicationStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appId = req.params.id as string;
    const { status, notes, rejectionReason } = req.body;

    const updated = await applyTransition(appId, tenantId, status, {
      notes,
      rejectionReason,
      user: req.user!,
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "schemes",
      recordId: appId,
      description: `Transitioned scheme application ${updated.applicationNumber} to status ${status}`,
      newData: { status, notes, rejectionReason },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Application status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function assignApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appId = req.params.id as string;
    const { assignedToId } = req.body;

    const app = await prisma.schemeApplication.findFirst({
      where: { id: appId, tenantId, isDeleted: false },
    });
    if (!app) throw ApiError.notFound("Application not found");

    // Validate assignee
    const officer = await prisma.user.findFirst({
      where: { id: assignedToId, tenantId, status: "ACTIVE" },
    });
    if (!officer) throw ApiError.badRequest("Officer must exist, belong to same tenant, and be active.");

    const updated = await prisma.schemeApplication.update({
      where: { id: appId },
      data: { assignedToId },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "schemes",
      recordId: appId,
      description: `Assigned application ${app.applicationNumber} to officer ${officer.name}`,
      newData: { assignedToId },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Application assigned to ${officer.name}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateApplicationFollowUp(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appId = req.params.id as string;
    const { followUpDate, notes } = req.body;

    const app = await prisma.schemeApplication.findFirst({
      where: { id: appId, tenantId, isDeleted: false },
    });
    if (!app) throw ApiError.notFound("Application not found");

    const updated = await prisma.schemeApplication.update({
      where: { id: appId },
      data: {
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes: notes || app.notes,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "schemes",
      recordId: appId,
      description: `Updated follow-up details on application ${app.applicationNumber}`,
      newData: { followUpDate, notes },
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

export async function createTaskFromApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appId = req.params.id as string;
    const data = req.body;

    const app = await prisma.schemeApplication.findFirst({
      where: { id: appId, tenantId, isDeleted: false },
      include: { scheme: true },
    });
    if (!app) throw ApiError.notFound("Application not found");

    const taskCode = await generateTaskCode(tenantId);

    const task = await prisma.task.create({
      data: {
        tenantId,
        taskCode,
        title: data.title || `Scheme Assistance: ${app.scheme.name}`,
        description: data.description || `Verify/Process details for application ${app.applicationNumber}`,
        priority: data.priority || "MEDIUM",
        status: "TODO",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId || app.assignedToId || req.user!.id,
        createdById: req.user!.id,
        schemeApplicationId: appId,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "schemes",
      recordId: task.id,
      description: `Created follow-up task ${taskCode} for application ${app.applicationNumber}`,
      newData: task,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Task ${taskCode} created successfully`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

export async function createGrievanceFromApplication(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appId = req.params.id as string;
    const data = req.body;

    const app = await prisma.schemeApplication.findFirst({
      where: { id: appId, tenantId, isDeleted: false },
      include: { scheme: true },
    });
    if (!app) throw ApiError.notFound("Application not found");

    const wardId = data.wardId || app.wardId;
    if (!wardId) {
      throw ApiError.badRequest("A wardId must be supplied to register a Grievance.");
    }

    const ticketNumber = await generateTicketNumber(tenantId);

    const grievance = await prisma.grievance.create({
      data: {
        tenantId,
        ticketNumber,
        subject: data.subject || `Assistance Issue: ${app.scheme.name}`,
        category: data.category || "GENERAL",
        description: data.description || `Grievance escalated from Scheme Application ${app.applicationNumber}`,
        wardId,
        assignedToId: data.assignedToId || app.assignedToId || null,
        priority: data.priority || "MEDIUM",
        source: "SCHEME_ASSISTANCE",
        complainantName: app.beneficiaryName,
        complainantPhone: app.beneficiaryPhone || null,
        complainantEmail: app.beneficiaryEmail || null,
        complainantAddress: app.address || null,
        schemeApplicationId: appId,
        createdById: req.user!.id,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "schemes",
      recordId: grievance.id,
      description: `Created grievance ${ticketNumber} from application ${app.applicationNumber}`,
      newData: grievance,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Grievance ${ticketNumber} created successfully`,
      data: grievance,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/schemes/applications/:id/documents
 */
export async function uploadApplicationDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appId = req.params.id as string;
    const { fileName, fileUrl, fileType, fileSize, documentType } = req.body;

    const app = await prisma.schemeApplication.findFirst({
      where: { id: appId, tenantId, isDeleted: false },
    });
    if (!app) throw ApiError.notFound("Application not found");

    const doc = await prisma.schemeApplicationDocument.create({
      data: {
        tenantId,
        applicationId: appId,
        fileName,
        fileUrl,
        fileType: fileType || null,
        fileSize: fileSize ? parseInt(fileSize, 10) : null,
        documentType: documentType || null,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "schemes",
      recordId: doc.id,
      description: `Uploaded document "${fileName}" to application ${app.applicationNumber}`,
      newData: doc,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Document "${fileName}" registered successfully`,
      data: doc,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/schemes/applications/:id/documents
 */
export async function listApplicationDocuments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appId = req.params.id as string;

    const docs = await prisma.schemeApplicationDocument.findMany({
      where: { applicationId: appId, tenantId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: docs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/schemes/applications/documents/:documentId
 */
export async function deleteApplicationDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const documentId = req.params.documentId as string;

    const doc = await prisma.schemeApplicationDocument.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!doc) throw ApiError.notFound("Document not found");

    await prisma.schemeApplicationDocument.delete({
      where: { id: documentId },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "schemes",
      recordId: documentId,
      description: `Permanently deleted document "${doc.fileName}" from scheme application`,
      oldData: doc,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Document "${doc.fileName}" deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
}
