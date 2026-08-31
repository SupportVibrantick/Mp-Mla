import prisma from "../../lib/prisma.js";
import { ProjectStatus } from "@prisma/client";
import { ApiError } from "../../utils/ApiError.js";

const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  PENDING: ["RUNNING", "CANCELLED"],
  RUNNING: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["RUNNING", "CANCELLED"],
  COMPLETED: ["ON_HOLD", "RUNNING"],
  CANCELLED: ["ON_HOLD", "RUNNING"],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): void {
  if (!canTransition(from, to)) {
    throw ApiError.badRequest(
      `Cannot transition project status from "${from}" to "${to}".`,
    );
  }
}

interface TransitionOptions {
  comment?: string;
  user: { id: string; name?: string; email: string };
}

export async function applyTransition(
  projectId: string,
  tenantId: string,
  targetStatus: ProjectStatus,
  options: TransitionOptions,
) {
  const { comment, user } = options;

  // Retrieve project
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, isDeleted: false },
  });
  if (!project) throw ApiError.notFound("Project not found");

  validateTransition(project.status, targetStatus);

  const updateData: any = { status: targetStatus };
  const now = new Date();

  // Enforce workflow side-effects
  if (targetStatus === "RUNNING") {
    if (!project.startDate) {
      updateData.startDate = now;
    }
  } else if (targetStatus === "COMPLETED") {
    updateData.actualEndDate = now;
    updateData.completionPercent = 100;
  } else if (targetStatus === "CANCELLED" && !comment) {
    throw ApiError.badRequest(
      "A cancellation reason is required to cancel a project.",
    );
  }

  // Update Project
  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
    include: {
      ward: { select: { name: true, wardNumber: true } },
      department: { select: { name: true, code: true } },
    },
  });

  const transitionLabel = `Status changed from ${project.status} to ${targetStatus}`;
  const displayComment = comment
    ? `${transitionLabel}. Reason/Comment: ${comment}`
    : transitionLabel;

  // Log in project updates (visible to users)
  await prisma.projectUpdate.create({
    data: {
      tenantId,
      projectId,
      updateText: displayComment,
      updatedBy: user.name || user.email,
    },
  });

  // Log in system history timeline
  await prisma.projectTimeline.create({
    data: {
      tenantId,
      projectId,
      action: "STATUS_CHANGE",
      comment: displayComment,
      changedById: user.id,
      metadata: {
        fromStatus: project.status,
        toStatus: targetStatus,
        comment,
      },
    },
  });

  return updatedProject;
}
