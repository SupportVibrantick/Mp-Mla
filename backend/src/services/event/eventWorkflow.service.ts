import prisma from "../../lib/prisma.js";
import { EventStatus } from "@prisma/client";
import { ApiError } from "../../utils/ApiError.js";

const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["ONGOING", "CANCELLED", "POSTPONED"],
  ONGOING: ["COMPLETED", "CANCELLED"],
  POSTPONED: ["SCHEDULED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: EventStatus, to: EventStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTransition(from: EventStatus, to: EventStatus): void {
  if (!canTransition(from, to)) {
    throw ApiError.badRequest(`Cannot transition event status from "${from}" to "${to}".`);
  }
}

interface TransitionOptions {
  comment?: string | null;
  user: { id: string; name?: string; email: string };
}

export async function applyTransition(
  eventId: string,
  tenantId: string,
  targetStatus: EventStatus,
  options: TransitionOptions
) {
  const { comment, user } = options;

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId, isDeleted: false },
  });
  if (!event) throw ApiError.notFound("Event not found");

  validateTransition(event.status, targetStatus);

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: { status: targetStatus },
  });

  const transitionLabel = `Status changed from ${event.status} to ${targetStatus}`;
  const displayComment = comment ? `${transitionLabel}. Comment: ${comment}` : transitionLabel;

  // Log in timeline
  await prisma.eventTimeline.create({
    data: {
      tenantId,
      eventId,
      action: "STATUS_CHANGED",
      description: displayComment,
      changedById: user.id,
      metadata: {
        fromStatus: event.status,
        toStatus: targetStatus,
        comment,
      },
    },
  });

  // Notify organizer if changed by another user
  if (updatedEvent.organizerId && updatedEvent.organizerId !== user.id) {
    await prisma.notification.create({
      data: {
        tenantId,
        userId: updatedEvent.organizerId,
        channel: "IN_APP",
        title: "Event Status Updated",
        message: `Event "${updatedEvent.title}" (${updatedEvent.eventCode}) status changed to ${targetStatus}.`,
        status: "PENDING",
      },
    });
  }

  return updatedEvent;
}
