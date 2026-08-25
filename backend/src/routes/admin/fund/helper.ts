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

/**
 * Recalculate a project's budget fields (budgetSanctioned/budgetReleased/budgetUsed)
 * from all linked fund transactions within the same tenant.
 * Accepts an optional prisma transaction client for atomicity.
 */
export async function recalcProjectBudget(
  projectId: string,
  tenantId: string,
  prismaInstance?: any
) {
  const p = prismaInstance || prisma;
  const projTxns = await p.fundTransaction.findMany({
    where: {
      projectId,
      isDeleted: false,
      fund: { tenantId },
    },
    select: { amount: true, type: true },
  });

  let budgetSanctioned = 0;
  let budgetReleased = 0;
  let budgetUsed = 0;

  projTxns.forEach((t: any) => {
    if (t.type === "ALLOCATION") budgetSanctioned += t.amount;
    else if (t.type === "RELEASE") budgetReleased += t.amount;
    else if (t.type === "UTILIZATION") budgetUsed += t.amount;
  });

  await p.project.update({
    where: { id: projectId },
    data: { budgetSanctioned, budgetReleased, budgetUsed },
  });

  return { budgetSanctioned, budgetReleased, budgetUsed };
}