import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { generateTicketNumber } from "../grievance/helpers.js";
import { validateAssignment } from "../../../services/task/taskAssignment.service.js";

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

export async function createGrievanceFromToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const tokenId = req.params.tokenId as string;
    const data = req.body;

    const [session, token] = await Promise.all([
      prisma.janataDarbarSession.findFirst({ where: { id: sessionId, tenantId, isDeleted: false } }),
      prisma.janataDarbarToken.findFirst({ where: { id: tokenId, sessionId, tenantId } }),
    ]);

    if (!session) throw ApiError.notFound("Session not found");
    if (!token) throw ApiError.notFound("Token not found");

    const wardId = data.wardId || token.wardId;
    if (!wardId) {
      throw ApiError.badRequest("A wardId must be provided in either the token registry or the request body.");
    }

    // Validate ward
    const ward = await prisma.ward.findFirst({ where: { id: wardId, tenantId, isDeleted: false } });
    if (!ward) throw ApiError.notFound("Ward not found");

    // Validate department / assignee if provided
    if (data.assignedToId || data.departmentId) {
      await validateAssignment(tenantId, data.assignedToId || "", data.departmentId || "");
    }

    const ticketNumber = await generateTicketNumber(tenantId);

    const grievance = await prisma.grievance.create({
      data: {
        tenantId,
        ticketNumber,
        subject: data.subject || token.purpose || `Janata Darbar complaint from ${token.visitorName}`,
        category: data.category || "GENERAL",
        subcategory: data.subcategory || null,
        description: data.description || token.notes || token.purpose || `Registered via Janata Darbar Session ${session.sessionNumber}`,
        wardId,
        assignedToId: data.assignedToId || null,
        departmentId: data.departmentId || null,
        priority: data.priority || "MEDIUM",
        source: "JANATA_DARBAR",
        complainantName: token.visitorName,
        complainantPhone: token.phone || null,
        complainantEmail: token.phone ? null : token.visitorName.toLowerCase().replace(/\s+/g, "") + "@gmail.com", // dummy email if none
        complainantAddress: token.address || null,
        janataSessionId: sessionId,
        janataTokenId: tokenId,
        createdById: req.user!.id,
      },
    });

    // Update token status to REFERRED
    await prisma.janataDarbarToken.update({
      where: { id: tokenId },
      data: {
        status: "REFERRED",
        assignedOfficerId: data.assignedToId || null,
        departmentId: data.departmentId || null,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "janata_darbar",
      recordId: grievance.id,
      description: `Created grievance ${ticketNumber} from token ${token.tokenNumber}`,
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

export async function createTaskFromToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const sessionId = req.params.id as string;
    const tokenId = req.params.tokenId as string;
    const data = req.body;

    const [session, token] = await Promise.all([
      prisma.janataDarbarSession.findFirst({ where: { id: sessionId, tenantId, isDeleted: false } }),
      prisma.janataDarbarToken.findFirst({ where: { id: tokenId, sessionId, tenantId } }),
    ]);

    if (!session) throw ApiError.notFound("Session not found");
    if (!token) throw ApiError.notFound("Token not found");

    // Validate assignee department alignment
    await validateAssignment(tenantId, data.assignedToId, data.departmentId);

    // Validate department exists if provided
    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, tenantId, isDeleted: false, isActive: true },
      });
      if (!dept) throw ApiError.notFound("Active department not found");
    }

    const taskCode = await generateTaskCode(tenantId);

    const task = await prisma.task.create({
      data: {
        tenantId,
        taskCode,
        title: data.title,
        description: data.description || `Follow-up task for token ${token.tokenNumber}`,
        priority: data.priority || "MEDIUM",
        status: "TODO",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId,
        createdById: req.user!.id,
        departmentId: data.departmentId || null,
        janataSessionId: sessionId,
        janataTokenId: tokenId,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "janata_darbar",
      recordId: task.id,
      description: `Created follow-up task ${taskCode} from token ${token.tokenNumber}`,
      newData: task,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Follow-up task ${taskCode} created successfully`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}
