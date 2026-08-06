import prisma from "../lib/prisma.js";
import logger from "../utils/logger.js";
import { Prisma, AuditAction } from "@prisma/client";

/**
 * Audit Service
 *
 * Records all payment and subscription lifecycle events into the AuditLog table.
 * Uses the existing AuditLog model with AuditAction enum.
 * Payment and subscription events use STATUS_CHANGE or CREATE actions
 * with the event details stored in the description and newData fields.
 */

export type PaymentAuditEvent =
  | "PAYMENT_ORDER_CREATED"
  | "PAYMENT_VERIFIED"
  | "PAYMENT_FAILED"
  | "PAYMENT_CANCELLED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_MANUAL_RECORDED"
  | "PAYMENT_STATUS_UPDATED"
  | "PAYMENT_WEBHOOK_RECEIVED";

export type SubscriptionAuditEvent =
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_ACTIVATED"
  | "SUBSCRIPTION_UPGRADED"
  | "SUBSCRIPTION_RENEWED"
  | "SUBSCRIPTION_SUSPENDED"
  | "SUBSCRIPTION_CANCELLED"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_REACTIVATED"
  | "TRIAL_STARTED"
  | "TRIAL_EXPIRED"
  | "INVOICE_GENERATED";

export type AuditEvent = PaymentAuditEvent | SubscriptionAuditEvent;

/** Map our custom event names to the existing AuditAction enum */
function mapEventToAction(event: AuditEvent): AuditAction {
  if (event.includes("CREATED") || event === "TRIAL_STARTED") return "CREATE";
  return "STATUS_CHANGE";
}

interface AuditLogParams {
  event: AuditEvent;
  tenantId?: string | null;
  module: string;
  entityId: string;
  description?: string;
  details?: Record<string, any>;
  performedBy?: string | null;
  tx?: Prisma.TransactionClient;
}

/**
 * Create an audit log entry.
 * Can be called inside or outside a transaction.
 */
export async function createAuditLog({
  event,
  tenantId,
  module,
  entityId,
  description,
  details,
  performedBy,
  tx,
}: AuditLogParams): Promise<void> {
  const client = tx || prisma;

  try {
    const data: any = {
      action: mapEventToAction(event),
      module,
      recordId: entityId,
      description: description || event,
      newData: details ? details : undefined,
      ipAddress: null,
      userAgent: null,
    };

    if (tenantId) {
      data.tenant = { connect: { id: tenantId } };
    }

    if (performedBy && performedBy !== "SYSTEM") {
      data.user = { connect: { id: performedBy } };
    }

    await client.auditLog.create({ data });
  } catch (error) {
    // Audit logging should never break the main flow
    logger.error(`Failed to create audit log for ${event}: ${error}`);
  }
}

/**
 * Convenience: log a payment event
 */
export async function logPaymentEvent(
  event: PaymentAuditEvent,
  paymentId: string,
  tenantId: string | null,
  details?: Record<string, any>,
  performedBy?: string | null,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  await createAuditLog({
    event,
    tenantId,
    module: "payments",
    entityId: paymentId,
    description: `${event}: Payment ${paymentId}`,
    details,
    performedBy,
    tx,
  });
}

/**
 * Convenience: log a subscription event
 */
export async function logSubscriptionEvent(
  event: SubscriptionAuditEvent,
  subscriptionId: string,
  tenantId: string | null,
  details?: Record<string, any>,
  performedBy?: string | null,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  await createAuditLog({
    event,
    tenantId,
    module: "subscriptions",
    entityId: subscriptionId,
    description: `${event}: Subscription ${subscriptionId}`,
    details,
    performedBy,
    tx,
  });
}
