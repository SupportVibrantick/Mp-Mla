import { Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma.js";
import ApiResponse from "../../utils/ApiResponse.js";

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // 1. Run count and aggregate queries in parallel
    const [
      // Tenants status counts
      tenantCounts,
      // Subscription status counts
      subscriptionCounts,
      // Module counts
      totalModules,
      activeModules,
      // Plan counts
      totalPlans,
      activePlans,
      // Payment status counts
      paymentCounts,
      // Total revenue from successful payments
      revenueAggregate,
      // Recent tenant signups
      recentTenants,
      // Recent payments
      recentPayments,
      // Monthly subscriptions for MRR calculation
      activeSubscriptionsForMRR,
      // Successful payments for 6 months trend
      successfulPaymentsTrend,
    ] = await Promise.all([
      // Tenant Status Counts
      prisma.tenant.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Subscription Status Counts
      prisma.tenantSubscription.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Modules Counts
      prisma.module.count(),
      prisma.module.count({ where: { isActive: true } }),

      // Plans Counts
      prisma.subscriptionPlan.count(),
      prisma.subscriptionPlan.count({ where: { isActive: true } }),

      // Payment Status Counts
      prisma.payment.groupBy({
        by: ["status"],
        _count: true,
      }),

      // Total Revenue
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "SUCCESS",
        },
      }),

      // Recent Tenants
      prisma.tenant.findMany({
        select: {
          id: true,
          name: true,
          constituencyName: true,
          representativeName: true,
          status: true,
          createdAt: true,
          subscription: {
            select: {
              plan: {
                select: {
                  name: true,
                },
              },
            },
          },
          constituencies: {
            select: {
              type: true,
              code: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),

      // Recent Payments
      prisma.payment.findMany({
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          paidAt: true,
          subscription: {
            select: {
              tenant: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),

      // Subscriptions for MRR
      prisma.tenantSubscription.findMany({
        where: {
          status: "ACTIVE",
        },
        select: {
          billingCycle: true,
          plan: {
            select: {
              priceMonthly: true,
              priceYearly: true,
            },
          },
        },
      }),

      // Trend Payments
      prisma.payment.findMany({
        where: {
          status: "SUCCESS",
          createdAt: {
            gte: sixMonthsAgo,
          },
        },
        select: {
          amount: true,
          createdAt: true,
          paidAt: true,
        },
      }),
    ]);

    // 2. Format tenant status counts
    const tenants = {
      total: tenantCounts.reduce((acc, curr) => acc + curr._count, 0),
      active: tenantCounts.find((t) => t.status === "ACTIVE")?._count || 0,
      suspended: tenantCounts.find((t) => t.status === "SUSPENDED")?._count || 0,
      deactivated: tenantCounts.find((t) => t.status === "DEACTIVATED")?._count || 0,
    };

    // 3. Format subscription status counts
    const subscriptions = {
      total: subscriptionCounts.reduce((acc, curr) => acc + curr._count, 0),
      active: subscriptionCounts.find((s) => s.status === "ACTIVE")?._count || 0,
      trialing: subscriptionCounts.find((s) => s.status === "TRIALING")?._count || 0,
      pastDue: subscriptionCounts.find((s) => s.status === "PAST_DUE")?._count || 0,
      suspended: subscriptionCounts.find((s) => s.status === "SUSPENDED")?._count || 0,
      cancelled: subscriptionCounts.find((s) => s.status === "CANCELLED")?._count || 0,
    };

    // 4. Format payment counts
    const payments = {
      total: paymentCounts.reduce((acc, curr) => acc + curr._count, 0),
      success: paymentCounts.find((p) => p.status === "SUCCESS")?._count || 0,
      pending: paymentCounts.find((p) => p.status === "PENDING")?._count || 0,
      failed: paymentCounts.find((p) => p.status === "FAILED")?._count || 0,
      refunded: paymentCounts.find((p) => p.status === "REFUNDED")?._count || 0,
    };

    // 5. Calculate MRR
    let mrr = 0;
    activeSubscriptionsForMRR.forEach((sub) => {
      if (!sub.plan) return;
      if (sub.billingCycle === "YEARLY") {
        mrr += sub.plan.priceYearly / 12;
      } else if (sub.billingCycle === "HALF_YEARLY") {
        mrr += sub.plan.priceYearly / 12;
      } else if (sub.billingCycle === "QUARTERLY") {
        mrr += (sub.plan.priceMonthly * 3) / 3;
      } else {
        mrr += sub.plan.priceMonthly;
      }
    });

    // 6. Calculate 6-month monthly revenue trend
    const monthlyRevenue: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue[key] = 0;
    }

    successfulPaymentsTrend.forEach((pay) => {
      const date = pay.paidAt || pay.createdAt;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyRevenue[key] !== undefined) {
        monthlyRevenue[key] += pay.amount;
      }
    });

    const revenueTrend = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        revenue: amount,
      }));

    // 7. Plan distribution (Group active tenants by subscription plan)
    const activeTenantsWithPlans = await prisma.tenant.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        subscription: {
          select: {
            plan: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const planCountsMap: Record<string, number> = {};
    activeTenantsWithPlans.forEach((t) => {
      const planName = t.subscription?.plan?.name || "No Plan";
      planCountsMap[planName] = (planCountsMap[planName] || 0) + 1;
    });

    const planDistribution = Object.entries(planCountsMap).map(([name, value]) => ({
      name,
      value,
    }));

    const mappedRecentTenants = recentTenants.map((t: any) => {
      const constituency = t.constituencies?.[0];
      return {
        ...t,
        constituencies: undefined,
        constituencyType: constituency?.type || "ASSEMBLY",
        constituencyCode: constituency?.code || null,
      };
    });

    res.status(200).json(
      ApiResponse.success({
        summary: {
          tenants,
          subscriptions,
          payments,
          totalModules,
          activeModules,
          totalPlans,
          activePlans,
          totalRevenue: revenueAggregate._sum.amount || 0,
          monthlyRecurringRevenue: mrr,
        },
        recentTenants: mappedRecentTenants,
        recentPayments,
        charts: {
          revenueTrend,
          planDistribution,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};
