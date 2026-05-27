import prisma from "../../../lib/prisma.js";

export async function generateProjectCode(
  category: string,
  tenantId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${category.substring(0, 3).toUpperCase()}-${year}-`;
  const last = await prisma.project.findFirst({
    where: { tenantId, projectCode: { startsWith: prefix } },
    orderBy: { projectCode: "desc" },
    select: { projectCode: true },
  });

  let next = 1;
  if (last) {
    const parts = last.projectCode.split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}
