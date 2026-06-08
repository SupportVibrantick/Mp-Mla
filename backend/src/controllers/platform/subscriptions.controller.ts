import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";

function getParamId(req: Request, name = "id"): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

function calculatePeriodEnd(
  billingCycle = "MONTHLY",
  startDate = new Date(),
): Date {
  const end = new Date(startDate);
  const monthsByCycle: Record<string, number> = {
    MONTHLY: 1,
    QUARTERLY: 3,
    HALF_YEARLY: 6,
    YEARLY: 12,
  };
  end.setMonth(end.getMonth() + (monthsByCycle[billingCycle] ?? 1));
  return end;
}

function getMonthlyRecurringRevenue(
  subscription?: {
    billingCycle: string;
    plan?: { priceMonthly: number; priceYearly: number } | null;
  } | null,
) {
  if (!subscription?.plan) return 0;

  if (subscription.billingCycle === "YEARLY")
    return subscription.plan.priceYearly / 12;
  if (subscription.billingCycle === "HALF_YEARLY")
    return (subscription.plan.priceYearly / 2) / 6;

  return subscription.plan.priceMonthly;
}

function getPlanRank(plan: {
  sortOrder: number;
  priceMonthly: number;
  priceYearly: number;
}) {
  return Math.max(
    plan.sortOrder || 0,
    plan.priceYearly || 0,
    plan.priceMonthly || 0,
  );
}

function getArrFromMrr(mrr: number) {
  return mrr * 12;
}

export const getSubscriptionOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      activeSubscriptions,
      allSubscriptions,
      churnedLast30Days,
      recentPayments,
      planDistribution,
      upcomingRenewals,
    ] = await Promise.all([
      prisma.tenantSubscription.findMany({
        where: { status: "ACTIVE" },
        include: { plan: true, tenant: true },
      }),
      prisma.tenantSubscription.findMany({
        include: { plan: true },
      }),
      prisma.tenantSubscription.count({
        where: {
          status: "CANCELLED",
          cancelledAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          subscription: {
            include: {
              tenant: { select: { id: true, name: true } },
              plan: { select: { name: true } },
            },
          },
        },
      }),
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { subscriptions: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.tenantSubscription.findMany({
        where: {
          status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
          nextPaymentDue: { not: null },
        },
        orderBy: { nextPaymentDue: "asc" },
        take: 6,
        include: {
          plan: true,
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const mrr = activeSubscriptions.reduce(
      (sum, subscription) => sum + getMonthlyRecurringRevenue(subscription),
      0,
    );
    const arr = getArrFromMrr(mrr);
    const churnRate30d =
      allSubscriptions.length > 0
        ? (churnedLast30Days / allSubscriptions.length) * 100
        : 0;

    res.status(200).json(
      ApiResponse.success({
        metrics: {
          activeSubscriptions: activeSubscriptions.length,
          mrr,
          arr,
          churnRate30d,
        },
        planDistribution: planDistribution.map((plan) => ({
          id: plan.id,
          name: plan.name,
          code: plan.code,
          totalSubscriptions: plan._count.subscriptions,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          maxUsers: plan.maxUsers,
          storageMB: plan.storageMB,
          features: plan.features,
          description: plan.description,
          isPopular: plan.isPopular,
        })),
        recentInvoices: recentPayments.map((payment) => ({
          id: payment.id,
          invoiceNumber:
            payment.invoiceNumber ||
            `INV-${payment.id.slice(-6).toUpperCase()}`,
          tenantName: payment.subscription.tenant.name,
          tenantId: payment.subscription.tenant.id,
          planName: payment.subscription.plan.name,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.createdAt,
          paidAt: payment.paidAt,
          invoiceUrl: payment.invoiceUrl,
        })),
        upcomingRenewals: upcomingRenewals.map((subscription) => ({
          id: subscription.id,
          tenantId: subscription.tenant.id,
          tenantName: subscription.tenant.name,
          planName: subscription.plan.name,
          billingCycle: subscription.billingCycle,
          nextPaymentDue: subscription.nextPaymentDue,
          amountDue: subscription.amountDue,
          status: subscription.status,
        })),
      }),
    );
  } catch (error) {
    next(error);
  }
};

async function assertTenantCanUsePlan(
  tenantId: string,
  plan: { maxUsers: number; storageMB: number },
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (!tenant) {
    throw ApiError.notFound("Tenant not found");
  }

  if (tenant._count.users > plan.maxUsers) {
    throw ApiError.conflict(
      `This tenant already has ${tenant._count.users} users, which exceeds the selected plan limit of ${plan.maxUsers}.`,
    );
  }

  if (tenant.storageUsedMB > plan.storageMB) {
    throw ApiError.conflict(
      `This tenant is already using ${tenant.storageUsedMB} MB, which exceeds the selected plan storage limit of ${plan.storageMB} MB.`,
    );
  }

  return tenant;
}

export const listSubscriptionPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const isActive = req.query.isActive as string;

    const where: Prisma.SubscriptionPlanWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    if (typeof isActive === "string") {
      where.isActive = isActive === "true";
    }

    const [plans, total] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { subscriptions: true },
          },
        },
      }),
      prisma.subscriptionPlan.count({ where }),
    ]);

    res.status(200).json(
      ApiResponse.success({
        plans,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const createSubscriptionPlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = req.body;

    const existing = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [{ name: payload.name }, { code: payload.code }],
      },
    });

    if (existing) {
      throw ApiError.conflict(
        "A subscription plan with this name or code already exists",
      );
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        ...payload,
      },
    });

    res
      .status(201)
      .json(
        ApiResponse.created(plan, "Subscription plan created successfully"),
      );
  } catch (error) {
    next(error);
  }
};

export const updateSubscriptionPlan = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);
    const payload = req.body;

    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound("Subscription plan not found");
    }

    if (payload.name || payload.code) {
      const duplicate = await prisma.subscriptionPlan.findFirst({
        where: {
          id: { not: id },
          OR: [
            payload.name ? { name: payload.name } : undefined,
            payload.code ? { code: payload.code } : undefined,
          ].filter(Boolean) as Prisma.SubscriptionPlanWhereInput[],
        },
      });

      if (duplicate) {
        throw ApiError.conflict(
          "Another subscription plan already uses this name or code",
        );
      }
    }

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: payload,
    });

    res
      .status(200)
      .json(
        ApiResponse.success(plan, "Subscription plan updated successfully"),
      );
  } catch (error) {
    next(error);
  }
};

export const listTenantSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const planId = req.query.planId as string;
    const tenantId = req.query.tenantId as string;
    const status = req.query.status as string;

    const where: Prisma.TenantSubscriptionWhereInput = {};

    if (planId) where.planId = planId;
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status as any;
    if (search) {
      where.tenant = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { constituencyName: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [subscriptions, total] = await Promise.all([
      prisma.tenantSubscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          plan: true,
          tenant: {
            select: {
              id: true,
              name: true,
              constituencyName: true,
              status: true,
              maxUsers: true,
              storageQuotaMB: true,
              _count: {
                select: { users: true },
              },
            },
          },
        },
      }),
      prisma.tenantSubscription.count({ where }),
    ]);

    const normalized = subscriptions.map((subscription) => ({
      ...subscription,
      monthlyRecurringRevenue: getMonthlyRecurringRevenue(subscription),
    }));

    res.status(200).json(
      ApiResponse.success({
        subscriptions: normalized,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const listInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status as any;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { transactionId: { contains: search, mode: "insensitive" } },
        {
          subscription: {
            tenant: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: {
            include: {
              tenant: { select: { id: true, name: true } },
              plan: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    res.status(200).json(
      ApiResponse.success({
        invoices: payments.map((payment) => ({
          id: payment.id,
          invoiceNumber:
            payment.invoiceNumber ||
            `INV-${payment.id.slice(-6).toUpperCase()}`,
          invoiceUrl: payment.invoiceUrl,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          transactionId: payment.transactionId,
          createdAt: payment.createdAt,
          paidAt: payment.paidAt,
          tenant: payment.subscription.tenant,
          plan: payment.subscription.plan,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getTenantSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");

    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: {
        plan: true,
        tenant: {
          select: {
            id: true,
            name: true,
            constituencyName: true,
            status: true,
            maxUsers: true,
            storageQuotaMB: true,
            storageUsedMB: true,
            _count: {
              select: { users: true },
            },
          },
        },
      },
    });

    if (!subscription) {
      throw ApiError.notFound("Tenant subscription not found");
    }

    res.status(200).json(
      ApiResponse.success({
        ...subscription,
        monthlyRecurringRevenue: getMonthlyRecurringRevenue(subscription),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const upsertTenantSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");
    const {
      planId,
      billingCycle,
      status,
      trialEndsAt,
      nextPaymentDue,
      amountDue,
      syncTenantLimits,
    } = req.body;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw ApiError.notFound("Subscription plan not found");
    }

    await assertTenantCanUsePlan(tenantId, plan);

    // Validate trial configuration
    const effectiveStatus = status || "ACTIVE";
    if (effectiveStatus === "TRIALING") {
      if (!trialEndsAt) {
        throw ApiError.badRequest(
          "trialEndsAt is required when status is TRIALING",
        );
      }
      if (new Date(trialEndsAt) <= new Date()) {
        throw ApiError.badRequest("trialEndsAt must be a future date");
      }
    }

    const now = new Date();
    const currentPeriodStart = now;
    const currentPeriodEnd =
      effectiveStatus === "TRIALING" && trialEndsAt
        ? new Date(trialEndsAt)
        : calculatePeriodEnd(billingCycle, currentPeriodStart);

    const subscription = await prisma.$transaction(async (tx) => {
      const upserted = await tx.tenantSubscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          planId,
          status: effectiveStatus,
          billingCycle,
          currentPeriodStart,
          currentPeriodEnd,
          trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
          nextPaymentDue: nextPaymentDue
            ? new Date(nextPaymentDue)
            : effectiveStatus === "TRIALING"
              ? null
              : currentPeriodEnd,
          amountDue: amountDue ?? 0,
        },
        update: {
          planId,
          status: effectiveStatus,
          billingCycle,
          currentPeriodStart,
          currentPeriodEnd,
          trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
          nextPaymentDue: nextPaymentDue
            ? new Date(nextPaymentDue)
            : effectiveStatus === "TRIALING"
              ? null
              : currentPeriodEnd,
          amountDue: amountDue ?? 0,
          cancelledAt: status === "CANCELLED" ? now : null,
          suspendedAt: status === "SUSPENDED" ? now : null,
        },
        include: {
          plan: true,
          tenant: true,
        },
      });

      if (syncTenantLimits !== false) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            maxUsers: plan.maxUsers,
            storageQuotaMB: plan.storageMB,
          },
        });
      }

      if (status === "SUSPENDED") {
        await tx.user.updateMany({
          where: { tenantId, status: "ACTIVE" },
          data: { status: "SUSPENDED" },
        });
        await tx.tenant.update({
          where: { id: tenantId },
          data: { status: "SUSPENDED" },
        });
      } else if (["ACTIVE", "TRIALING"].includes(effectiveStatus)) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { status: "ACTIVE" },
        });
      }

      return upserted;
    });

    res
      .status(200)
      .json(
        ApiResponse.success(
          subscription,
          "Tenant subscription saved successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const upgradeTenantSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");
    const { planId, billingCycle, prorateImmediately, syncTenantLimits } =
      req.body;

    const [existingSubscription, nextPlan] = await Promise.all([
      prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: {
          plan: true,
          tenant: true,
        },
      }),
      prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      }),
    ]);

    if (!existingSubscription) {
      throw ApiError.notFound("Tenant subscription not found");
    }

    if (!nextPlan) {
      throw ApiError.notFound("Target subscription plan not found");
    }

    if (existingSubscription.status === "CANCELLED") {
      throw ApiError.conflict("Cancelled subscriptions cannot be upgraded");
    }

    if (existingSubscription.planId === planId) {
      throw ApiError.conflict("Tenant is already on this subscription plan");
    }

    const currentRank = getPlanRank(existingSubscription.plan);
    const nextRank = getPlanRank(nextPlan);

    if (nextRank < currentRank) {
      throw ApiError.badRequest(
        "The selected plan looks lower than the current one. Use the general subscription update flow for downgrades.",
      );
    }

    await assertTenantCanUsePlan(tenantId, nextPlan);

    const now = new Date();
    const effectiveBillingCycle =
      billingCycle || existingSubscription.billingCycle;
    const currentPeriodEnd = calculatePeriodEnd(effectiveBillingCycle, now);

    const upgradedSubscription = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          planId,
          billingCycle: effectiveBillingCycle,
          status: "ACTIVE",
          currentPeriodStart: prorateImmediately
            ? now
            : existingSubscription.currentPeriodStart,
          currentPeriodEnd,
          nextPaymentDue: currentPeriodEnd,
          suspendedAt: null,
          cancelledAt: null,
          amountDue: prorateImmediately
            ? effectiveBillingCycle === "YEARLY"
              ? nextPlan.priceYearly
              : nextPlan.priceMonthly
            : existingSubscription.amountDue,
        },
        include: {
          plan: true,
          tenant: true,
        },
      });

      if (syncTenantLimits !== false) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            maxUsers: nextPlan.maxUsers,
            storageQuotaMB: nextPlan.storageMB,
            status: "ACTIVE",
          },
        });
      } else {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { status: "ACTIVE" },
        });
      }

      await tx.user.updateMany({
        where: { tenantId, status: "SUSPENDED" },
        data: { status: "ACTIVE" },
      });

      return updated;
    });

    res.status(200).json(
      ApiResponse.success(
        {
          ...upgradedSubscription,
          monthlyRecurringRevenue:
            getMonthlyRecurringRevenue(upgradedSubscription),
          previousPlanId: existingSubscription.planId,
        },
        "Tenant subscription upgraded successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const cancelTenantSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");
    const now = new Date();

    const existing = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      throw ApiError.notFound("Tenant subscription not found");
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          status: "CANCELLED",
          cancelledAt: now,
        },
        include: {
          plan: true,
          tenant: true,
        },
      });

      // Cascade: deactivate tenant and mark users inactive
      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: "DEACTIVATED" },
      });

      await tx.user.updateMany({
        where: { tenantId, status: "ACTIVE" },
        data: { status: "INACTIVE" },
      });

      return updated;
    });

    res
      .status(200)
      .json(
        ApiResponse.success(
          subscription,
          "Tenant subscription cancelled successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const suspendTenantSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");
    const now = new Date();

    const existing = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      throw ApiError.notFound("Tenant subscription not found");
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          status: "SUSPENDED",
          suspendedAt: now,
        },
        include: {
          plan: true,
          tenant: true,
        },
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: "SUSPENDED" },
      });

      await tx.user.updateMany({
        where: { tenantId, status: "ACTIVE" },
        data: { status: "SUSPENDED" },
      });

      return updated;
    });

    res
      .status(200)
      .json(
        ApiResponse.success(
          subscription,
          "Tenant subscription suspended successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};

export const activateTenantSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = getParamId(req, "tenantId");

    const existing = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      throw ApiError.notFound("Tenant subscription not found");
    }

    if (existing.status === "CANCELLED") {
      throw ApiError.conflict(
        "Cancelled subscriptions cannot be activated directly",
      );
    }

    // Prevent reactivating an expired trial
    if (
      existing.status === "EXPIRED" ||
      (existing.trialEndsAt && new Date() > existing.trialEndsAt)
    ) {
      throw ApiError.conflict(
        "This subscription has expired. Please assign a new plan instead of reactivating.",
      );
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenantSubscription.update({
        where: { tenantId },
        data: {
          status: "ACTIVE",
          suspendedAt: null,
        },
        include: {
          plan: true,
          tenant: true,
        },
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: "ACTIVE" },
      });

      await tx.user.updateMany({
        where: { tenantId, status: "SUSPENDED" },
        data: { status: "ACTIVE" },
      });

      return updated;
    });

    res
      .status(200)
      .json(
        ApiResponse.success(
          subscription,
          "Tenant subscription activated successfully",
        ),
      );
  } catch (error) {
    next(error);
  }
};
