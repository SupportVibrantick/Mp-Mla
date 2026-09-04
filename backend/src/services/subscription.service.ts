import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { assertTransition } from "./subscriptionStateMachine.js";
import { clearModuleAccessCache } from "../middleware/requireModule.js";
import { logSubscriptionEvent } from "./audit.service.js";

/**
 * Subscription Service
 *
 * Centralizes subscription lifecycle management.
 * All status transitions are validated by the SubscriptionStateMachine.
 */

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

function getPlanPrice(
  plan: { priceMonthly: number; priceYearly: number },
  billingCycle: string,
): number {
  return billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
}

/**
 * Sync tenant's module access to match their plan's modules.
 */
export async function syncTenantModulesToPlan(
  tenantId: string,
  planId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const planModules = await tx.planModule.findMany({
    where: { planId },
    include: { module: true },
  });

  const planModuleIds = new Set(
    planModules.filter((pm) => pm.module.isActive).map((pm) => pm.moduleId),
  );

  const currentAccess = await tx.tenantModuleAccess.findMany({
    where: { tenantId },
  });

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

  clearModuleAccessCache(tenantId);
}

/**
 * Advance subscription to the next billing period.
 * Skips amountDue increment for free plans (price = 0).
 */
export async function advanceSubscriptionPeriod(
  subscriptionId: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx || prisma;
  const sub = await client.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) return;

  const newStart = sub.currentPeriodEnd;
  const newEnd = calculatePeriodEnd(sub.billingCycle, newStart);
  const amount = getPlanPrice(sub.plan, sub.billingCycle);

  await client.tenantSubscription.update({
    where: { id: subscriptionId },
    data: {
      currentPeriodStart: newStart,
      currentPeriodEnd: newEnd,
      nextPaymentDue: newEnd,
      // Only increment amountDue for paid plans
      amountDue: amount > 0 ? { increment: amount } : 0,
      status: sub.status === "PAST_DUE" ? "ACTIVE" : sub.status,
    },
  });

  logger.info(
    `Advanced subscription ${subscriptionId} to period ${newStart.toISOString()} — ${newEnd.toISOString()}`,
  );
}

/**
 * Activate a subscription after payment.
 * Handles TRIALING → ACTIVE and PAST_DUE → ACTIVE transitions.
 * Clears trialEndsAt to prevent the sweep from re-expiring.
 */
export async function activateAfterPayment(
  subscriptionId: string,
  tx: Prisma.TransactionClient,
  performedBy?: string | null,
): Promise<void> {
  const sub = await tx.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!sub) return;

  // Only transition if not already ACTIVE
  if (sub.status === "ACTIVE") return;

  // Validate state transition
  assertTransition(sub.status, "ACTIVE");

  const updateData: any = {
    status: "ACTIVE",
    suspendedAt: null,
    cancelledAt: null,
  };

  // Clear trialEndsAt when transitioning from TRIALING
  // This prevents the sweep job from re-expiring the subscription
  if (sub.status === "TRIALING") {
    updateData.trialEndsAt = null;
  }

  await tx.tenantSubscription.update({
    where: { id: subscriptionId },
    data: updateData,
  });

  // Reactivate tenant and users
  await tx.tenant.update({
    where: { id: sub.tenantId },
    data: { status: "ACTIVE" },
  });

  await tx.user.updateMany({
    where: { tenantId: sub.tenantId, status: { in: ["SUSPENDED", "INACTIVE"] } },
    data: { status: "ACTIVE" },
  });

  await logSubscriptionEvent(
    "SUBSCRIPTION_ACTIVATED",
    subscriptionId,
    sub.tenantId,
    { previousStatus: sub.status, activatedBy: performedBy || "PAYMENT" },
    performedBy,
    tx,
  );

  logger.info(
    `Subscription ${subscriptionId} activated (was ${sub.status}) for tenant ${sub.tenantId}`,
  );
}

/**
 * Apply plan upgrade after payment verification or manual payment.
 * Switches subscription.planId to targetPlanId, updates tenant quotas, and syncs modules.
 */
export async function applyPlanUpgradeFromPayment(
  subscriptionId: string,
  targetPlanId: string,
  targetBillingCycle: string,
  tx: Prisma.TransactionClient,
  performedBy?: string | null,
): Promise<void> {
  const sub = await tx.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!sub) return;

  const targetPlan = await tx.subscriptionPlan.findUnique({
    where: { id: targetPlanId },
  });

  if (!targetPlan) return;

  const now = new Date();
  const effectiveBillingCycle = targetBillingCycle || sub.billingCycle;
  const currentPeriodEnd = calculatePeriodEnd(effectiveBillingCycle, now);

  // Update subscription to new plan
  await tx.tenantSubscription.update({
    where: { id: subscriptionId },
    data: {
      planId: targetPlanId,
      billingCycle: effectiveBillingCycle as any,
      status: "ACTIVE",
      trialEndsAt: null,
      suspendedAt: null,
      cancelledAt: null,
      currentPeriodStart: now,
      currentPeriodEnd,
      nextPaymentDue: currentPeriodEnd,
      amountDue: 0,
    },
  });

  // Activate tenant
  await tx.tenant.update({
    where: { id: sub.tenantId },
    data: {
      status: "ACTIVE",
    },
  });

  // Sync module access for the new plan
  await syncTenantModulesToPlan(sub.tenantId, targetPlanId, tx);

  // Auto-approve any PENDING plan upgrade request for this tenant & plan
  await tx.planUpgradeRequest.updateMany({
    where: {
      tenantId: sub.tenantId,
      requestedPlanId: targetPlanId,
      status: "PENDING",
    },
    data: {
      status: "APPROVED",
      adminNote: "Auto-approved via successful Razorpay payment",
      reviewedAt: now,
    },
  });

  await logSubscriptionEvent(
    "SUBSCRIPTION_UPGRADED",
    subscriptionId,
    sub.tenantId,
    {
      previousPlanId: sub.planId,
      newPlanId: targetPlanId,
      newPlanName: targetPlan.name,
      billingCycle: effectiveBillingCycle,
    },
    performedBy,
    tx,
  );

  logger.info(
    `Subscription ${subscriptionId} upgraded from ${sub.plan.name} to ${targetPlan.name} (${effectiveBillingCycle})`,
  );
}

export { calculatePeriodEnd, getPlanPrice };
