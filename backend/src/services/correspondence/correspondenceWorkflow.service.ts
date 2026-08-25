import { CorrespondenceStatus } from "@prisma/client";
import { ApiError } from "../../utils/ApiError.js";

// Valid status transition mapping
const TRANSITIONS: Record<CorrespondenceStatus, CorrespondenceStatus[]> = {
  RECEIVED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "REPLY_PENDING", "COMPLETED"],
  IN_PROGRESS: ["REPLY_PENDING", "COMPLETED"],
  REPLY_PENDING: ["REPLIED", "COMPLETED"],
  REPLIED: ["COMPLETED"],
  COMPLETED: ["CLOSED"],
  REJECTED: [],
  CLOSED: [],
};

/**
 * Returns true if transition from current to target status is valid.
 */
export function canTransition(
  from: CorrespondenceStatus,
  to: CorrespondenceStatus
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) || false;
}

/**
 * Validates transition from current to target status, throwing error if invalid.
 */
export function validateTransition(
  from: CorrespondenceStatus,
  to: CorrespondenceStatus
): void {
  if (!canTransition(from, to)) {
    throw ApiError.badRequest(
      `Invalid correspondence status transition from "${from}" to "${to}"`
    );
  }
}
