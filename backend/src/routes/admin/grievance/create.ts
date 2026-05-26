import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { generateTicketNumber } from "./helpers.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function createGrievance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    // Verify ward
    const ward = await prisma.ward.findFirst({
      where: { id: data.wardId, tenantId },
    });
    if (!ward) throw ApiError.notFound("Ward not found");

    // Verify assigned user
    if (data.assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: data.assignedToId, tenantId },
      });
      if (!user) throw ApiError.notFound("Assigned user not found");
    }

    // Verify department
    if (data.assignedDept) {
      const dept = await prisma.department.findFirst({
        where: { id: data.assignedDept, tenantId },
      });
      if (!dept) throw ApiError.notFound("Department not found");
    }

    const ticketNumber = await generateTicketNumber(tenantId);

    // Clean
    if (data.complainantEmail === "") delete data.complainantEmail;


    const grievance = await prisma.grievance.create({
      data: {
        ...data,
        tenantId,
        ticketNumber,
        createdById: req.user!.id,
        // Create initial timeline
        timeline: {
          create: {
            action: "CREATED",
            toStatus: "OPEN",
            comment: `Grievance filed via ${(data.source || "OFFICE").toLowerCase().replace("_", " ")}`,
            changedBy: req.user!.name || req.user!.email,
            changedById: req.user!.id,
          },
        },
      },
      include: {
        ward: {
          select: { id: true, name: true, wardNumber: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        timeline: true,
      },
    });

    // If assigned, add assignment timeline entry
    if (data.assignedToId || data.assignedDept) {
      const parts: string[] = [];
      if (data.assignedToId && grievance.assignedTo) {
        parts.push(`to ${grievance.assignedTo.name}`);
      }
      if (data.assignedDept) {
        const dept = await prisma.department.findFirst({
          where: { id: data.assignedDept, tenantId },
          select: { name: true },
        });
        if (dept) parts.push(`(Dept: ${dept.name})`);
      }

      await prisma.grievanceTimeline.create({
        data: {
          grievanceId: grievance.id,
          action: "ASSIGNMENT",
          comment: `Assigned ${parts.join(" ")}`,
          changedBy: req.user!.name || req.user!.email,
          changedById: req.user!.id,
          metadata: {
            assignedToId: data.assignedToId,
            assignedDept: data.assignedDept,
          },
        },
      });
    }

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "grievances",
      recordId: grievance.id,
      description: `Created grievance ${ticketNumber} — "${grievance.subject}"`,
      newData: {
        ticketNumber,
        category: grievance.category,
        priority: grievance.priority,
        wardId: grievance.wardId,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Grievance ${ticketNumber} created`,
      data: grievance,
    });
  } catch (error) {
    next(error);
  }
}
