import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

export async function deleteAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const appointmentId = req.params.id as string;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });
    if (!appointment) throw ApiError.notFound("Appointment not found");
    if (appointment.isDeleted) throw ApiError.badRequest("Appointment is already deleted.");

    // Archive in recycle bin
    await archiveToRecycleBin({
      tenantId,
      module: "appointments",
      entityType: "appointment" as any,
      recordId: appointmentId,
      recordLabel: `${appointment.appointmentNumber} - ${appointment.title}`,
      payload: appointment,
      deletedById: req.user!.id,
    });

    // Soft delete
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { isDeleted: true },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "appointments",
      recordId: appointmentId,
      description: `Soft-deleted appointment "${appointment.title}" (${appointment.appointmentNumber})`,
      oldData: { title: appointment.title, isDeleted: false },
      newData: { isDeleted: true },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Appointment "${appointment.title}" (${appointment.appointmentNumber}) successfully moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
