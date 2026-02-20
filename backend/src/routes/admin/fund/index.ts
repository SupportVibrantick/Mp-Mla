// import { Router } from "express";
// import prisma from "../../../lib/prisma.js";
// import { requirePermission } from "../../../middleware/permission.js";
// import {
//   createAuditLog,
//   getRequestMeta,
// } from "../../../middleware/auditLog.js";
// import { ApiError } from "../../../utils/ApiError.js";
// import { validate } from "../../../middleware/validate.js";
// import { z } from "zod";
// import catchAsync from "@/utils/catchAsync.js";

// const router = Router();

// const FUND_TYPES = [
//   "MPLAD",
//   "MLALAD",
//   "STATE_FUND",
//   "CENTRAL_FUND",
//   "CSR",
//   "OTHER",
// ] as const;

// const TRANSACTION_TYPES = ["ALLOCATION", "RELEASE", "UTILIZATION"] as const;

// const createFundSchema = z.object({
//   fundType: z.enum(FUND_TYPES),
//   financialYear: z.string().regex(/^\d{4}-\d{2}$/, "Format: 2024-25"),
//   totalAllocated: z.number().min(0).default(0),
//   totalReleased: z.number().min(0).default(0),
//   totalUtilized: z.number().min(0).default(0),
// });

// const updateFundSchema = createFundSchema.partial();

// const transactionSchema = z.object({
//   amount: z.number().positive("Amount must be positive"),
//   type: z.enum(TRANSACTION_TYPES),
//   description: z.string().optional(),
//   projectId: z.string().optional(),
//   date: z.string().datetime().optional(),
// });

// // ─── List Funds ─────────────────────────────────────────

// router.get(
//   "/",
//   requirePermission("funds", "read"),
//   catchAsync(async (req, res) => {
//     const { fundType, financialYear } = req.query as Record<string, string>;

//     const where: any = {};
//     if (fundType && fundType !== "all") where.fundType = fundType;
//     if (financialYear && financialYear !== "all")
//       where.financialYear = financialYear;

//     const funds = await prisma.fund.findMany({
//       where,
//       include: {
//         _count: { select: { transactions: true } },
//       },
//       orderBy: [{ financialYear: "desc" }, { fundType: "asc" }],
//     });

//     const enriched = funds.map((f) => ({
//       ...f,
//       releasePct:
//         f.totalAllocated > 0
//           ? Math.round((f.totalReleased / f.totalAllocated) * 100)
//           : 0,
//       utilizationPct:
//         f.totalAllocated > 0
//           ? Math.round((f.totalUtilized / f.totalAllocated) * 100)
//           : 0,
//       unreleasedAmount: f.totalAllocated - f.totalReleased,
//       unusedAmount: f.totalReleased - f.totalUtilized,
//     }));

//     res.json({ success: true, data: enriched });
//   }),
// );

// // ─── Fund Stats / Overview ──────────────────────────────

// router.get(
//   "/overview",
//   requirePermission("funds", "read"),
//   catchAsync(async (req, res) => {
//     const fy = (req.query.financialYear as string) || getCurrentFY();

//     const funds = await prisma.fund.findMany({
//       where: { financialYear: fy },
//     });

//     const totalAllocated = funds.reduce((s, f) => s + f.totalAllocated, 0);
//     const totalReleased = funds.reduce((s, f) => s + f.totalReleased, 0);
//     const totalUtilized = funds.reduce((s, f) => s + f.totalUtilized, 0);

//     const byType = funds.map((f) => ({
//       fundType: f.fundType,
//       allocated: f.totalAllocated,
//       released: f.totalReleased,
//       utilized: f.totalUtilized,
//       releasePct:
//         f.totalAllocated > 0
//           ? Math.round((f.totalReleased / f.totalAllocated) * 100)
//           : 0,
//       utilizationPct:
//         f.totalAllocated > 0
//           ? Math.round((f.totalUtilized / f.totalAllocated) * 100)
//           : 0,
//     }));

//     // Available financial years
//     const allYears = await prisma.fund.findMany({
//       select: { financialYear: true },
//       distinct: ["financialYear"],
//       orderBy: { financialYear: "desc" },
//     });

//     // Recent transactions
//     const recentTransactions = await prisma.fundTransaction.findMany({
//       where: { fund: { financialYear: fy } },
//       include: {
//         fund: {
//           select: { fundType: true, financialYear: true },
//         },
//       },
//       orderBy: { date: "desc" },
//       take: 10,
//     });

//     // Monthly utilization trend
//     const allTxns = await prisma.fundTransaction.findMany({
//       where: {
//         fund: { financialYear: fy },
//         type: "UTILIZATION",
//       },
//       select: { amount: true, date: true },
//     });

//     const monthlyUtil: Record<string, number> = {};
//     allTxns.forEach((t) => {
//       const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
//       monthlyUtil[key] = (monthlyUtil[key] || 0) + t.amount;
//     });

//     const monthlyTrend = Object.entries(monthlyUtil)
//       .sort(([a], [b]) => a.localeCompare(b))
//       .map(([month, amount]) => ({ month, amount }));

//     res.json({
//       success: true,
//       data: {
//         financialYear: fy,
//         totalAllocated,
//         totalReleased,
//         totalUtilized,
//         unreleasedAmount: totalAllocated - totalReleased,
//         unusedAmount: totalReleased - totalUtilized,
//         releasePct:
//           totalAllocated > 0
//             ? Math.round((totalReleased / totalAllocated) * 100)
//             : 0,
//         utilizationPct:
//           totalAllocated > 0
//             ? Math.round((totalUtilized / totalAllocated) * 100)
//             : 0,
//         byType,
//         recentTransactions,
//         monthlyTrend,
//         financialYears: allYears.map((y) => y.financialYear),
//       },
//     });
//   }),
// );

// // ─── Get Single Fund ────────────────────────────────────

// router.get(
//   "/:id",
//   requirePermission("funds", "read"),
//   catchAsync(async (req, res) => {
//     const fund = await prisma.fund.findUnique({
//       where: { id: req.params.id },
//       include: {
//         transactions: {
//           orderBy: { date: "desc" },
//         },
//       },
//     });
//     if (!fund) throw ApiError.notFound("Fund not found");

//     // Resolve project names for utilization txns
//     const projectIds = fund.transactions
//       .map((t) => t.projectId)
//       .filter(Boolean) as string[];
//     const projects = await prisma.project.findMany({
//       where: { id: { in: projectIds } },
//       select: { id: true, name: true, projectCode: true },
//     });
//     const projMap = Object.fromEntries(projects.map((p) => [p.id, p]));

//     const txnsEnriched = fund.transactions.map((t) => ({
//       ...t,
//       project: t.projectId ? projMap[t.projectId] || null : null,
//     }));

//     res.json({
//       success: true,
//       data: {
//         ...fund,
//         transactions: txnsEnriched,
//         releasePct:
//           fund.totalAllocated > 0
//             ? Math.round((fund.totalReleased / fund.totalAllocated) * 100)
//             : 0,
//         utilizationPct:
//           fund.totalAllocated > 0
//             ? Math.round((fund.totalUtilized / fund.totalAllocated) * 100)
//             : 0,
//       },
//     });
//   }),
// );

// // ─── Create Fund ────────────────────────────────────────

// router.post(
//   "/",
//   requirePermission("funds", "create"),
//   validate(createFundSchema),
//   catchAsync(async (req, res) => {
//     const existing = await prisma.fund.findFirst({
//       where: {
//         fundType: req.body.fundType,
//         financialYear: req.body.financialYear,
//       },
//     });
//     if (existing)
//       throw ApiError.badRequest(
//         `Fund ${req.body.fundType} for ${req.body.financialYear} already exists`,
//       );

//     const fund = await prisma.fund.create({ data: req.body });

//     // Auto-create allocation transaction if amount > 0
//     if (fund.totalAllocated > 0) {
//       await prisma.fundTransaction.create({
//         data: {
//           fundId: fund.id,
//           amount: fund.totalAllocated,
//           type: "ALLOCATION",
//           description: `Initial allocation for ${fund.fundType} ${fund.financialYear}`,
//         },
//       });
//     }

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "CREATE",
//       module: "funds",
//       recordId: fund.id,
//       description: `Created fund ${fund.fundType} ${fund.financialYear} (₹${fund.totalAllocated.toLocaleString()})`,
//       newData: req.body,
//       ...getRequestMeta(req),
//     });

//     res.status(201).json({
//       success: true,
//       message: `${fund.fundType} fund for ${fund.financialYear} created`,
//       data: fund,
//     });
//   }),
// );

// // ─── Update Fund ────────────────────────────────────────

// router.put(
//   "/:id",
//   requirePermission("funds", "update"),
//   validate(updateFundSchema),
//   catchAsync(async (req, res) => {
//     const old = await prisma.fund.findUnique({
//       where: { id: req.params.id },
//     });
//     if (!old) throw ApiError.notFound("Fund not found");

//     const fund = await prisma.fund.update({
//       where: { id: req.params.id },
//       data: req.body,
//     });

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "UPDATE",
//       module: "funds",
//       recordId: fund.id,
//       description: `Updated ${fund.fundType} ${fund.financialYear}`,
//       oldData: {
//         totalAllocated: old.totalAllocated,
//         totalReleased: old.totalReleased,
//         totalUtilized: old.totalUtilized,
//       },
//       newData: req.body,
//       ...getRequestMeta(req),
//     });

//     res.json({
//       success: true,
//       message: "Fund updated",
//       data: fund,
//     });
//   }),
// );

// // ─── Delete Fund ────────────────────────────────────────

// router.delete(
//   "/:id",
//   requirePermission("funds", "delete"),
//   catchAsync(async (req, res) => {
//     const fund = await prisma.fund.findUnique({
//       where: { id: req.params.id },
//     });
//     if (!fund) throw ApiError.notFound("Fund not found");

//     await prisma.fund.delete({ where: { id: req.params.id } });

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "DELETE",
//       module: "funds",
//       recordId: fund.id,
//       description: `Deleted ${fund.fundType} ${fund.financialYear}`,
//       ...getRequestMeta(req),
//     });

//     res.json({
//       success: true,
//       message: `${fund.fundType} ${fund.financialYear} deleted`,
//     });
//   }),
// );

// // ─── Add Transaction ────────────────────────────────────

// router.post(
//   "/:id/transactions",
//   requirePermission("funds", "update"),
//   validate(transactionSchema),
//   catchAsync(async (req, res) => {
//     const fund = await prisma.fund.findUnique({
//       where: { id: req.params.id },
//     });
//     if (!fund) throw ApiError.notFound("Fund not found");

//     const { amount, type, description, projectId, date } = req.body;

//     // Validate project if provided
//     if (projectId) {
//       const project = await prisma.project.findUnique({
//         where: { id: projectId },
//       });
//       if (!project) throw ApiError.notFound("Project not found");
//     }

//     // Create transaction
//     const txn = await prisma.fundTransaction.create({
//       data: {
//         fundId: fund.id,
//         amount,
//         type,
//         description,
//         projectId: projectId || null,
//         date: date ? new Date(date) : new Date(),
//       },
//     });

//     // Update fund totals
//     const updateData: any = {};
//     if (type === "ALLOCATION")
//       updateData.totalAllocated = fund.totalAllocated + amount;
//     if (type === "RELEASE")
//       updateData.totalReleased = fund.totalReleased + amount;
//     if (type === "UTILIZATION")
//       updateData.totalUtilized = fund.totalUtilized + amount;

//     await prisma.fund.update({
//       where: { id: fund.id },
//       data: updateData,
//     });

//     await createAuditLog({
//       userId: req.user!.id,
//       action: "CREATE",
//       module: "funds",
//       recordId: txn.id,
//       description: `${type} of ₹${amount.toLocaleString()} on ${fund.fundType} ${fund.financialYear}${projectId ? ` for project` : ""}`,
//       newData: { type, amount, projectId },
//       ...getRequestMeta(req),
//     });

//     res.status(201).json({
//       success: true,
//       message: `₹${amount.toLocaleString()} ${type.toLowerCase()} recorded`,
//       data: txn,
//     });
//   }),
// );

// // ─── Delete Transaction ─────────────────────────────────

// router.delete(
//   "/:id/transactions/:txnId",
//   requirePermission("funds", "delete"),
//   catchAsync(async (req, res) => {
//     const txn = await prisma.fundTransaction.findUnique({
//       where: { id: req.params.txnId },
//     });
//     if (!txn) throw ApiError.notFound("Transaction not found");

//     // Reverse fund totals
//     const fund = await prisma.fund.findUnique({
//       where: { id: txn.fundId },
//     });
//     if (fund) {
//       const updateData: any = {};
//       if (txn.type === "ALLOCATION")
//         updateData.totalAllocated = fund.totalAllocated - txn.amount;
//       if (txn.type === "RELEASE")
//         updateData.totalReleased = fund.totalReleased - txn.amount;
//       if (txn.type === "UTILIZATION")
//         updateData.totalUtilized = fund.totalUtilized - txn.amount;
//       await prisma.fund.update({
//         where: { id: fund.id },
//         data: updateData,
//       });
//     }

//     await prisma.fundTransaction.delete({
//       where: { id: req.params.txnId },
//     });

//     res.json({
//       success: true,
//       message: "Transaction reversed and removed",
//     });
//   }),
// );

// function getCurrentFY(): string {
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = now.getMonth();
//   if (month >= 3) {
//     return `${year}-${String(year + 1).slice(2)}`;
//   }
//   return `${year - 1}-${String(year).slice(2)}`;
// }

// export default router;

import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { validate } from "../../../middleware/validate.js";
import { z } from "zod";
import catchAsync from "@/utils/catchAsync.js";

const router = Router();

// ════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════

const FUND_TYPES = [
  "MPLAD",
  "MLALAD",
  "STATE_FUND",
  "CENTRAL_FUND",
  "CSR",
  "OTHER",
] as const;

const TXN_TYPES = ["ALLOCATION", "RELEASE", "UTILIZATION"] as const;

const createFundSchema = z.object({
  fundType: z.enum(FUND_TYPES),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/, "Format: 2024-25"),
  totalAllocated: z.number().min(0).default(0),
  totalReleased: z.number().min(0).default(0),
  totalUtilized: z.number().min(0).default(0),
});

const updateFundSchema = z.object({
  totalAllocated: z.number().min(0).optional(),
  totalReleased: z.number().min(0).optional(),
  totalUtilized: z.number().min(0).optional(),
});

const transactionSchema = z.object({
  amount: z.number().positive("Amount must be > 0"),
  type: z.enum(TXN_TYPES),
  description: z.string().min(1, "Description required"),
  projectId: z.string().optional().nullable(),
  date: z.string().datetime().optional(),
});

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

function getCurrentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  // Indian FY: Apr-Mar
  return m >= 3
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`;
}

async function recalculateFundTotals(fundId: string) {
  const txns = await prisma.fundTransaction.findMany({
    where: { fundId },
  });

  let totalAllocated = 0;
  let totalReleased = 0;
  let totalUtilized = 0;

  txns.forEach((t) => {
    if (t.type === "ALLOCATION") totalAllocated += t.amount;
    if (t.type === "RELEASE") totalReleased += t.amount;
    if (t.type === "UTILIZATION") totalUtilized += t.amount;
  });

  await prisma.fund.update({
    where: { id: fundId },
    data: { totalAllocated, totalReleased, totalUtilized },
  });

  return { totalAllocated, totalReleased, totalUtilized };
}

// ════════════════════════════════════════════════════════
// LIST ALL FUNDS
// ════════════════════════════════════════════════════════

router.get(
  "/",
  requirePermission("funds", "read"),
  catchAsync(async (req, res) => {
    const { fundType, financialYear } = req.query as Record<string, string>;

    const where: any = {};
    if (fundType && fundType !== "all") where.fundType = fundType;
    if (financialYear && financialYear !== "all")
      where.financialYear = financialYear;

    const funds = await prisma.fund.findMany({
      where,
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: [{ financialYear: "desc" }, { fundType: "asc" }],
    });

    const enriched = funds.map((f) => ({
      ...f,
      releasePct:
        f.totalAllocated > 0
          ? Math.round((f.totalReleased / f.totalAllocated) * 100)
          : 0,
      utilizationPct:
        f.totalAllocated > 0
          ? Math.round((f.totalUtilized / f.totalAllocated) * 100)
          : 0,
      unreleasedAmount: Math.max(0, f.totalAllocated - f.totalReleased),
      unusedAmount: Math.max(0, f.totalReleased - f.totalUtilized),
    }));

    res.json({ success: true, data: enriched });
  }),
);

// ════════════════════════════════════════════════════════
// OVERVIEW (DASHBOARD)
// ════════════════════════════════════════════════════════

router.get(
  "/overview",
  requirePermission("funds", "read"),
  catchAsync(async (req, res) => {
    const fy = (req.query.financialYear as string) || getCurrentFY();

    // All funds for this FY
    const funds = await prisma.fund.findMany({
      where: { financialYear: fy },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { fundType: "asc" },
    });

    const totalAllocated = funds.reduce((s, f) => s + f.totalAllocated, 0);
    const totalReleased = funds.reduce((s, f) => s + f.totalReleased, 0);
    const totalUtilized = funds.reduce((s, f) => s + f.totalUtilized, 0);

    const byType = funds.map((f) => ({
      id: f.id,
      fundType: f.fundType,
      allocated: f.totalAllocated,
      released: f.totalReleased,
      utilized: f.totalUtilized,
      transactionCount: f._count.transactions,
      releasePct:
        f.totalAllocated > 0
          ? Math.round((f.totalReleased / f.totalAllocated) * 100)
          : 0,
      utilizationPct:
        f.totalAllocated > 0
          ? Math.round((f.totalUtilized / f.totalAllocated) * 100)
          : 0,
    }));

    // All FYs for dropdown
    const allYears = await prisma.fund.findMany({
      select: { financialYear: true },
      distinct: ["financialYear"],
      orderBy: { financialYear: "desc" },
    });

    // Recent transactions with project info
    const recentTxns = await prisma.fundTransaction.findMany({
      where: { fund: { financialYear: fy } },
      include: {
        fund: {
          select: {
            id: true,
            fundType: true,
            financialYear: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: 15,
    });

    // Resolve project names
    const projIds = recentTxns
      .map((t) => t.projectId)
      .filter(Boolean) as string[];
    const projects =
      projIds.length > 0
        ? await prisma.project.findMany({
            where: { id: { in: projIds } },
            select: {
              id: true,
              name: true,
              projectCode: true,
            },
          })
        : [];
    const projMap = Object.fromEntries(projects.map((p) => [p.id, p]));

    const txnsEnriched = recentTxns.map((t) => ({
      ...t,
      project: t.projectId ? projMap[t.projectId] || null : null,
    }));

    // Monthly utilization trend
    const utilTxns = await prisma.fundTransaction.findMany({
      where: {
        fund: { financialYear: fy },
        type: "UTILIZATION",
      },
      select: { amount: true, date: true },
    });

    const monthly: Record<string, number> = {};
    utilTxns.forEach((t) => {
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = (monthly[key] || 0) + t.amount;
    });

    const monthlyTrend = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));

    res.json({
      success: true,
      data: {
        financialYear: fy,
        totalAllocated,
        totalReleased,
        totalUtilized,
        unreleasedAmount: Math.max(0, totalAllocated - totalReleased),
        unusedAmount: Math.max(0, totalReleased - totalUtilized),
        releasePct:
          totalAllocated > 0
            ? Math.round((totalReleased / totalAllocated) * 100)
            : 0,
        utilizationPct:
          totalAllocated > 0
            ? Math.round((totalUtilized / totalAllocated) * 100)
            : 0,
        byType,
        recentTransactions: txnsEnriched,
        monthlyTrend,
        financialYears: allYears.map((y) => y.financialYear),
        fundCount: funds.length,
      },
    });
  }),
);

// ════════════════════════════════════════════════════════
// GET SINGLE FUND (DETAIL)
// ════════════════════════════════════════════════════════

router.get(
  "/:id",
  requirePermission("funds", "read"),
  catchAsync(async (req, res) => {
    const fund = await prisma.fund.findUnique({
      where: { id: req.params.id },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });
    if (!fund) throw ApiError.notFound("Fund not found");

    // Resolve project names
    const projIds = fund.transactions
      .map((t) => t.projectId)
      .filter(Boolean) as string[];

    const projects =
      projIds.length > 0
        ? await prisma.project.findMany({
            where: { id: { in: projIds } },
            select: {
              id: true,
              name: true,
              projectCode: true,
              ward: {
                select: { name: true, wardNumber: true },
              },
            },
          })
        : [];
    const projMap = Object.fromEntries(projects.map((p) => [p.id, p]));

    const txnsEnriched = fund.transactions.map((t) => ({
      ...t,
      project: t.projectId ? projMap[t.projectId] || null : null,
    }));

    // By type breakdown
    const byType = {
      ALLOCATION: 0,
      RELEASE: 0,
      UTILIZATION: 0,
    };
    fund.transactions.forEach((t) => {
      if (byType[t.type as keyof typeof byType] !== undefined)
        byType[t.type as keyof typeof byType] += t.amount;
    });

    // Monthly breakdown
    const monthly: Record<
      string,
      { allocation: number; release: number; utilization: number }
    > = {};
    fund.transactions.forEach((t) => {
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key])
        monthly[key] = {
          allocation: 0,
          release: 0,
          utilization: 0,
        };
      if (t.type === "ALLOCATION") monthly[key].allocation += t.amount;
      if (t.type === "RELEASE") monthly[key].release += t.amount;
      if (t.type === "UTILIZATION") monthly[key].utilization += t.amount;
    });

    const monthlyBreakdown = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    // Projects that used this fund
    const projectUsage: Record<string, { project: any; total: number }> = {};
    fund.transactions
      .filter((t) => t.projectId && t.type === "UTILIZATION")
      .forEach((t) => {
        if (!projectUsage[t.projectId!]) {
          projectUsage[t.projectId!] = {
            project: projMap[t.projectId!] || null,
            total: 0,
          };
        }
        projectUsage[t.projectId!].total += t.amount;
      });

    res.json({
      success: true,
      data: {
        ...fund,
        transactions: txnsEnriched,
        byType,
        monthlyBreakdown,
        projectUsage: Object.values(projectUsage).sort(
          (a, b) => b.total - a.total,
        ),
        releasePct:
          fund.totalAllocated > 0
            ? Math.round((fund.totalReleased / fund.totalAllocated) * 100)
            : 0,
        utilizationPct:
          fund.totalAllocated > 0
            ? Math.round((fund.totalUtilized / fund.totalAllocated) * 100)
            : 0,
        unusedAmount: Math.max(0, fund.totalReleased - fund.totalUtilized),
      },
    });
  }),
);

// ════════════════════════════════════════════════════════
// CREATE FUND
// ════════════════════════════════════════════════════════

router.post(
  "/",
  requirePermission("funds", "create"),
  validate(createFundSchema),
  catchAsync(async (req, res) => {
    const { fundType, financialYear, totalAllocated } = req.body;

    const existing = await prisma.fund.findFirst({
      where: { fundType, financialYear },
    });
    if (existing)
      throw ApiError.badRequest(
        `${fundType} for ${financialYear} already exists`,
      );

    const fund = await prisma.fund.create({
      data: {
        fundType,
        financialYear,
        totalAllocated: totalAllocated || 0,
        totalReleased: req.body.totalReleased || 0,
        totalUtilized: req.body.totalUtilized || 0,
      },
    });

    // Auto-create allocation transaction
    if (fund.totalAllocated > 0) {
      await prisma.fundTransaction.create({
        data: {
          fundId: fund.id,
          amount: fund.totalAllocated,
          type: "ALLOCATION",
          description: `Initial allocation for ${fund.fundType} FY ${fund.financialYear}`,
        },
      });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "funds",
      recordId: fund.id,
      description: `Created ${fund.fundType} ${fund.financialYear} (₹${fund.totalAllocated.toLocaleString()})`,
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `${fund.fundType} fund for ${fund.financialYear} created`,
      data: fund,
    });
  }),
);

// ════════════════════════════════════════════════════════
// UPDATE FUND (Direct edit of totals)
// ════════════════════════════════════════════════════════

router.put(
  "/:id",
  requirePermission("funds", "update"),
  validate(updateFundSchema),
  catchAsync(async (req, res) => {
    const old = await prisma.fund.findUnique({
      where: { id: req.params.id },
    });
    if (!old) throw ApiError.notFound("Fund not found");

    const fund = await prisma.fund.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "funds",
      recordId: fund.id,
      description: `Updated ${fund.fundType} ${fund.financialYear}`,
      oldData: {
        totalAllocated: old.totalAllocated,
        totalReleased: old.totalReleased,
        totalUtilized: old.totalUtilized,
      },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Fund updated",
      data: fund,
    });
  }),
);

// ════════════════════════════════════════════════════════
// DELETE FUND
// ════════════════════════════════════════════════════════

router.delete(
  "/:id",
  requirePermission("funds", "delete"),
  catchAsync(async (req, res) => {
    const fund = await prisma.fund.findUnique({
      where: { id: req.params.id },
    });
    if (!fund) throw ApiError.notFound("Fund not found");

    // Cascade deletes transactions via Prisma relation
    await prisma.fund.delete({ where: { id: req.params.id } });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "funds",
      recordId: fund.id,
      description: `Deleted ${fund.fundType} ${fund.financialYear}`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `${fund.fundType} ${fund.financialYear} deleted`,
    });
  }),
);

// ════════════════════════════════════════════════════════
// ADD TRANSACTION
// ════════════════════════════════════════════════════════

router.post(
  "/:id/transactions",
  requirePermission("funds", "update"),
  validate(transactionSchema),
  catchAsync(async (req, res) => {
    const fund = await prisma.fund.findUnique({
      where: { id: req.params.id },
    });
    if (!fund) throw ApiError.notFound("Fund not found");

    const { amount, type, description, projectId, date } = req.body;

    // Validate project exists if provided
    let projectInfo = null;
    if (projectId) {
      projectInfo = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, projectCode: true },
      });
      if (!projectInfo) throw ApiError.notFound("Project not found");
    }

    // Validation rules
    if (type === "RELEASE") {
      const newReleased = fund.totalReleased + amount;
      if (newReleased > fund.totalAllocated) {
        throw ApiError.badRequest(
          `Release (₹${newReleased.toLocaleString()}) cannot exceed allocation (₹${fund.totalAllocated.toLocaleString()})`,
        );
      }
    }

    if (type === "UTILIZATION") {
      const newUtilized = fund.totalUtilized + amount;
      if (newUtilized > fund.totalReleased) {
        throw ApiError.badRequest(
          `Utilization (₹${newUtilized.toLocaleString()}) cannot exceed released amount (₹${fund.totalReleased.toLocaleString()})`,
        );
      }
    }

    // Create transaction
    const txn = await prisma.fundTransaction.create({
      data: {
        fundId: fund.id,
        amount,
        type,
        description,
        projectId: projectId || null,
        date: date ? new Date(date) : new Date(),
      },
    });

    // Recalculate totals from all transactions
    const totals = await recalculateFundTotals(fund.id);

    // If utilization linked to project, update project budgetUsed
    if (type === "UTILIZATION" && projectId) {
      const projectTxns = await prisma.fundTransaction.findMany({
        where: { projectId, type: "UTILIZATION" },
        select: { amount: true },
      });
      const totalProjectUsed = projectTxns.reduce((s, t) => s + t.amount, 0);
      await prisma.project.update({
        where: { id: projectId },
        data: { budgetUsed: totalProjectUsed },
      });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "funds",
      recordId: txn.id,
      description: `${type} ₹${amount.toLocaleString()} on ${fund.fundType} ${fund.financialYear}${projectInfo ? ` → ${projectInfo.projectCode}` : ""}`,
      newData: {
        type,
        amount,
        projectId,
        description,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `₹${amount.toLocaleString()} ${type.toLowerCase()} recorded`,
      data: {
        transaction: txn,
        fundTotals: totals,
        project: projectInfo,
      },
    });
  }),
);

// ════════════════════════════════════════════════════════
// DELETE TRANSACTION (WITH REVERSAL)
// ════════════════════════════════════════════════════════

router.delete(
  "/:id/transactions/:txnId",
  requirePermission("funds", "delete"),
  catchAsync(async (req, res) => {
    const txn = await prisma.fundTransaction.findUnique({
      where: { id: req.params.txnId },
    });
    if (!txn) throw ApiError.notFound("Transaction not found");
    if (txn.fundId !== req.params.id)
      throw ApiError.badRequest("Transaction mismatch");

    const projectId = txn.projectId;

    await prisma.fundTransaction.delete({
      where: { id: txn.id },
    });

    // Recalculate fund totals
    const totals = await recalculateFundTotals(txn.fundId);

    // If was utilization linked to project, recalculate project
    if (txn.type === "UTILIZATION" && projectId) {
      const remaining = await prisma.fundTransaction.findMany({
        where: { projectId, type: "UTILIZATION" },
        select: { amount: true },
      });
      const totalProjectUsed = remaining.reduce((s, t) => s + t.amount, 0);
      await prisma.project.update({
        where: { id: projectId },
        data: { budgetUsed: totalProjectUsed },
      });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "funds",
      recordId: txn.id,
      description: `Reversed ${txn.type} of ₹${txn.amount.toLocaleString()}`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `₹${txn.amount.toLocaleString()} ${txn.type.toLowerCase()} reversed`,
      data: { fundTotals: totals },
    });
  }),
);

export default router;
