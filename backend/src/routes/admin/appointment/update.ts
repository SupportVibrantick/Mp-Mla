import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { checkSlotAvailability } from "../../../services/appointment/appointmentSlot.service.js";

export async function updateAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appointmentId = req.params.id as string;
    const data = req.body;

    const old = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Appointment not found");

    if (
      old.status === "COMPLETED" ||
      old.status === "CANCELLED" ||
      old.status === "REJECTED"
    ) {
      throw ApiError.badRequest("Cannot update an appointment that is completed, cancelled, or rejected.");
    }

    const newDate = data.date ? new Date(data.date) : old.date;
    newDate.setHours(0, 0, 0, 0);
    const newStart = data.startTime || old.startTime;
    const newEnd = data.endTime || old.endTime;

    // If slot changes, re-verify slot availability
    const slotChanged =
      newDate.getTime() !== new Date(old.date).getTime() ||
      newStart !== old.startTime ||
      newEnd !== old.endTime;

    if (slotChanged) {
      const isAvailable = await checkSlotAvailability(
        tenantId,
        newDate,
        newStart,
        newEnd,
        appointmentId
      );
      if (!isAvailable) {
        throw ApiError.badRequest("The updated time slot overlaps with an existing approved/rescheduled appointment.");
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        title: data.title,
        type: data.type,
        requesterName: data.requesterName,
        requesterPhone: data.requesterPhone,
        requesterEmail: data.requesterEmail,
        date: newDate,
        startTime: newStart,
        endTime: newEnd,
        location: data.location,
        purpose: data.purpose,
        notes: data.notes,
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "appointments",
      recordId: appointment.id,
      description: `Updated appointment "${appointment.title}" (${appointment.appointmentNumber})`,
      oldData: old as any,
      newData: appointment as any,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Appointment "${appointment.title}" updated successfully`,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
}
