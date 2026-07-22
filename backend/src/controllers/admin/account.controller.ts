import { Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma.js";
import { requireTenantId } from "../../utils/tenant.js";
import { getTenantUsage } from "../../lib/quota.js";
import { getPlatformSetting } from "../../lib/settings.js";
import { ApiError } from "../../utils/ApiError.js";

function getPlanAmount(plan: { priceMonthly: number; priceYearly: number }, cycle?: string | null) {
  return cycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
}

export async function getSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = requireTenantId(req);
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            code: true,
            priceMonthly: true,
            priceYearly: true,
            maxUsers: true,
            maxWards: true,
            storageMB: true,
            features: true,
          },
        },
      },
    });

    if (!subscription) {
      throw ApiError.notFound("No subscription found for this organization");
    }

    const supportEmail = await getPlatformSetting("support_email");

    res.json({
      success: true,
      data: {
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        nextPaymentDue: subscription.nextPaymentDue,
        amountDue: subscription.amountDue,
        lastPaymentAt: subscription.lastPaymentAt,
        plan: subscription.plan,
        supportEmail,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvoices(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = requireTenantId(req);
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: { id: true },
    });
    if (!subscription) {
      res.json({ success: true, data: [] });
      return;
    }

    const payments = await prisma.payment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        taxAmount: true,
        gstNumber: true,
        currency: true,
        status: true,
        invoiceNumber: true,
        invoiceUrl: true,
        method: true,
        paidAt: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
}

export async function getUsage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = requireTenantId(req);
    const usage = await getTenantUsage(tenantId);
    res.json({ success: true, data: usage });
  } catch (error) {
    next(error);
  }
}

export async function getAvailablePlans(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = requireTenantId(req);
    const [subscription, plans, pendingRequest] = await Promise.all([
      prisma.tenantSubscription.findUnique({
        where: { tenantId },
        select: { planId: true, billingCycle: true },
      }),
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }],
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          priceMonthly: true,
          priceYearly: true,
          maxUsers: true,
          maxWards: true,
          storageMB: true,
          features: true,
          isPopular: true,
          sortOrder: true,
          planModules: {
            include: {
              module: {
                select: { id: true, code: true, name: true, category: true },
              },
            },
          },
        },
      }),
      prisma.planUpgradeRequest.findFirst({
        where: { tenantId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
          requestedPlan: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        plans,
        currentPlanId: subscription?.planId ?? null,
        currentBillingCycle: subscription?.billingCycle ?? null,
        pendingRequest,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createPlanUpgradeRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantId = requireTenantId(req);
    const {
      requestedPlanId,
      requestedBillingCycle,
      requesterName,
      requesterEmail,
      requesterPhone,
      tenantNote,
    } = req.body;

    const [subscription, requestedPlan, pendingRequest] = await Promise.all([
      prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: { plan: true },
      }),
      prisma.subscriptionPlan.findUnique({
        where: { id: requestedPlanId },
      }),
      prisma.planUpgradeRequest.findFirst({
        where: { tenantId, status: "PENDING" },
      }),
    ]);

    if (!subscription) {
      throw ApiError.notFound("No subscription found for this organization");
    }

    if (!requestedPlan || !requestedPlan.isActive) {
      throw ApiError.notFound("Requested subscription plan is not available");
    }

    if (subscription.planId === requestedPlanId) {
      throw ApiError.conflict("You are already using this plan");
    }

    if (pendingRequest) {
      throw ApiError.conflict("You already have a pending upgrade request");
    }

    const request = await prisma.planUpgradeRequest.create({
      data: {
        tenantId,
        currentPlanId: subscription.planId,
        requestedPlanId,
        requestedBillingCycle: requestedBillingCycle || subscription.billingCycle,
        requesterName: requesterName || req.user?.name,
        requesterEmail: requesterEmail || req.user?.email,
        requesterPhone,
        tenantNote,
      },
      include: {
        currentPlan: { select: { id: true, name: true, code: true } },
        requestedPlan: { select: { id: true, name: true, code: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: `Upgrade request submitted for ${requestedPlan.name}. Platform team will review it.`,
      data: {
        ...request,
        requestedAmount: getPlanAmount(
          requestedPlan,
          request.requestedBillingCycle,
        ),
      },
    });
  } catch (error) {
    next(error);
  }
}
