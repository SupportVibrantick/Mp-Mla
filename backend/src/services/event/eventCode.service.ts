import prisma from "../../lib/prisma.js";

/**
 * Generates a unique event code for the given tenant.
 * Format: EVT-YYYY-000001
 */
export async function generateEventCode(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `EVT-${currentYear}-`;

  const lastEvent = await prisma.event.findFirst({
    where: {
      tenantId,
      eventCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      eventCode: "desc",
    },
    select: {
      eventCode: true,
    },
  });

  let count = 1;
  if (lastEvent) {
    const parts = lastEvent.eventCode.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      count = lastNum + 1;
    }
  }

  return `${prefix}${String(count).padStart(6, "0")}`;
}
