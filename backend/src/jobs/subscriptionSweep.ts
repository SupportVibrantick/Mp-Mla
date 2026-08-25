import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import logger from "../utils/logger.js";
import { getPlatformSetting } from "../lib/settings.js";
import { sendEmail } from "../lib/email.js";

const GRACE_DAYS = 7;

function addBillingPeriod(start: Date, cycle: string): Date {
  const end = new Date(start);
  const months: Record<string, number> = {
    MONTHLY: 1,
    QUARTERLY: 3,
    HALF_YEARLY: 6,
    YEARLY: 12,
  };
  end.setMonth(end.getMonth() + (months[cycle] ?? 1));
  return end;
}

function generateInvoiceNumber(): string {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${date}-${rand}`;
}

async function advanceSubscriptionPeriod(
  subscriptionId: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const sub = await client.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) return;

  const newStart = sub.currentPeriodEnd;
  const newEnd = addBillingPeriod(newStart, sub.billingCycle);
  const amount =
    sub.billingCycle === "YEARLY"
      ? sub.plan.priceYearly
      : sub.plan.priceMonthly;

  await client.tenantSubscription.update({
    where: { id: subscriptionId },
    data: {
      currentPeriodStart: newStart,
      currentPeriodEnd: newEnd,
      nextPaymentDue: newEnd,
      // Skip amountDue increment for free plans (price = 0)
      amountDue: amount > 0 ? { increment: amount } : 0,
      status: sub.status === "PAST_DUE" ? "ACTIVE" : sub.status,
    },
  });
}

export async function runSubscriptionSweep() {
  const now = new Date();
  logger.info("Running subscription sweep...");

  const trials = await prisma.tenantSubscription.findMany({
    where: {
      status: "TRIALING",
      trialEndsAt: { lte: now },
    },
    include: { tenant: { select: { id: true, email: true, name: true } } },
  });

  for (const sub of trials) {
    await prisma.$transaction(async (tx) => {
      await tx.tenantSubscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
      await tx.tenant.update({
        where: { id: sub.tenantId },
        data: { status: "DEACTIVATED" },
      });
      await tx.user.updateMany({
        where: { tenantId: sub.tenantId, status: "ACTIVE" },
        data: { status: "INACTIVE" },
      });
    });
    logger.info(`Trial expired for tenant ${sub.tenantId}. Tenant deactivated, users set to INACTIVE.`);
  }

  const dueSubs = await prisma.tenantSubscription.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIALING"] },
      currentPeriodEnd: { lte: now },
    },
    include: { plan: true, tenant: true },
  });

  for (const sub of dueSubs) {
    const amount =
      sub.billingCycle === "YEARLY"
        ? sub.plan.priceYearly
        : sub.plan.priceMonthly;

    const existingPending = await prisma.payment.findFirst({
      where: {
        subscriptionId: sub.id,
        status: "PENDING",
        createdAt: { gte: sub.currentPeriodStart },
      },
    });

    if (!existingPending && amount > 0) {
      await prisma.payment.create({
        data: {
          tenantId: sub.tenantId,
          subscriptionId: sub.id,
          amount,
          status: "PENDING",
          invoiceNumber: generateInvoiceNumber(),
          notes: `Auto-generated invoice for period ending ${sub.currentPeriodEnd.toISOString().slice(0, 10)}`,
        },
      });
    }

    await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: {
        status: "PAST_DUE",
        amountDue: { increment: amount },
        nextPaymentDue: sub.currentPeriodEnd,
      },
    });
  }

  const pastDue = await prisma.tenantSubscription.findMany({
    where: {
      status: "PAST_DUE",
      nextPaymentDue: {
        lte: new Date(now.getTime() - GRACE_DAYS * 24 * 60 * 60 * 1000),
      },
      amountDue: { gt: 0 },
    },
  });

  for (const sub of pastDue) {
    await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: { status: "SUSPENDED", suspendedAt: now },
    });
    await prisma.tenant.update({
      where: { id: sub.tenantId },
      data: { status: "SUSPENDED" },
    });
    logger.info(`Suspended tenant ${sub.tenantId} for overdue payment`);
  }

  const renewalWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = await prisma.tenantSubscription.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIALING"] },
      nextPaymentDue: { gte: now, lte: renewalWindow },
    },
    include: { tenant: true, plan: true },
  });

  const supportEmail = await getPlatformSetting("support_email");
  for (const sub of upcoming) {
    if (!sub.tenant.email) continue;
    const subject = `Renewal reminder: ${sub.plan.name} plan`;
    const html = `<p>Your subscription renews on ${sub.nextPaymentDue?.toLocaleDateString("en-IN")}. Amount due: INR ${sub.amountDue}. Contact ${supportEmail || "support"} to renew.</p>`;
    await sendEmail(sub.tenantId, sub.tenant.email, subject, html).catch(
      () => {},
    );
  }
}

export function startSubscriptionScheduler(intervalMs = 24 * 60 * 60 * 1000) {
  logger.info("Starting subscription sweep scheduler");
  runSubscriptionSweep();
  setInterval(runSubscriptionSweep, intervalMs);
}

export { advanceSubscriptionPeriod };
