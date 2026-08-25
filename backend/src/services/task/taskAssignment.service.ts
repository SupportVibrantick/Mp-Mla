import prisma from "../../lib/prisma.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Validates that the officer is eligible to be assigned to the task.
 * - Officer must exist, belong to same tenant, and be ACTIVE.
 * - Officer's department must match the task's department (if departmentId is specified).
 */
export async function validateAssignment(
  tenantId: string,
  assignedToId: string,
  departmentId?: string | null
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: assignedToId, tenantId, status: "ACTIVE" },
  });
  if (!user) {
    throw ApiError.notFound("Active assigned officer not found in this organization.");
  }

  if (departmentId) {
    if (user.departmentId !== departmentId) {
      throw ApiError.badRequest("Assigned officer does not belong to the selected department.");
    }
  }
}
