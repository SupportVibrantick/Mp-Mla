import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { generateAppointmentNumber } from "./helpers.js";
import { checkSlotAvailability } from "../../../services/appointment/appointmentSlot.service.js";

export async function createAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    const dateObj = new Date(data.date);
    dateObj.setHours(0, 0, 0, 0);

    // Validate slot availability
    const isAvailable = await checkSlotAvailability(
      tenantId,
      dateObj,
      data.startTime,
      data.endTime
    );
    if (!isAvailable) {
      throw ApiError.badRequest("The requested time slot overlaps with an existing approved/rescheduled appointment.");
    }

    const appointmentNumber = await generateAppointmentNumber(tenantId);

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        appointmentNumber,
        title: data.title,
        type: data.type,
        status: "PENDING",
        requesterName: data.requesterName,
        requesterPhone: data.requesterPhone || null,
        requesterEmail: data.requesterEmail || null,
        date: dateObj,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location || null,
        purpose: data.purpose || null,
        notes: data.notes || null,
        createdById: req.user!.id,
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "appointments",
      recordId: appointment.id,
      description: `Created appointment "${appointment.title}" (${appointmentNumber}) for ${appointment.requesterName}`,
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Appointment "${appointment.title}" (${appointmentNumber}) created successfully`,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}
