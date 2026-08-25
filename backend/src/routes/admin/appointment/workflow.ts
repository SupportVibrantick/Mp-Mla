import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { checkSlotAvailability } from "../../../services/appointment/appointmentSlot.service.js";

/**
 * PATCH /api/admin/appointments/:id/approve
 */
export async function approveAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appointmentId = req.params.id as string;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, isDeleted: false },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");

    if (appointment.status === "APPROVED") {
      res.json({ success: true, message: "Appointment is already approved.", data: appointment });
      return;
    }

    if (appointment.status !== "PENDING" && appointment.status !== "RESCHEDULED") {
      throw ApiError.badRequest("Only PENDING or RESCHEDULED appointments can be approved.");
    }

    // Double check slot overlap before approving
    const isAvailable = await checkSlotAvailability(
      tenantId,
      appointment.date,
      appointment.startTime,
      appointment.endTime,
      appointmentId
    );
    if (!isAvailable) {
      throw ApiError.badRequest("Cannot approve. The time slot overlaps with an existing approved/rescheduled appointment.");
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "appointments",
      recordId: appointmentId,
      description: `Approved appointment "${updated.title}" (${updated.appointmentNumber})`,
      oldData: { status: appointment.status },
      newData: { status: "APPROVED" },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Appointment approved successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/appointments/:id/reject
 */
export async function rejectAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appointmentId = req.params.id as string;
    const { reason } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, isDeleted: false },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");

    if (appointment.status !== "PENDING") {
      throw ApiError.badRequest("Only PENDING appointments can be rejected.");
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "appointments",
      recordId: appointmentId,
      description: `Rejected appointment "${updated.title}" (${updated.appointmentNumber}). Reason: ${reason}`,
      oldData: { status: appointment.status },
      newData: { status: "REJECTED", rejectionReason: reason },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Appointment rejected successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/appointments/:id/reschedule
 */
export async function rescheduleAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appointmentId = req.params.id as string;
    const { date, startTime, endTime } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, isDeleted: false },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");

    if (
      appointment.status === "COMPLETED" ||
      appointment.status === "CANCELLED"
    ) {
      throw ApiError.badRequest("Cannot reschedule completed or cancelled appointments.");
    }

    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);

    // Validate slot overlap
    const isAvailable = await checkSlotAvailability(
      tenantId,
      newDate,
      startTime,
      endTime,
      appointmentId
    );
    if (!isAvailable) {
      throw ApiError.badRequest("Cannot reschedule. The new time slot overlaps with an existing approved/rescheduled appointment.");
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "RESCHEDULED",
        date: newDate,
        startTime,
        endTime,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "appointments",
      recordId: appointmentId,
      description: `Rescheduled appointment "${updated.title}" (${updated.appointmentNumber}) to ${date} ${startTime}-${endTime}`,
      oldData: { date: appointment.date, startTime: appointment.startTime, endTime: appointment.endTime, status: appointment.status },
      newData: { date: newDate, startTime, endTime, status: "RESCHEDULED" },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Appointment rescheduled successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/appointments/:id/complete
 */
export async function completeAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appointmentId = req.params.id as string;
    const { notes } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, isDeleted: false },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");

    if (appointment.status !== "APPROVED" && appointment.status !== "RESCHEDULED") {
      throw ApiError.badRequest("Only APPROVED or RESCHEDULED appointments can be marked as completed.");
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "COMPLETED",
        notes: notes || appointment.notes,
        completedAt: new Date(),
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "appointments",
      recordId: appointmentId,
      description: `Marked appointment "${updated.title}" (${updated.appointmentNumber}) as completed`,
      oldData: { status: appointment.status },
      newData: { status: "COMPLETED", notes },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Appointment completed successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/appointments/:id/cancel
 */
export async function cancelAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appointmentId = req.params.id as string;
    const { reason } = req.body;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, isDeleted: false },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");

    if (
      appointment.status === "COMPLETED" ||
      appointment.status === "REJECTED"
    ) {
      throw ApiError.badRequest("Cannot cancel completed or rejected appointments.");
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "appointments",
      recordId: appointmentId,
      description: `Cancelled appointment "${updated.title}" (${updated.appointmentNumber}). Reason: ${reason}`,
      oldData: { status: appointment.status },
      newData: { status: "CANCELLED", cancellationReason: reason },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
