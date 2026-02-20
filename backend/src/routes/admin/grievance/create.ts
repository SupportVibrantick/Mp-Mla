import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";
import { generateTicketNumber, calculateExpectedDate } from "./helpers.js";

export const createGrievanceSchema = z.object({
  subject: z.string().min(1, "Subject required").max(500),
  category: z.string().min(1, "Category required"),
  subcategory: z.string().optional(),
  description: z.string().min(1, "Description required"),
  wardId: z.string().min(1, "Ward required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  source: z
    .enum(["OFFICE", "PHONE", "EMAIL", "ONLINE", "FIELD_VISIT", "SOCIAL_MEDIA"])
    .default("OFFICE"),
  complainantName: z.string().min(1, "Complainant name required"),
  complainantPhone: z.string().min(1, "Complainant phone required"),
  complainantEmail: z.string().email().optional().or(z.literal("")),
  complainantAddress: z.string().optional(),
  locationAddress: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  assignedDept: z.string().optional(),
  assignedToId: z.string().optional(),
  expectedResolutionDate: z.string().datetime().optional(),
});

export async function createGrievance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body;

    // Verify ward
    const ward = await prisma.ward.findUnique({
      where: { id: data.wardId },
    });
    if (!ward) throw ApiError.notFound("Ward not found");

    // Verify assigned user
    if (data.assignedToId) {
      const user = await prisma.user.findUnique({
        where: { id: data.assignedToId },
      });
      if (!user) throw ApiError.notFound("Assigned user not found");
    }

    // Verify department
    if (data.assignedDept) {
      const dept = await prisma.department.findUnique({
        where: { id: data.assignedDept },
      });
      if (!dept) throw ApiError.notFound("Department not found");
    }

    const ticketNumber = await generateTicketNumber();

    // Clean
    if (data.complainantEmail === "") delete data.complainantEmail;

    const expectedDate = data.expectedResolutionDate
      ? new Date(data.expectedResolutionDate)
      : calculateExpectedDate(data.priority);

    const grievance = await prisma.grievance.create({
      data: {
        ...data,
        ticketNumber,
        expectedResolutionDate: expectedDate,
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
        const dept = await prisma.department.findUnique({
          where: { id: data.assignedDept },
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
