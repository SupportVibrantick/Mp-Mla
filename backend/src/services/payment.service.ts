import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/ApiError.js";
import * as razorpayService from "./razorpay.service.js";
import * as invoiceService from "./invoice.service.js";
import * as subscriptionService from "./subscription.service.js";
import { logPaymentEvent } from "./audit.service.js";

/**
 * Payment Service
 *
 * Central orchestrator for all payment operations.
 * Controllers delegate here — they become thin wrappers.
 *
 * Flow (Online/Razorpay):
 *   createOrder → Payment(CREATED) → Checkout → verifyPayment → Payment(SUCCESS) → Subscription(ACTIVE) → Invoice
 *
 * Flow (Manual):
 *   recordManualPayment → Payment(SUCCESS) → Subscription(ACTIVE) → Invoice
 */

// ════════════════════════════════════════════════════════
// CREATE ORDER (Razorpay)
// ════════════════════════════════════════════════════════

interface CreateOrderParams {
  subscriptionId: string;
  amount: number;
  currency?: string;
  notes?: string;
  performedBy?: string | null;
}

export async function createOrder(params: CreateOrderParams) {
  const { subscriptionId, amount, currency = "INR", notes, performedBy } = params;

  // Validate subscription exists
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true, tenant: { select: { id: true, name: true } } },
  });

  if (!subscription) {
    throw ApiError.notFound("Subscription not found");
  }

  // Server-side amount validation: use provided amount or fallback to plan price
  const expectedAmount = subscriptionService.getPlanPrice(
    subscription.plan,
    subscription.billingCycle,
  );

  const orderAmount = amount && amount > 0 ? amount : expectedAmount;

  if (orderAmount <= 0) {
    throw ApiError.badRequest("Cannot create payment order for a free plan");
  }

  // Create Razorpay order (receipt must be <= 40 characters for Razorpay API)
  const receipt = `rcpt_${subscriptionId.slice(-10)}_${Date.now().toString().slice(-8)}`;
  const order = await razorpayService.createOrder({
    amount: orderAmount,
    currency,
    receipt,
    notes: {
      tenantId: subscription.tenantId,
      tenantName: subscription.tenant.name,
      planName: subscription.plan.name,
      subscriptionId,
    },
  });

  // Create payment record with CREATED status
  const payment = await prisma.payment.create({
    data: {
      subscriptionId,
      amount: orderAmount,
      currency,
      method: "ONLINE",
      gateway: "RAZORPAY",
      gatewayOrderId: order.id,
      status: "CREATED",
      notes,
    },
  });

  await logPaymentEvent(
    "PAYMENT_ORDER_CREATED",
    payment.id,
    subscription.tenantId,
    {
      gatewayOrderId: order.id,
      amount: orderAmount,
      currency,
      planName: subscription.plan.name,
    },
    performedBy,
  );

  return {
    payment,
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    },
    keyId: razorpayService.getRazorpayKeyId(),
    subscription: {
      id: subscription.id,
      tenantName: subscription.tenant.name,
      planName: subscription.plan.name,
    },
  };
}

// ════════════════════════════════════════════════════════
// CREATE ORDER FOR TENANT (auto-resolve subscription)
// ════════════════════════════════════════════════════════

interface CreateTenantOrderParams {
  tenantId: string;
  paymentId?: string; // Pay an existing pending payment
  planId?: string;    // Or create new payment for a plan
  billingCycle?: string;
  notes?: string;
  performedBy?: string | null;
}

export async function createTenantOrder(params: CreateTenantOrderParams) {
  const { tenantId, paymentId, planId, billingCycle, notes, performedBy } = params;

  // Option 1: Pay existing pending payment
  if (paymentId) {
    const existing = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: {
          include: { plan: true, tenant: { select: { id: true, name: true } } },
        },
      },
    });

    if (!existing) throw ApiError.notFound("Payment not found");
    if (existing.subscription.tenantId !== tenantId) {
      throw ApiError.forbidden("Payment does not belong to this tenant");
    }

    // Idempotency: if already has a gateway order, return it
    if (existing.gatewayOrderId && existing.status === "CREATED") {
      return {
        payment: existing,
        order: {
          id: existing.gatewayOrderId,
          amount: Math.round(existing.amount * 100),
          currency: existing.currency,
        },
        keyId: razorpayService.getRazorpayKeyId(),
        subscription: {
          id: existing.subscription.id,
          tenantName: existing.subscription.tenant.name,
          planName: existing.subscription.plan.name,
        },
      };
    }

    // If payment was already successful, return error
    if (existing.status === "SUCCESS") {
      throw ApiError.conflict("This payment has already been completed");
    }

    // Create Razorpay order for existing payment (receipt <= 40 chars)
    const receipt = `pay_${existing.id.slice(-10)}_${Date.now().toString().slice(-8)}`;
    const order = await razorpayService.createOrder({
      amount: existing.amount,
      currency: existing.currency,
      receipt,
      notes: {
        paymentId: existing.id,
        tenantId,
      },
    });

    const updated = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        gateway: "RAZORPAY",
        method: "ONLINE",
        gatewayOrderId: order.id,
        status: "CREATED",
      },
    });

    await logPaymentEvent(
      "PAYMENT_ORDER_CREATED",
      existing.id,
      tenantId,
      { gatewayOrderId: order.id, amount: existing.amount },
      performedBy,
    );

    return {
      payment: updated,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      keyId: razorpayService.getRazorpayKeyId(),
      subscription: {
        id: existing.subscription.id,
        tenantName: existing.subscription.tenant.name,
        planName: existing.subscription.plan.name,
      },
    };
  }

  // Option 2: Create new payment for a plan
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  if (!subscription) {
    throw ApiError.notFound("No subscription found for this tenant");
  }

  const targetPlan = planId
    ? await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
    : subscription.plan;

  if (!targetPlan) throw ApiError.notFound("Plan not found");

  const cycle = billingCycle || subscription.billingCycle;
  const amount = subscriptionService.getPlanPrice(targetPlan, cycle);

  if (amount <= 0) {
    throw ApiError.badRequest("Cannot create payment order for a free plan");
  }

  // Prepend UPGRADE tag to notes if target plan differs or planId explicitly requested
  let orderNotes = notes || "";
  if (planId && targetPlan.id !== subscription.planId) {
    orderNotes = `[UPGRADE:${targetPlan.id}:${cycle}] ${orderNotes}`.trim();
  }

  return createOrder({
    subscriptionId: subscription.id,
    amount,
    notes: orderNotes,
    performedBy,
  });
}

// ════════════════════════════════════════════════════════
// VERIFY PAYMENT (Razorpay)
// ════════════════════════════════════════════════════════

interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  performedBy?: string | null;
}

export async function verifyPayment(params: VerifyPaymentParams) {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    performedBy,
  } = params;

  // Find payment by gateway order ID
  const payment = await prisma.payment.findUnique({
    where: { gatewayOrderId: razorpay_order_id },
    include: {
      subscription: {
        include: {
          plan: true,
          tenant: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!payment) {
    throw ApiError.notFound("Payment not found for this order");
  }

  // Idempotency: if already SUCCESS, return existing payment
  if (payment.status === "SUCCESS") {
    logger.info(
      `Duplicate verify call for payment ${payment.id} — already SUCCESS`,
    );
    return {
      payment,
      subscription: payment.subscription,
      alreadyProcessed: true,
    };
  }

  // Verify signature
  const isValid = razorpayService.verifySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );

  if (!isValid) {
    // Mark as failed
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature,
      },
    });

    await logPaymentEvent(
      "PAYMENT_FAILED",
      payment.id,
      payment.subscription.tenantId,
      { reason: "Invalid signature", gatewayPaymentId: razorpay_payment_id },
      performedBy,
    );

    throw ApiError.badRequest("Payment verification failed: invalid signature");
  }

  // Verify amount from Razorpay (server-side validation)
  let rzpPaymentDetails;
  try {
    rzpPaymentDetails = await razorpayService.fetchPayment(razorpay_payment_id);

    // Verify amount matches (Razorpay amount is in paise)
    const expectedAmountPaise = Math.round(payment.amount * 100);
    if (rzpPaymentDetails.amount !== expectedAmountPaise) {
      throw new Error(
        `Amount mismatch: expected ${expectedAmountPaise} paise, got ${rzpPaymentDetails.amount} paise`,
      );
    }

    // Verify currency
    if (
      rzpPaymentDetails.currency.toUpperCase() !==
      payment.currency.toUpperCase()
    ) {
      throw new Error(
        `Currency mismatch: expected ${payment.currency}, got ${rzpPaymentDetails.currency}`,
      );
    }
  } catch (err: any) {
    if (err.message?.includes("mismatch")) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          gatewayPaymentId: razorpay_payment_id,
          gatewaySignature: razorpay_signature,
          notes: err.message,
        },
      });

      await logPaymentEvent(
        "PAYMENT_FAILED",
        payment.id,
        payment.subscription.tenantId,
        { reason: err.message },
        performedBy,
      );

      throw ApiError.badRequest(`Payment verification failed: ${err.message}`);
    }
    // If fetch fails for network reasons, continue with signature-based verification
    logger.warn(
      `Could not fetch Razorpay payment details for ${razorpay_payment_id}: ${err.message}`,
    );
  }

  // All checks passed — process payment in transaction
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update payment to SUCCESS
    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature,
        paidAt: now,
      },
    });

    // 2. Check if this payment was created for a plan upgrade
    await checkAndApplyUpgrade(payment, tx, performedBy);

    // 3. Update subscription: reduce amountDue, update lastPaymentAt
    const newAmountDue = Math.max(
      0,
      payment.subscription.amountDue - payment.amount,
    );

    await tx.tenantSubscription.update({
      where: { id: payment.subscriptionId },
      data: {
        lastPaymentAt: now,
        amountDue: newAmountDue,
      },
    });

    // 4. Activate subscription if needed (TRIALING/PAST_DUE/EXPIRED/SUSPENDED → ACTIVE)
    await subscriptionService.activateAfterPayment(
      payment.subscriptionId,
      tx,
      performedBy,
    );

    // 5. Advance period if amountDue is cleared
    if (newAmountDue === 0) {
      await subscriptionService.advanceSubscriptionPeriod(
        payment.subscriptionId,
        tx,
      );
    }

    // 5. Audit log
    await logPaymentEvent(
      "PAYMENT_VERIFIED",
      payment.id,
      payment.subscription.tenantId,
      {
        amount: payment.amount,
        currency: payment.currency,
        gateway: "RAZORPAY",
        gatewayPaymentId: razorpay_payment_id,
      },
      performedBy,
      tx,
    );

    return updatedPayment;
  });

  // 6. Generate invoice (outside transaction — best effort)
  try {
    await invoiceService.generateInvoicePdf(result.id);
  } catch (err) {
    logger.error(`Invoice generation failed for payment ${result.id}: ${err}`);
  }

  // Fetch final state
  const finalPayment = await prisma.payment.findUnique({
    where: { id: result.id },
    include: {
      subscription: {
        include: {
          plan: true,
          tenant: { select: { id: true, name: true } },
        },
      },
    },
  });

  return {
    payment: finalPayment,
    subscription: finalPayment?.subscription,
    alreadyProcessed: false,
  };
}

// ════════════════════════════════════════════════════════
// RECORD MANUAL PAYMENT
// ════════════════════════════════════════════════════════

interface ManualPaymentParams {
  subscriptionId: string;
  amount: number;
  currency?: string;
  method?: string;
  transactionId?: string;
  notes?: string;
  paidAt?: string;
  status?: string;
  taxAmount?: number | null;
  gstNumber?: string | null;
  performedBy?: string | null;
}

export async function recordManualPayment(params: ManualPaymentParams) {
  const {
    subscriptionId,
    amount,
    currency = "INR",
    method,
    transactionId,
    notes,
    paidAt,
    status = "SUCCESS",
    taxAmount,
    gstNumber,
    performedBy,
  } = params;

  const subscription = await prisma.tenantSubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true,
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!subscription) {
    throw ApiError.notFound("Subscription not found");
  }

  const isSuccess = status === "SUCCESS";
  const now = new Date();
  const paidAtDate = isSuccess
    ? paidAt
      ? new Date(paidAt)
      : now
    : null;

  // Map method string to enum value
  const paymentMethod = mapMethodString(method);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create payment
    const payment = await tx.payment.create({
      data: {
        subscriptionId,
        amount,
        currency,
        method: paymentMethod,
        gateway: null, // Manual = no gateway
        transactionId,
        status: status as any,
        notes,
        paidAt: paidAtDate,
        taxAmount: taxAmount ?? null,
        gstNumber: gstNumber ?? null,
      },
    });

    if (isSuccess) {
      // Check if this payment was created for a plan upgrade
      await checkAndApplyUpgrade(payment, tx, performedBy);

      // 2. Update subscription
      const newAmountDue = Math.max(0, subscription.amountDue - amount);

      await tx.tenantSubscription.update({
        where: { id: subscriptionId },
        data: {
          lastPaymentAt: paidAtDate,
          amountDue: newAmountDue,
        },
      });

      // 3. Activate subscription if needed
      await subscriptionService.activateAfterPayment(
        subscriptionId,
        tx,
        performedBy,
      );

      // 4. Advance period if amountDue cleared
      if (newAmountDue === 0) {
        await subscriptionService.advanceSubscriptionPeriod(
          subscriptionId,
          tx,
        );
      }
    }

    // 5. Audit log
    await logPaymentEvent(
      "PAYMENT_MANUAL_RECORDED",
      payment.id,
      subscription.tenantId,
      {
        amount,
        currency,
        method: paymentMethod,
        status,
        transactionId,
      },
      performedBy,
      tx,
    );

    return payment;
  });

  // 6. Generate invoice for successful payments
  if (isSuccess) {
    try {
      await invoiceService.generateInvoicePdf(result.id);
    } catch (err) {
      logger.error(`Invoice generation failed for payment ${result.id}: ${err}`);
    }
  }

  // Return final payment with relations
  const finalPayment = await prisma.payment.findUnique({
    where: { id: result.id },
    include: {
      subscription: {
        include: {
          plan: { select: { id: true, name: true } },
          tenant: { select: { id: true, name: true } },
        },
      },
    },
  });

  return finalPayment;
}

// ════════════════════════════════════════════════════════
// UPDATE PAYMENT STATUS (admin manual update)
// ════════════════════════════════════════════════════════

interface UpdateStatusParams {
  paymentId: string;
  status: string;
  paidAt?: string | null;
  transactionId?: string;
  method?: string;
  notes?: string;
  performedBy?: string | null;
}

export async function updatePaymentStatus(params: UpdateStatusParams) {
  const {
    paymentId,
    status,
    paidAt,
    transactionId,
    method,
    notes,
    performedBy,
  } = params;

  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: true },
  });

  if (!existing) {
    throw ApiError.notFound("Payment not found");
  }

  // Idempotency: if already in the target status, return
  if (existing.status === status) {
    const fullPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: {
          include: {
            plan: { select: { id: true, name: true } },
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });
    return fullPayment;
  }

  const isNowSuccess = status === "SUCCESS" && existing.status !== "SUCCESS";
  const paidAtDate = status === "SUCCESS"
    ? paidAt
      ? new Date(paidAt)
      : new Date()
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: status as any,
        paidAt: paidAtDate,
        transactionId: transactionId !== undefined ? transactionId : existing.transactionId,
        method: method ? mapMethodString(method) : existing.method,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    if (isNowSuccess) {
      // Check if this payment was created for a plan upgrade
      await checkAndApplyUpgrade(updatedPayment, tx, performedBy);

      const newAmountDue = Math.max(
        0,
        existing.subscription.amountDue - existing.amount,
      );

      await tx.tenantSubscription.update({
        where: { id: existing.subscriptionId },
        data: {
          lastPaymentAt: paidAtDate,
          amountDue: newAmountDue,
          // Also handle status transitions for TRIALING, PAST_DUE, SUSPENDED, EXPIRED
          status:
            existing.subscription.status === "PAST_DUE" ||
            existing.subscription.status === "SUSPENDED" ||
            existing.subscription.status === "TRIALING" ||
            existing.subscription.status === "EXPIRED"
              ? "ACTIVE"
              : existing.subscription.status,
          // Clear trialEndsAt when transitioning from TRIALING
          trialEndsAt:
            existing.subscription.status === "TRIALING"
              ? null
              : existing.subscription.trialEndsAt,
        },
      });

      // Reactivate tenant if suspended
      if (
        existing.subscription.status === "SUSPENDED" ||
        existing.subscription.status === "TRIALING" ||
        existing.subscription.status === "EXPIRED"
      ) {
        await tx.tenant.update({
          where: { id: existing.subscription.tenantId },
          data: { status: "ACTIVE" },
        });
        await tx.user.updateMany({
          where: {
            tenantId: existing.subscription.tenantId,
            status: { in: ["SUSPENDED", "INACTIVE"] },
          },
          data: { status: "ACTIVE" },
        });
      }

      if (newAmountDue === 0) {
        await subscriptionService.advanceSubscriptionPeriod(
          existing.subscriptionId,
          tx,
        );
      }
    }

    await logPaymentEvent(
      "PAYMENT_STATUS_UPDATED",
      paymentId,
      existing.subscription.tenantId,
      {
        previousStatus: existing.status,
        newStatus: status,
        amount: existing.amount,
      },
      performedBy,
      tx,
    );

    return updatedPayment;
  });

  // Generate invoice on success
  if (isNowSuccess && !result.invoiceUrl) {
    try {
      await invoiceService.generateInvoicePdf(result.id);
    } catch (err) {
      logger.error(`Invoice generation failed for payment ${result.id}: ${err}`);
    }
  }

  return prisma.payment.findUnique({
    where: { id: result.id },
    include: {
      subscription: {
        include: {
          plan: { select: { id: true, name: true } },
          tenant: { select: { id: true, name: true } },
        },
      },
    },
  });
}

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════

function mapMethodString(method?: string | null): any {
  if (!method) return "OFFLINE";
  const upper = method.toUpperCase();
  const validMethods = [
    "ONLINE",
    "OFFLINE",
    "BANK_TRANSFER",
    "CHEQUE",
    "CASH",
    "UPI",
  ];
  return validMethods.includes(upper) ? upper : "OFFLINE";
}

async function checkAndApplyUpgrade(
  payment: { subscriptionId: string; notes?: string | null },
  tx: Prisma.TransactionClient,
  performedBy?: string | null,
) {
  if (!payment.notes) return;
  const upgradeMatch = payment.notes.match(/\[UPGRADE:([^:\s]+):([^\]\s]+)\]/);
  if (upgradeMatch) {
    const targetPlanId = upgradeMatch[1];
    const targetBillingCycle = upgradeMatch[2];
    await subscriptionService.applyPlanUpgradeFromPayment(
      payment.subscriptionId,
      targetPlanId,
      targetBillingCycle,
      tx,
      performedBy,
    );
  }
}
