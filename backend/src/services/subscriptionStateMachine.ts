import { SubscriptionStatus } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";

/**
 * Subscription State Machine
 *
 * Defines all legal status transitions for tenant subscriptions.
 * Prevents invalid transitions (e.g. CANCELLED → TRIALING) at the service layer,
 * making the subscription lifecycle deterministic and auditable.
 */

const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIALING: ["ACTIVE", "EXPIRED", "CANCELLED"],
  ACTIVE: ["PAST_DUE", "SUSPENDED", "CANCELLED"],
  PAST_DUE: ["ACTIVE", "SUSPENDED", "CANCELLED"],
  SUSPENDED: ["ACTIVE", "CANCELLED"],
  EXPIRED: ["ACTIVE"], // Only via admin explicit renewal/reassignment
  CANCELLED: [], // Terminal state — must create new subscription
};

/**
 * Assert that a status transition is allowed.
 * Throws ApiError.conflict if the transition is invalid.
 */
export function assertTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): void {
  if (from === to) return; // no-op transition is always allowed

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw ApiError.conflict(
      `Invalid subscription status transition: ${from} → ${to}. ` +
        `Allowed transitions from ${from}: [${(allowed || []).join(", ")}]`,
    );
  }
}

/**
 * Check if a transition is allowed without throwing.
 */
export function canTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

/**
 * Get the list of allowed transitions from a given status.
 */
export function getAllowedTransitions(
  from: SubscriptionStatus,
): SubscriptionStatus[] {
  return ALLOWED_TRANSITIONS[from] || [];
}
