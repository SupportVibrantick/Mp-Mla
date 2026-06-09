import { Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma.js";
import { requireTenantId } from "../../utils/tenant.js";
import { getTenantUsage } from "../../lib/quota.js";
import { getPlatformSetting } from "../../lib/settings.js";
import { ApiError } from "../../utils/ApiError.js";

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
