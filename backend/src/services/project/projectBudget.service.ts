import { ApiError } from "../../utils/ApiError.js";

/**
 * Validates budget allocation consistency.
 * - All budget values must be >= 0.
 * - Released budget must not exceed Sanctioned budget.
 * - Used budget must not exceed Released budget.
 */
export function validateBudgets(
  sanctioned: number,
  released: number,
  used: number
): void {
  if (sanctioned < 0 || released < 0 || used < 0) {
    throw ApiError.badRequest("Budget amounts cannot be negative.");
  }
  if (released > sanctioned) {
    throw ApiError.badRequest(
      `Released budget (₹${released.toLocaleString()}) cannot exceed sanctioned budget (₹${sanctioned.toLocaleString()}).`
    );
  }
  if (used > released) {
    throw ApiError.badRequest(
      `Utilized budget (₹${used.toLocaleString()}) cannot exceed released budget (₹${released.toLocaleString()}).`
    );
  }
}
