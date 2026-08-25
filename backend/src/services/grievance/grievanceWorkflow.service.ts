import prisma from "../../lib/prisma.js";
import { GrievanceStatus, GrievanceTimeline } from "@prisma/client";
import { ApiError } from "../../utils/ApiError.js";

const VALID_TRANSITIONS: Record<GrievanceStatus, GrievanceStatus[]> = {
  OPEN: ["IN_PROGRESS", "ESCALATED", "REJECTED"],
  IN_PROGRESS: ["ESCALATED", "RESOLVED", "REJECTED"],
  ESCALATED: ["IN_PROGRESS", "RESOLVED", "REJECTED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["OPEN"],
  REJECTED: ["OPEN"],
};

export function canTransition(from: GrievanceStatus, to: GrievanceStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTransition(from: GrievanceStatus, to: GrievanceStatus): void {
  if (!canTransition(from, to)) {
    throw ApiError.badRequest(`Cannot transition status from "${from}" to "${to}".`);
  }
}

export function getTransitionLabel(from: GrievanceStatus, to: GrievanceStatus): string {
  if (from === to) return `Status remained ${to}`;
  return `Status changed from ${from} to ${to}`;
}

export async function applyTransition(
  grievanceId: string,
  tenantId: string,
  toStatus: GrievanceStatus,
  user: { id: string; name?: string | null; email: string },
  bodyData: {
    comment?: string;
    resolutionNotes?: string;
    rejectionReason?: string;
    escalationReason?: string;
    satisfactionRating?: number;
  }
): Promise<any> {
  const old = await prisma.grievance.findFirst({
    where: { id: grievanceId, tenantId },
  });

  if (!old) throw ApiError.notFound("Grievance not found");

  validateTransition(old.status, toStatus);

  const updateData: any = { status: toStatus };
  const now = new Date();

  // Reset or apply side effects based on toStatus
  switch (toStatus) {
    case "RESOLVED":
      updateData.resolvedAt = now;
      updateData.closedAt = null;
      updateData.rejectionReason = null;
      if (bodyData.resolutionNotes) {
        updateData.resolutionNotes = bodyData.resolutionNotes;
      }
      break;

    case "CLOSED":
      updateData.closedAt = now;
      if (bodyData.satisfactionRating !== undefined) {
        updateData.satisfactionRating = bodyData.satisfactionRating;
      }
      break;

    case "ESCALATED":
      updateData.escalatedAt = now;
      if (bodyData.escalationReason) {
        updateData.escalationReason = bodyData.escalationReason;
      }
      break;

    case "REJECTED":
      updateData.rejectionReason = bodyData.rejectionReason || "Rejected by administrator";
      updateData.resolvedAt = null;
      updateData.closedAt = null;
      updateData.resolutionNotes = null;
      break;

    case "IN_PROGRESS":
      if (
        old.status === "RESOLVED" ||
        old.status === "CLOSED" ||
        old.status === "REJECTED"
      ) {
        updateData.resolvedAt = null;
        updateData.closedAt = null;
        updateData.resolutionNotes = null;
        updateData.rejectionReason = null;
        updateData.satisfactionRating = null;
      }
      break;

    case "OPEN":
      updateData.resolvedAt = null;
      updateData.closedAt = null;
      updateData.resolutionNotes = null;
      updateData.rejectionReason = null;
      updateData.satisfactionRating = null;
      updateData.escalatedAt = null;
      updateData.escalationReason = null;
      break;
  }

  const updatedGrievance = await prisma.grievance.update({
    where: { id: grievanceId },
    data: updateData,
    include: {
      ward: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  });

  const label = getTransitionLabel(old.status, toStatus);
  const extraComment = [
    bodyData.resolutionNotes ? `Resolution: ${bodyData.resolutionNotes}` : "",
    bodyData.rejectionReason ? `Reason: ${bodyData.rejectionReason}` : "",
    bodyData.escalationReason ? `Reason: ${bodyData.escalationReason}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  await prisma.grievanceTimeline.create({
    data: {
      tenantId,
      grievanceId,
      action: "STATUS_CHANGE",
      fromStatus: old.status,
      toStatus: toStatus,
      comment: bodyData.comment || `${label}${extraComment ? `. ${extraComment}` : ""}`,
      changedBy: user.name || user.email,
      changedById: user.id,
    },
  });

  return updatedGrievance;
}
