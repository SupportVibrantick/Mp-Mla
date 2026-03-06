// import prisma from "../../../lib/prisma.js";

// import { ApiError } from "../../../utils/ApiError.js";

// import { buildPagination, parsePagination } from "../../../utils/helpers.js";
// import catchAsync from "@/utils/catchAsync.js";

// // ─── List Schemes ───────────────────────────────────────
// export const getScheme = catchAsync(async (req, res) => {
//   const { page, limit, skip } = parsePagination(req.query);
//   const { status, level, department, search } = req.query as Record<
//     string,
//     string
//   >;

//   const where: any = {};
//   if (status && status !== "all") where.status = status;
//   if (level && level !== "all") where.level = level;
//   if (department && department !== "all") where.department = department;
//   if (search) {
//     where.OR = [
//       { name: { contains: search, mode: "insensitive" } },
//       {
//         description: {
//           contains: search,
//           mode: "insensitive",
//         },
//       },
//     ];
//   }

//   const [data, total] = await Promise.all([
//     prisma.scheme.findMany({
//       where,
//       include: {
//         beneficiaries: {
//           select: {
//             beneficiaryCount: true,
//             targetCount: true,
//             amountDisbursed: true,
//           },
//         },
//       },
//       orderBy: { createdAt: "desc" },
//       skip,
//       take: limit,
//     }),
//     prisma.scheme.count({ where }),
//   ]);

//   // Resolve department names
//   const deptIds = [...new Set(data.map((s) => s.department))];
//   const depts = await prisma.department.findMany({
//     where: { id: { in: deptIds } },
//     select: { id: true, name: true },
//   });
//   const deptMap = Object.fromEntries(depts.map((d) => [d.id, d.name]));

//   const enriched = data.map((s) => {
//     const totalBeneficiaries = s.beneficiaries.reduce(
//       (sum, b) => sum + b.beneficiaryCount,
//       0,
//     );
//     const totalTarget = s.beneficiaries.reduce(
//       (sum, b) => sum + b.targetCount,
//       0,
//     );
//     const totalDisbursed = s.beneficiaries.reduce(
//       (sum, b) => sum + b.amountDisbursed,
//       0,
//     );
//     const coverage =
//       totalTarget > 0
//         ? Math.round((totalBeneficiaries / totalTarget) * 100)
//         : 0;

//     return {
//       ...s,
//       beneficiaries: undefined,
//       departmentName: deptMap[s.department] || s.department,
//       totalBeneficiaries,
//       totalTarget,
//       totalDisbursed,
//       coverage,
//       wardCount: s.beneficiaries.length,
//     };
//   });

//   res.json({
//     success: true,
//     data: enriched,
//     pagination: buildPagination(total, page, limit),
//   });
// });

// // ─── Scheme Stats ───────────────────────────────────────

// export const getSchemeStats = catchAsync(async (req, res) => {
//   const [total, byStatus, byLevel, beneficiaryAgg, topSchemes] =
//     await Promise.all([
//       prisma.scheme.count(),
//       prisma.scheme.groupBy({
//         by: ["status"],
//         _count: true,
//       }),
//       prisma.scheme.groupBy({
//         by: ["level"],
//         _count: true,
//         _sum: { budget: true },
//       }),
//       prisma.schemeBeneficiary.aggregate({
//         _sum: {
//           beneficiaryCount: true,
//           targetCount: true,
//           amountDisbursed: true,
//         },
//       }),
//       prisma.scheme.findMany({
//         where: { status: "ACTIVE" },
//         select: {
//           id: true,
//           name: true,
//           budget: true,
//           beneficiaries: {
//             select: {
//               beneficiaryCount: true,
//               amountDisbursed: true,
//             },
//           },
//         },
//         orderBy: { budget: "desc" },
//         take: 5,
//       }),
//     ]);

//   const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
//   const totalBudget = byLevel.reduce((s, l) => s + (l._sum.budget || 0), 0);

//   const topEnriched = topSchemes.map((s) => ({
//     id: s.id,
//     name: s.name,
//     budget: s.budget,
//     beneficiaries: s.beneficiaries.reduce(
//       (sum, b) => sum + b.beneficiaryCount,
//       0,
//     ),
//     disbursed: s.beneficiaries.reduce((sum, b) => sum + b.amountDisbursed, 0),
//   }));

//   res.json({
//     success: true,
//     data: {
//       total,
//       active: sm["ACTIVE"] || 0,
//       expired: sm["EXPIRED"] || 0,
//       upcoming: sm["UPCOMING"] || 0,
//       suspended: sm["SUSPENDED"] || 0,
//       totalBudget,
//       totalBeneficiaries: beneficiaryAgg._sum.beneficiaryCount || 0,
//       totalTarget: beneficiaryAgg._sum.targetCount || 0,
//       totalDisbursed: beneficiaryAgg._sum.amountDisbursed || 0,
//       overallCoverage:
//         (beneficiaryAgg._sum.targetCount || 0) > 0
//           ? Math.round(
//               ((beneficiaryAgg._sum.beneficiaryCount || 0) /
//                 (beneficiaryAgg._sum.targetCount || 1)) *
//                 100,
//             )
//           : 0,
//       byLevel: byLevel.map((l) => ({
//         level: l.level,
//         count: l._count,
//         budget: l._sum.budget || 0,
//       })),
//       topSchemes: topEnriched,
//     },
//   });
// });

// // ─── Get Single Scheme ──────────────────────────────────
// export const getSingleScheme = catchAsync(async (req, res) => {
//   const schemeId = req.params.id as string;
//   const scheme = await prisma.scheme.findUnique({
//     where: { id: schemeId },
//     include: {
//       beneficiaries: {
//         include: {
//           ward: {
//             select: {
//               id: true,
//               name: true,
//               wardNumber: true,
//             },
//           },
//         },
//         orderBy: { ward: { wardNumber: "asc" } },
//       },
//     },
//   });
//   if (!scheme) throw ApiError.notFound("Scheme not found");

//   let departmentName = scheme.department;
//   const dept = await prisma.department.findUnique({
//     where: { id: scheme.department },
//     select: { name: true, code: true },
//   });
//   if (dept) departmentName = `${dept.name} (${dept.code})`;

//   const totalBeneficiaries = scheme.beneficiaries.reduce(
//     (s, b) => s + b.beneficiaryCount,
//     0,
//   );
//   const totalTarget = scheme.beneficiaries.reduce(
//     (s, b) => s + b.targetCount,
//     0,
//   );
//   const totalDisbursed = scheme.beneficiaries.reduce(
//     (s, b) => s + b.amountDisbursed,
//     0,
//   );
//   const coverage =
//     totalTarget > 0 ? Math.round((totalBeneficiaries / totalTarget) * 100) : 0;

//   res.json({
//     success: true,
//     data: {
//       ...scheme,
//       departmentName,
//       totalBeneficiaries,
//       totalTarget,
//       totalDisbursed,
//       coverage,
//     },
//   });
// });
