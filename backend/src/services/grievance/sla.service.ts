import prisma from "../../lib/prisma.js";
import { GrievancePriority } from "@prisma/client";

/**
 * Calculates all SLA parameters for a grievance based on department and priority.
 */
export async function calculateGrievanceSla(
  tenantId: string,
  departmentId: string | null | undefined,
  priority: GrievancePriority,
  startTime: Date
): Promise<{
  slaHoursApplied: number | null;
  slaStartedAt: Date | null;
  expectedResolutionDate: Date | null;
}> {
  if (!departmentId) {
    return {
      slaHoursApplied: null,
      slaStartedAt: null,
      expectedResolutionDate: null,
    };
  }

  const sla = await prisma.departmentSLA.findFirst({
    where: {
      tenantId,
      departmentId,
      priority,
      isActive: true,
    },
  });

  if (!sla) {
    return {
      slaHoursApplied: null,
      slaStartedAt: startTime,
      expectedResolutionDate: null,
    };
  }

  const expectedResolutionDate = new Date(startTime);
  expectedResolutionDate.setHours(expectedResolutionDate.getHours() + sla.slaHours);

  return {
    slaHoursApplied: sla.slaHours,
    slaStartedAt: startTime,
    expectedResolutionDate,
  };
}

/**
 * Determines whether a grievance has breached its SLA.
 */
export function isSlaBreached(
  expectedResolutionDate: Date | null | undefined,
  resolvedAt: Date | null | undefined
): boolean {
  if (!expectedResolutionDate) return false;

  const limitDate = new Date(expectedResolutionDate);
  const compareDate = resolvedAt ? new Date(resolvedAt) : new Date();

  return compareDate > limitDate;
}

/**
 * Gets the SLA compliance status of a grievance.
 */
export function getSlaStatus(grievance: {
  expectedResolutionDate?: Date | null;
  resolvedAt?: Date | null;
}): "MET" | "BREACHED" | "PENDING" | "NO_SLA" {
  if (!grievance.expectedResolutionDate) return "NO_SLA";

  const isBreached = isSlaBreached(grievance.expectedResolutionDate, grievance.resolvedAt);

  if (grievance.resolvedAt) {
    return isBreached ? "BREACHED" : "MET";
  }

  return isBreached ? "BREACHED" : "PENDING";
}
