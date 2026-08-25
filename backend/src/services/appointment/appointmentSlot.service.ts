import prisma from "../../lib/prisma.js";

/**
 * Checks if the requested time slot is available (no overlaps with approved or rescheduled appointments).
 * Overlap formula: start1 < end2 && start2 < end1
 */
export async function checkSlotAvailability(
  tenantId: string,
  date: Date | string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string
): Promise<boolean> {
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);

  const overlaps = await prisma.appointment.findMany({
    where: {
      tenantId,
      date: dateObj,
      status: { in: ["APPROVED", "RESCHEDULED"] },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      isDeleted: false,
    },
    select: { id: true },
  });

  return overlaps.length === 0;
}
