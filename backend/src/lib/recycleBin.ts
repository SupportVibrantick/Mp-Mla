import prisma from "./prisma.js";
import { ApiError } from "../utils/ApiError.js";

export type RecycleEntityType =
  | "community_group"
  | "department"
  | "fund"
  | "fund_transaction"
  | "grievance"
  | "institution"
  | "incharge"
  | "leader"
  | "project"
  | "project_milestone"
  | "ward"
  | "ward_area";

interface ArchiveInput {
  module: string;
  entityType: RecycleEntityType;
  recordId: string;
  recordLabel?: string | null;
  payload: unknown;
  deletedById?: string;
}

export async function archiveToRecycleBin(input: ArchiveInput) {
  return (prisma as any).recycleBinEntry.create({
    data: {
      module: input.module,
      entityType: input.entityType,
      recordId: input.recordId,
      recordLabel: input.recordLabel ?? null,
      payload: input.payload as any,
      deletedById: input.deletedById,
    },
  });
}

function omitSystemFields<T extends Record<string, any>>(obj: T) {
  return omit(obj, ["id", "createdAt", "updatedAt", "_count"] as (keyof T)[]);
}

export async function isRecordInRecycleBin(
  entityType: RecycleEntityType,
  recordId: string,
): Promise<boolean> {
  const count = await (prisma as any).recycleBinEntry.count({
    where: {
      entityType,
      recordId,
      restoredAt: null,
    },
  });
  return count > 0;
}

export async function getRecycledRecordIds(
  entityType: RecycleEntityType,
): Promise<string[]> {
  const records = await (prisma as any).recycleBinEntry.findMany({
    where: { entityType, restoredAt: null },
    select: { recordId: true },
  });
  return records.map((r: { recordId: string }) => r.recordId);
}

function ensureObject(value: unknown, label: string): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw ApiError.badRequest(`Invalid recycle payload for ${label}`);
  }
  return value as Record<string, any>;
}

function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const copy = { ...obj };
  for (const key of keys) {
    delete copy[key];
  }
  return copy;
}

async function recalculateProjectBudgetUsed(projectId: string) {
  /*
  const txns = await prisma.fundTransaction.findMany({
    where: { projectId, type: "UTILIZATION" },
    select: { amount: true },
  });
  const budgetUsed = txns.reduce((sum: number, t: any) => sum + t.amount, 0);
  await prisma.project.update({ where: { id: projectId }, data: { budgetUsed } });
  */
}

async function recalculateFundTotals(fundId: string) {
  /*
  const txns = await prisma.fundTransaction.findMany({ where: { fundId } });
  let totalAllocated = 0;
  let totalReleased = 0;
  let totalUtilized = 0;

  for (const txn of txns) {
    if (txn.type === "ALLOCATION") totalAllocated += txn.amount;
    if (txn.type === "RELEASE") totalReleased += txn.amount;
    if (txn.type === "UTILIZATION") totalUtilized += txn.amount;
  }

  await prisma.fund.update({
    where: { id: fundId },
    data: { totalAllocated, totalReleased, totalUtilized },
  });
  */
}

async function restoreCommunityGroup(payload: unknown) {
  const group = ensureObject(payload, "community group");
  const existing = await prisma.communityGroup.findUnique({
    where: { id: group.id as string },
    select: { id: true },
  });

  if (existing) {
    await prisma.communityGroup.update({
      where: { id: group.id as string },
      data: { ...omitSystemFields(group), isDeleted: false },
    });
    return;
  }

  await prisma.communityGroup.create({ data: group as any });
}

async function restoreDepartment(payload: unknown) {
  const departmentData = ensureObject(payload, "department");
  const existing = await prisma.department.findUnique({
    where: { id: departmentData.id as string },
    select: { id: true },
  });

  if (existing) {
    await prisma.department.update({
      where: { id: departmentData.id as string },
      data: { ...(omitSystemFields(departmentData) as any), isDeleted: false },
    });
  } else {
    await prisma.department.create({ data: departmentData as any });
  }
}

async function restoreGrievance(payload: unknown) {
  const grievanceObj = ensureObject(payload, "grievance");
  const timeline = Array.isArray(grievanceObj.timeline) ? grievanceObj.timeline : [];
  const attachments = Array.isArray(grievanceObj.attachments)
    ? grievanceObj.attachments
    : [];

  const grievanceData = omit(grievanceObj, ["timeline", "attachments"]);
  const grievanceUpdateData = omitSystemFields(grievanceData);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.grievance.findUnique({
      where: { id: grievanceObj.id as string },
      select: { id: true },
    });

    if (existing) {
      await tx.grievance.update({
        where: { id: grievanceObj.id as string },
        data: { ...(grievanceUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.grievance.create({ data: grievanceData as any });
    }

    if (!existing && timeline.length > 0) {
      await tx.grievanceTimeline.createMany({
        data: timeline.map((item: any) => ({
          ...item,
          grievanceId: grievanceObj.id,
        })),
      });
    }

    if (!existing && attachments.length > 0) {
      await tx.grievanceAttachment.createMany({
        data: attachments.map((item: any) => ({
          ...item,
          grievanceId: grievanceObj.id,
        })),
      });
    }
  });
}

async function restoreInstitution(payload: unknown) {
  const institutionObj = ensureObject(payload, "institution");
  const incharges = Array.isArray(institutionObj.incharges)
    ? institutionObj.incharges
    : [];

  const institutionData = omit(institutionObj, ["incharges"]);
  const institutionUpdateData = omitSystemFields(institutionData);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.institution.findUnique({
      where: { id: institutionObj.id as string },
      select: { id: true },
    });

    if (existing) {
      await tx.institution.update({
        where: { id: institutionObj.id as string },
        data: { ...(institutionUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.institution.create({ data: institutionData as any });
    }

    if (!existing && incharges.length > 0) {
      await tx.incharge.createMany({
        data: incharges.map((item: any) => ({
          ...item,
          institutionId: institutionObj.id,
        })),
      });
    }
  });
}

async function restoreIncharge(payload: unknown) {
  const incharge = ensureObject(payload, "incharge");
  await prisma.incharge.create({ data: incharge as any });
}

async function restoreLeader(payload: unknown) {
  const leaderObj = ensureObject(payload, "leader");
  const greetings = Array.isArray(leaderObj.greetings) ? leaderObj.greetings : [];
  const leaderData = omit(leaderObj, ["greetings"]);
  const leaderUpdateData = omitSystemFields(leaderData);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.leader.findUnique({
      where: { id: leaderObj.id as string },
      select: { id: true },
    });

    if (existing) {
      await tx.leader.update({
        where: { id: leaderObj.id as string },
        data: { ...(leaderUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.leader.create({ data: leaderData as any });
    }

    if (!existing && greetings.length > 0) {
      await tx.leaderGreeting.createMany({
        data: greetings.map((item: any) => ({
          ...item,
          leaderId: leaderObj.id,
        })),
      });
    }
  });
}

async function restoreProject(payload: unknown) {
  const projectObj = ensureObject(payload, "project");
  const milestones = Array.isArray(projectObj.milestones) ? projectObj.milestones : [];
  const updates = Array.isArray(projectObj.updates) ? projectObj.updates : [];
  const attachments = Array.isArray(projectObj.attachments)
    ? projectObj.attachments
    : [];

  const projectData = omit(projectObj, ["milestones", "updates", "attachments"]);
  const projectUpdateData = omitSystemFields(projectData as Record<string, any>);

  await prisma.$transaction(async (tx) => {
    const existingProject = await tx.project.findUnique({
      where: { id: projectObj.id as string },
      select: { id: true },
    });

    if (existingProject) {
      await tx.project.update({
        where: { id: projectObj.id as string },
        data: { ...(projectUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.project.create({ data: projectData as any });
    }

    if (milestones.length > 0) {
      await tx.projectMilestone.createMany({
        data: milestones.map((item: any) => ({
          ...item,
          projectId: projectObj.id,
        })),
        skipDuplicates: true,
      });
    }

    if (updates.length > 0) {
      await tx.projectUpdate.createMany({
        data: updates.map((item: any) => ({
          ...item,
          projectId: projectObj.id,
        })),
        skipDuplicates: true,
      });
    }

    if (attachments.length > 0) {
      await tx.projectAttachment.createMany({
        data: attachments.map((item: any) => ({
          ...item,
          projectId: projectObj.id,
        })),
        skipDuplicates: true,
      });
    }
  });
}

async function restoreProjectMilestone(payload: unknown) {
  const milestone = ensureObject(payload, "project milestone");
  await prisma.projectMilestone.create({ data: milestone as any });
}

async function restoreWard(payload: unknown) {
  const wardObj = ensureObject(payload, "ward");
  const areas = Array.isArray(wardObj.areas) ? wardObj.areas : [];
  const councillors = Array.isArray(wardObj.councillors) ? wardObj.councillors : [];
  const demographics = Array.isArray(wardObj.demographics) ? wardObj.demographics : [];

  const wardData = omit(wardObj, ["areas", "councillors", "demographics"]);
  const wardUpdateData = omitSystemFields(wardData as Record<string, any>);

  await prisma.$transaction(async (tx) => {
    const existingWard = await tx.ward.findUnique({
      where: { id: wardObj.id as string },
      select: { id: true },
    });

    if (existingWard) {
      await tx.ward.update({
        where: { id: wardObj.id as string },
        data: { ...(wardUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.ward.create({ data: wardData as any });
    }

    if (areas.length > 0) {
      await tx.wardArea.createMany({
        data: areas.map((item: any) => ({
          ...(omit(item, ["demographics"]) as any),
          wardId: wardObj.id,
        })) as any[],
        skipDuplicates: true,
      });
    }

    if (councillors.length > 0) {
      await tx.wardCouncillor.createMany({
        data: councillors.map((item: any) => ({
          ...item,
          wardId: wardObj.id,
        })),
        skipDuplicates: true,
      });
    }

    if (demographics.length > 0) {
      await tx.demographics.createMany({
        data: demographics.map((item: any) => ({
          ...item,
          wardId: wardObj.id,
        })),
        skipDuplicates: true,
      });
    }
  });
}
async function restoreWardArea(payload: unknown) {
  const areaObj = ensureObject(payload, "ward area");
  const demographics = Array.isArray(areaObj.demographics) ? areaObj.demographics : [];
  const communityGroupIds = Array.isArray(areaObj.communityGroupIds)
    ? areaObj.communityGroupIds
    : [];

  const areaData = omit(areaObj, ["demographics", "communityGroupIds"]);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.wardArea.findUnique({
      where: { id: areaObj.id as string },
      select: { id: true },
    });

    if (existing) {
      await tx.wardArea.update({
        where: { id: areaObj.id as string },
        data: { ...(omitSystemFields(areaData) as any), isDeleted: false },
      });
    } else {
      await tx.wardArea.create({ data: areaData as any });
    }

    if (!existing && demographics.length > 0) {
      await tx.demographics.createMany({
        data: demographics.map((item: any) => ({
          ...item,
          wardId: areaObj.wardId,
          wardAreaId: areaObj.id,
        })),
      });
    }

    if (communityGroupIds.length > 0) {
      await tx.communityGroup.updateMany({
        where: { id: { in: communityGroupIds } },
        data: { wardAreaId: areaObj.id, isDeleted: false },
      });
    }
  });
}

async function restoreFund(payload: unknown) {
  const fundObj = ensureObject(payload, "fund");
  const fundData = omitSystemFields(fundObj);

  const existing = await prisma.fund.findUnique({
    where: { id: fundObj.id as string },
    select: { id: true },
  });

  if (existing) {
    await prisma.fund.update({
      where: { id: fundObj.id as string },
      data: { ...(fundData as any), isDeleted: false },
    });
    // Restore transactions belonging to this fund
    await prisma.fundTransaction.updateMany({
      where: { fundId: fundObj.id as string },
      data: { isDeleted: false },
    });
  } else {
    await prisma.fund.create({ data: omit(fundObj, ["transactions", "createdAt", "updatedAt"]) as any });
  }
}

async function restoreFundTransaction(payload: unknown) {
  const txn = ensureObject(payload, "fund transaction");
  const txnData = omitSystemFields(txn);
  
  const existing = await prisma.fundTransaction.findUnique({
    where: { id: txn.id as string },
    select: { id: true },
  });

  if (existing) {
    await prisma.fundTransaction.update({
      where: { id: txn.id as string },
      data: { ...(txnData as any), isDeleted: false },
    });
  } else {
    await prisma.fundTransaction.create({ data: omit(txn, ["createdAt", "updatedAt"]) as any });
  }
}

export async function restoreRecycleBinEntry(entry: {
  id: string;
  entityType: string;
  payload: unknown;
}) {
  switch (entry.entityType as RecycleEntityType) {
    case "community_group":
      await restoreCommunityGroup(entry.payload);
      break;
    case "department":
      await restoreDepartment(entry.payload);
      break;
    case "grievance":
      await restoreGrievance(entry.payload);
      break;
    case "institution":
      await restoreInstitution(entry.payload);
      break;
    case "incharge":
      await restoreIncharge(entry.payload);
      break;
    case "leader":
      await restoreLeader(entry.payload);
      break;
    case "project":
      await restoreProject(entry.payload);
      break;
    case "project_milestone":
      await restoreProjectMilestone(entry.payload);
      break;
    case "ward":
      await restoreWard(entry.payload);
      break;
    case "ward_area":
      await restoreWardArea(entry.payload);
      break;
    case "fund":
      await restoreFund(entry.payload);
      break;
    case "fund_transaction":
      await restoreFundTransaction(entry.payload);
      break;
    default:
      throw ApiError.badRequest(`Restore not supported for entity type: ${entry.entityType}`);
  }
}

export async function permanentlyDeleteRecycledRecord(entry: {
  entityType: string;
  recordId: string;
}) {
  switch (entry.entityType as RecycleEntityType) {
    case "community_group":
      await prisma.communityGroup.deleteMany({ where: { id: entry.recordId } });
      break;
    case "grievance":
      await prisma.grievance.deleteMany({ where: { id: entry.recordId } });
      break;
    case "institution":
      await prisma.institution.deleteMany({ where: { id: entry.recordId } });
      break;
    case "leader":
      await prisma.leader.deleteMany({ where: { id: entry.recordId } });
      break;
    case "project":
      await prisma.project.deleteMany({ where: { id: entry.recordId } });
      break;
    case "ward":
      await prisma.ward.deleteMany({ where: { id: entry.recordId } });
      break;
    case "ward_area":
      await prisma.wardArea.deleteMany({ where: { id: entry.recordId } });
      break;
    case "project_milestone":
      await prisma.projectMilestone.deleteMany({ where: { id: entry.recordId } });
      break;
    case "incharge":
      await prisma.incharge.deleteMany({ where: { id: entry.recordId } });
      break;
    case "department":
      await (prisma as any).department.deleteMany({ where: { id: entry.recordId } });
      break;
    case "fund":
      await (prisma as any).fund.deleteMany({ where: { id: entry.recordId } });
      break;
    case "fund_transaction":
      await (prisma as any).fundTransaction.deleteMany({ where: { id: entry.recordId } });
      break;
    default:
      break;
  }
}


