import prisma from "../../../lib/prisma.js";

export async function generateApplicationNumber(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `SCH-${currentYear}-`;

  const lastApp = await prisma.schemeApplication.findFirst({
    where: {
      tenantId,
      applicationNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      applicationNumber: "desc",
    },
    select: {
      applicationNumber: true,
    },
  });

  let count = 1;
  if (lastApp) {
    const parts = lastApp.applicationNumber.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      count = lastNum + 1;
    }
  }

  return `${prefix}${String(count).padStart(6, "0")}`;
}
