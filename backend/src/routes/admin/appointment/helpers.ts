import prisma from "../../../lib/prisma.js";

/**
 * Generates a unique appointment number for the given tenant.
 * Format: APT-YYYY-000001
 */
export async function generateAppointmentNumber(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `APT-${currentYear}-`;

  const lastAppointment = await prisma.appointment.findFirst({
    where: {
      tenantId,
      appointmentNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      appointmentNumber: "desc",
    },
    select: {
      appointmentNumber: true,
    },
  });

  let count = 1;
  if (lastAppointment) {
    const parts = lastAppointment.appointmentNumber.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      count = lastNum + 1;
    }
  }

  return `${prefix}${String(count).padStart(6, "0")}`;
}
