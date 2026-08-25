import prisma from "../../lib/prisma.js";
import { SchemeApplicationStatus } from "@prisma/client";
import { ApiError } from "../../utils/ApiError.js";

const VALID_TRANSITIONS: Record<SchemeApplicationStatus, SchemeApplicationStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["DOCUMENT_PENDING", "APPROVED", "REJECTED", "CANCELLED"],
  DOCUMENT_PENDING: ["UNDER_REVIEW", "CANCELLED"],
  APPROVED: ["COMPLETED", "CANCELLED"],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: SchemeApplicationStatus, to: SchemeApplicationStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTransition(from: SchemeApplicationStatus, to: SchemeApplicationStatus): void {
  if (!canTransition(from, to)) {
    throw ApiError.badRequest(`Cannot transition scheme application from "${from}" to "${to}".`);
  }
}

interface TransitionOptions {
  notes?: string | null;
  rejectionReason?: string | null;
  user: { id: string; name?: string; email: string };
}

export async function applyTransition(
  applicationId: string,
  tenantId: string,
  targetStatus: SchemeApplicationStatus,
  options: TransitionOptions
) {
  const { notes, rejectionReason, user } = options;

  const app = await prisma.schemeApplication.findFirst({
    where: { id: applicationId, tenantId, isDeleted: false },
  });
  if (!app) throw ApiError.notFound("Scheme application not found");

  validateTransition(app.status, targetStatus);

  const data: any = {
    status: targetStatus,
    notes: notes || app.notes,
  };

  if (targetStatus === "REJECTED") {
    data.rejectionReason = rejectionReason || "No reason specified";
  }

  if (targetStatus === "COMPLETED") {
    data.completedAt = new Date();
  }

  const updated = await prisma.schemeApplication.update({
    where: { id: applicationId },
    data,
    include: { scheme: { select: { name: true } } },
  });

  // Notify assignee if different from actor user
  if (updated.assignedToId && updated.assignedToId !== user.id) {
    await prisma.notification.create({
      data: {
        tenantId,
        userId: updated.assignedToId,
        channel: "IN_APP",
        title: "Scheme Application Status Updated",
        message: `Scheme Application "${updated.applicationNumber}" (${updated.scheme.name}) transitioned to status: ${targetStatus}.`,
        status: "PENDING",
      },
    });
  }

  return updated;
}
