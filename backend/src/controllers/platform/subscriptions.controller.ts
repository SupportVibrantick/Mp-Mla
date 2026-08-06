import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { clearModuleAccessCache } from "../../middleware/requireModule.js";

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
    return subscription.plan.priceYearly / 2 / 6;

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
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      activeSubscriptionsCount,
      totalRevenueAggregate,
      pendingUpgradesCount,
      upcomingRenewalsCount,
      recentPayments,
      planDistribution,
      upcomingRenewals,
    ] = await Promise.all([
      prisma.tenantSubscription.count({
        where: { status: "ACTIVE" },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCESS" },
      }),
      prisma.planUpgradeRequest.count({
        where: { status: "PENDING" },
      }),
      prisma.tenantSubscription.count({
        where: {
          status: "ACTIVE",
          nextPaymentDue: {
            gte: new Date(),
            lte: thirtyDaysFromNow,
          },
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
          planModules: {
            include: {
              module: true,
            },
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

    const totalRevenue = totalRevenueAggregate._sum.amount || 0;

    res.status(200).json(
      ApiResponse.success({
        metrics: {
          activeSubscriptions: activeSubscriptionsCount,
          totalRevenue,
          pendingUpgrades: pendingUpgradesCount,
          upcomingRenewals: upcomingRenewalsCount,
        },
        planDistribution: planDistribution.map((plan) => ({
          id: plan.id,
          name: plan.name,
          code: plan.code,
          totalSubscriptions: plan._count.subscriptions,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          features: plan.features,
          description: plan.description,
          isPopular: plan.isPopular,
          planModules: plan.planModules,
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

async function assertTenantCanUsePlan(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw ApiError.notFound("Tenant not found");
  }

  return tenant;
}

export async function syncTenantModulesToPlan(
  tenantId: string,
  planId: string,
  tx: Prisma.TransactionClient,
) {
  // 1. Get modules associated with the plan
  const planModules = await tx.planModule.findMany({
    where: { planId },
    include: { module: true },
  });

  const planModuleIds = new Set(
    planModules.filter((pm) => pm.module.isActive).map((pm) => pm.moduleId),
  );

  // 2. Fetch the tenant's current module access
  const currentAccess = await tx.tenantModuleAccess.findMany({
    where: { tenantId },
    include: { module: true },
  });

  // 3. Deactivate/Delete modules that are not in the new plan
  const accessToRevoke = currentAccess.filter(
    (access) => !planModuleIds.has(access.moduleId),
  );

  if (accessToRevoke.length > 0) {
    await tx.tenantModuleAccess.deleteMany({
      where: {
        tenantId,
        moduleId: { in: accessToRevoke.map((a) => a.moduleId) },
      },
    });
  }

  // 4. Grant/Enable modules that are in the plan
  for (const pm of planModules) {
    if (!pm.module.isActive) continue;
    await tx.tenantModuleAccess.upsert({
      where: {
        tenantId_moduleId: {
          tenantId,
          moduleId: pm.moduleId,
        },
      },
      create: {
        tenantId,
        moduleId: pm.moduleId,
        isEnabled: true,
      },
      update: {
        isEnabled: true,
      },
    });
  }

  // 5. Clear module access cache
  clearModuleAccessCache(tenantId);
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
          planModules: {
            include: {
              module: true,
            },
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

    const { moduleIds, ...planData } = payload;

    const plan = await prisma.$transaction(async (tx) => {
      const createdPlan = await tx.subscriptionPlan.create({
        data: planData,
      });

      if (moduleIds && Array.isArray(moduleIds) && moduleIds.length > 0) {
        await tx.planModule.createMany({
          data: moduleIds.map((moduleId: string) => ({
            planId: createdPlan.id,
            moduleId,
          })),
        });
      }

      return tx.subscriptionPlan.findUnique({
        where: { id: createdPlan.id },
        include: {
          planModules: {
            include: {
              module: true,
            },
          },
        },
      });
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

    const { moduleIds, ...planData } = payload;

    const plan = await prisma.$transaction(async (tx) => {
      const updatedPlan = await tx.subscriptionPlan.update({
        where: { id },
        data: planData,
      });

      if (moduleIds && Array.isArray(moduleIds)) {
        await tx.planModule.deleteMany({
          where: { planId: id },
        });

        if (moduleIds.length > 0) {
          await tx.planModule.createMany({
            data: moduleIds.map((moduleId: string) => ({
              planId: id,
              moduleId,
            })),
          });
        }

        // Propagate changes to all active/trialing tenants on this plan
        const subscribedTenants = await tx.tenantSubscription.findMany({
          where: {
            planId: id,
            status: { in: ["ACTIVE", "TRIALING"] },
          },
        });

        for (const sub of subscribedTenants) {
          await syncTenantModulesToPlan(sub.tenantId, id, tx);
        }
      }

      return tx.subscriptionPlan.findUnique({
        where: { id },
        include: {
          planModules: {
            include: {
              module: true,
            },
          },
        },
      });
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

    await assertTenantCanUsePlan(tenantId);

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

      await syncTenantModulesToPlan(tenantId, planId, tx);

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

    await assertTenantCanUsePlan(tenantId);

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

      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: "ACTIVE" },
      });

      await tx.user.updateMany({
        where: { tenantId, status: "SUSPENDED" },
        data: { status: "ACTIVE" },
      });

      await syncTenantModulesToPlan(tenantId, planId, tx);

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
          cancelledAt: null,
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
        where: { tenantId, status: { in: ["SUSPENDED", "INACTIVE"] } },
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

export const listUpcomingRenewals = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const now = new Date();
    // upcoming renewals: status ACTIVE/TRIALING/PAST_DUE, and nextPaymentDue is not null
    const where: Prisma.TenantSubscriptionWhereInput = {
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      nextPaymentDue: { not: null },
    };

    if (search) {
      where.tenant = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    const [renewals, total] = await Promise.all([
      prisma.tenantSubscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nextPaymentDue: "asc" },
        include: {
          plan: true,
          tenant: {
            select: {
              id: true,
              name: true,
              constituencyName: true,
            },
          },
        },
      }),
      prisma.tenantSubscription.count({ where }),
    ]);

    res.status(200).json(
      ApiResponse.success({
        renewals: renewals.map((sub) => ({
          id: sub.id,
          tenantId: sub.tenant.id,
          tenantName: sub.tenant.name,
          constituencyName: sub.tenant.constituencyName,
          planName: sub.plan.name,
          billingCycle: sub.billingCycle,
          nextPaymentDue: sub.nextPaymentDue,
          amountDue:
            sub.amountDue ||
            (sub.billingCycle === "YEARLY"
              ? sub.plan.priceYearly
              : sub.plan.priceMonthly),
          status: sub.status,
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

export const listPlanUpgradeRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const where: Prisma.PlanUpgradeRequestWhereInput = {};

    if (status) where.status = status as any;
    if (search) {
      where.OR = [
        { requesterName: { contains: search, mode: "insensitive" } },
        { requesterEmail: { contains: search, mode: "insensitive" } },
        { tenant: { name: { contains: search, mode: "insensitive" } } },
        {
          tenant: {
            constituencyName: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.planUpgradeRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              constituencyName: true,
              status: true,
            },
          },
          currentPlan: true,
          requestedPlan: true,
          reviewedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.planUpgradeRequest.count({ where }),
    ]);

    res.status(200).json(
      ApiResponse.success({
        requests,
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

export const approvePlanUpgradeRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);
    const { adminNote, prorateImmediately, syncTenantLimits } = req.body;

    const request = await prisma.planUpgradeRequest.findUnique({
      where: { id },
      include: {
        currentPlan: true,
        requestedPlan: true,
        tenant: true,
      },
    });

    if (!request) {
      throw ApiError.notFound("Plan upgrade request not found");
    }

    if (request.status !== "PENDING") {
      throw ApiError.conflict("Only pending upgrade requests can be approved");
    }

    const existingSubscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId: request.tenantId },
      include: { plan: true },
    });

    if (!existingSubscription) {
      throw ApiError.notFound("Tenant subscription not found");
    }

    if (existingSubscription.status === "CANCELLED") {
      throw ApiError.conflict("Cancelled subscriptions cannot be upgraded");
    }

    if (existingSubscription.planId === request.requestedPlanId) {
      throw ApiError.conflict("Tenant is already on this subscription plan");
    }

    await assertTenantCanUsePlan(request.tenantId);

    const now = new Date();
    const effectiveBillingCycle =
      request.requestedBillingCycle || existingSubscription.billingCycle;
    const currentPeriodEnd = calculatePeriodEnd(effectiveBillingCycle, now);

    const result = await prisma.$transaction(async (tx) => {
      const updatedSubscription = await tx.tenantSubscription.update({
        where: { tenantId: request.tenantId },
        data: {
          planId: request.requestedPlanId,
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
              ? request.requestedPlan.priceYearly
              : request.requestedPlan.priceMonthly
            : existingSubscription.amountDue,
        },
        include: { plan: true, tenant: true },
      });

      await tx.tenant.update({
        where: { id: request.tenantId },
        data: { status: "ACTIVE" },
      });

      await tx.user.updateMany({
        where: { tenantId: request.tenantId, status: "SUSPENDED" },
        data: { status: "ACTIVE" },
      });

      await syncTenantModulesToPlan(
        request.tenantId,
        request.requestedPlanId,
        tx,
      );

      const reviewedRequest = await tx.planUpgradeRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNote,
          reviewedById: req.platformUser?.id,
          reviewedAt: now,
        },
        include: {
          tenant: true,
          currentPlan: true,
          requestedPlan: true,
          reviewedBy: { select: { id: true, name: true, email: true } },
        },
      });

      return { updatedSubscription, reviewedRequest };
    });

    res.status(200).json(
      ApiResponse.success(
        {
          ...result.reviewedRequest,
          subscription: result.updatedSubscription,
        },
        "Plan upgrade request approved successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const rejectPlanUpgradeRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = getParamId(req);
    const { adminNote } = req.body;

    const existing = await prisma.planUpgradeRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound("Plan upgrade request not found");
    }

    if (existing.status !== "PENDING") {
      throw ApiError.conflict("Only pending upgrade requests can be rejected");
    }

    const request = await prisma.planUpgradeRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNote,
        reviewedById: req.platformUser?.id,
        reviewedAt: new Date(),
      },
      include: {
        tenant: true,
        currentPlan: true,
        requestedPlan: true,
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });

    res
      .status(200)
      .json(ApiResponse.success(request, "Plan upgrade request rejected"));
  } catch (error) {
    next(error);
  }
};
