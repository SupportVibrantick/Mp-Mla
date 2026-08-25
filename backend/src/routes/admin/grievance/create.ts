import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { generateTicketNumber } from "./helpers.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { calculateGrievanceSla } from "../../../services/grievance/sla.service.js";

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

    // Verify department
    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, tenantId, isDeleted: false, isActive: true },
      });
      if (!dept) throw ApiError.notFound("Active department not found");
    }

    // Verify assigned user
    if (data.assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: data.assignedToId, tenantId, status: "ACTIVE" },
      });
      if (!user) throw ApiError.notFound("Active assigned user not found");
      if (data.departmentId && user.departmentId !== data.departmentId) {
        throw ApiError.badRequest("Assigned user does not belong to the selected department");
      }
    }

    const ticketNumber = await generateTicketNumber(tenantId);

    // Calculate SLA parameters
    const slaDetails = await calculateGrievanceSla(
      tenantId,
      data.departmentId,
      data.priority || "MEDIUM",
      new Date()
    );

    // Clean
    if (data.complainantEmail === "") delete data.complainantEmail;

    const grievance = await prisma.grievance.create({
      data: {
        ...data,
        tenantId,
        ticketNumber,
        slaStartedAt: slaDetails.slaStartedAt,
        slaHoursApplied: slaDetails.slaHoursApplied,
        expectedResolutionDate: slaDetails.expectedResolutionDate,
        createdById: req.user!.id,
        // Create initial timeline
        timeline: {
          create: {
            tenantId,
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
    if (data.assignedToId || data.departmentId) {
      const parts: string[] = [];
      if (data.assignedToId && grievance.assignedTo) {
        parts.push(`to ${grievance.assignedTo.name}`);
      }
      if (data.departmentId) {
        const dept = await prisma.department.findFirst({
          where: { id: data.departmentId, tenantId },
          select: { name: true },
        });
        if (dept) parts.push(`(Dept: ${dept.name})`);
      }

      await prisma.grievanceTimeline.create({
        data: {
          tenantId,
          grievanceId: grievance.id,
          action: "ASSIGNMENT",
          comment: `Assigned ${parts.join(" ")}`,
          changedBy: req.user!.name || req.user!.email,
          changedById: req.user!.id,
          metadata: {
            assignedToId: data.assignedToId,
            departmentId: data.departmentId,
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
        departmentId: grievance.departmentId,
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
