import prisma from "../../../lib/prisma.js";

export function getCurrentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  // Indian FY: Apr-Mar
  return m >= 3
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`;
}

export async function recalculateFundTotals(fundId: string, prismaInstance?: any) {
  const p = prismaInstance || prisma;
  const txns = await p.fundTransaction.findMany({
    where: { fundId, isDeleted: false },
  });

  let totalAllocated = 0;
  let totalReleased = 0;
  let totalUtilized = 0;

  txns.forEach((t: any) => {
    if (t.type === "ALLOCATION") totalAllocated += t.amount;
    if (t.type === "RELEASE") totalReleased += t.amount;
    if (t.type === "UTILIZATION") totalUtilized += t.amount;
  });

  await p.fund.update({
    where: { id: fundId },
    data: { totalAllocated, totalReleased, totalUtilized },
  });

  return { totalAllocated, totalReleased, totalUtilized };
}

