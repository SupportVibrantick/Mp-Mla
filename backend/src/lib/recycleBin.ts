import prisma from "./prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { syncVoterDemographics } from "../routes/admin/voterList/demographicsSync.js";

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
  | "ward_area"
  | "task"
  | "event"
  | "appointment"
  | "janata_darbar_session"
  | "scheme"
  | "contact"
  | "document"
  | "correspondence"
  | "constituency"
  | "block"
  | "town_village"
  | "district"
  | "voter"
  | "voter_list";

interface ArchiveInput {
  tenantId?: string;
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
      tenantId: input.tenantId,
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
  const timeline = Array.isArray(grievanceObj.timeline)
    ? grievanceObj.timeline
    : [];
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
          tenantId: grievanceObj.tenantId,
          ...item,
          grievanceId: grievanceObj.id,
        })),
      });
    }

    if (!existing && attachments.length > 0) {
      await tx.grievanceAttachment.createMany({
        data: attachments.map((item: any) => ({
          tenantId: grievanceObj.tenantId,
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
          tenantId: institutionObj.tenantId,
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
  const greetings = Array.isArray(leaderObj.greetings)
    ? leaderObj.greetings
    : [];
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
          tenantId: leaderObj.tenantId,
          ...item,
          leaderId: leaderObj.id,
        })),
      });
    }
  });
}

async function restoreProject(payload: unknown) {
  const projectObj = ensureObject(payload, "project");
  const milestones = Array.isArray(projectObj.milestones)
    ? projectObj.milestones
    : [];
  const updates = Array.isArray(projectObj.updates) ? projectObj.updates : [];
  const attachments = Array.isArray(projectObj.attachments)
    ? projectObj.attachments
    : [];

  const projectData = omit(projectObj, [
    "milestones",
    "updates",
    "attachments",
  ]);
  const projectUpdateData = omitSystemFields(
    projectData as Record<string, any>,
  );

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
          tenantId: projectObj.tenantId,
          ...item,
          projectId: projectObj.id,
        })),
        skipDuplicates: true,
      });
    }

    if (updates.length > 0) {
      await tx.projectUpdate.createMany({
        data: updates.map((item: any) => ({
          tenantId: projectObj.tenantId,
          ...item,
          projectId: projectObj.id,
        })),
        skipDuplicates: true,
      });
    }

    if (attachments.length > 0) {
      await tx.projectAttachment.createMany({
        data: attachments.map((item: any) => ({
          tenantId: projectObj.tenantId,
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
  const milestoneData = omitSystemFields(milestone);

  const existing = await prisma.projectMilestone.findUnique({
    where: { id: milestone.id as string },
    select: { id: true },
  });

  if (existing) {
    await prisma.projectMilestone.update({
      where: { id: milestone.id as string },
      data: { ...(milestoneData as any) },
    });
  } else {
    await prisma.projectMilestone.create({
      data: omit(milestone, ["createdAt"]) as any,
    });
  }
}

async function restoreWard(payload: unknown) {
  const wardObj = ensureObject(payload, "ward");
  const areas = Array.isArray(wardObj.areas) ? wardObj.areas : [];
  const councillors = Array.isArray(wardObj.councillors)
    ? wardObj.councillors
    : [];
  const demographics = Array.isArray(wardObj.demographics)
    ? wardObj.demographics
    : [];

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
          tenantId: wardObj.tenantId,
          ...(omit(item, ["demographics"]) as any),
          wardId: wardObj.id,
        })) as any[],
        skipDuplicates: true,
      });
    }

    if (councillors.length > 0) {
      await tx.wardCouncillor.createMany({
        data: councillors.map((item: any) => ({
          tenantId: wardObj.tenantId,
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
  const demographics = Array.isArray(areaObj.demographics)
    ? areaObj.demographics
    : [];
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
    await prisma.fund.create({
      data: omit(fundObj, ["transactions", "createdAt", "updatedAt"]) as any,
    });
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
    await prisma.fundTransaction.create({
      data: omit(txn, ["createdAt", "updatedAt"]) as any,
    });
  }
}

async function restoreTask(payload: unknown) {
  const taskObj = ensureObject(payload, "task");
  const taskData = omit(taskObj, ["timeline"]);
  const taskUpdateData = omitSystemFields(taskData as Record<string, any>);

  await prisma.$transaction(async (tx) => {
    const existingTask = await tx.task.findUnique({
      where: { id: taskObj.id as string },
      select: { id: true },
    });

    if (existingTask) {
      await tx.task.update({
        where: { id: taskObj.id as string },
        data: { ...(taskUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.task.create({ data: taskObj as any });
    }
  });
}

async function restoreEvent(payload: unknown) {
  const eventObj = ensureObject(payload, "event");
  const eventData = omit(eventObj, [
    "agenda",
    "guests",
    "team",
    "attendance",
    "media",
    "report",
    "timeline",
    "tasks",
  ]);
  const eventUpdateData = omitSystemFields(eventData as Record<string, any>);

  await prisma.$transaction(async (tx) => {
    const existingEvent = await tx.event.findUnique({
      where: { id: eventObj.id as string },
      select: { id: true },
    });

    if (existingEvent) {
      await tx.event.update({
        where: { id: eventObj.id as string },
        data: { ...(eventUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.event.create({ data: eventObj as any });
    }
  });
}

async function restoreAppointment(payload: unknown) {
  const apptObj = ensureObject(payload, "appointment");
  const apptData = omit(apptObj, ["tasks"]);
  const apptUpdateData = omitSystemFields(apptData as Record<string, any>);

  await prisma.$transaction(async (tx) => {
    const existingAppt = await tx.appointment.findUnique({
      where: { id: apptObj.id as string },
      select: { id: true },
    });

    if (existingAppt) {
      await tx.appointment.update({
        where: { id: apptObj.id as string },
        data: { ...(apptUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.appointment.create({ data: apptObj as any });
    }
  });
}

async function restoreJanataSession(payload: unknown) {
  const sessionObj = ensureObject(payload, "janata_darbar_session");
  const sessionData = omit(sessionObj, ["tokens", "grievances", "tasks"]);
  const sessionUpdateData = omitSystemFields(
    sessionData as Record<string, any>,
  );

  await prisma.$transaction(async (tx) => {
    const existingSession = await tx.janataDarbarSession.findUnique({
      where: { id: sessionObj.id as string },
      select: { id: true },
    });

    if (existingSession) {
      await tx.janataDarbarSession.update({
        where: { id: sessionObj.id as string },
        data: { ...(sessionUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.janataDarbarSession.create({ data: sessionObj as any });
    }
  });
}

async function restoreScheme(payload: unknown) {
  const schemeObj = ensureObject(payload, "scheme");
  const schemeData = omit(schemeObj, ["applications"]);
  const schemeUpdateData = omitSystemFields(schemeData as Record<string, any>);

  await prisma.$transaction(async (tx) => {
    const existingScheme = await tx.scheme.findUnique({
      where: { id: schemeObj.id as string },
      select: { id: true },
    });

    if (existingScheme) {
      await tx.scheme.update({
        where: { id: schemeObj.id as string },
        data: { ...(schemeUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.scheme.create({ data: schemeObj as any });
    }
  });
}

async function restoreContact(payload: unknown) {
  const contactObj = ensureObject(payload, "contact");
  const contactData = omit(contactObj, ["interactions", "followUps"]);
  const contactUpdateData = omitSystemFields(
    contactData as Record<string, any>,
  );

  await prisma.$transaction(async (tx) => {
    const existingContact = await tx.contact.findUnique({
      where: { id: contactObj.id as string },
      select: { id: true },
    });

    if (existingContact) {
      await tx.contact.update({
        where: { id: contactObj.id as string },
        data: { ...(contactUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.contact.create({ data: contactObj as any });
    }
  });
}

async function restoreDocument(payload: unknown) {
  const docObj = ensureObject(payload, "document");
  const docData = omit(docObj, ["versions", "links"]);
  const docUpdateData = omitSystemFields(docData as Record<string, any>);

  await prisma.$transaction(async (tx) => {
    const existingDoc = await tx.document.findUnique({
      where: { id: docObj.id as string },
      select: { id: true },
    });

    if (existingDoc) {
      await tx.document.update({
        where: { id: docObj.id as string },
        data: { ...(docUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.document.create({ data: docObj as any });
    }
  });
}

async function restoreCorrespondence(payload: unknown) {
  const corrObj = ensureObject(payload, "correspondence");
  const corrData = omit(corrObj, ["documents", "timeline", "tasks"]);
  const corrUpdateData = omitSystemFields(corrData as Record<string, any>);

  await prisma.$transaction(async (tx) => {
    const existingCorr = await tx.correspondence.findUnique({
      where: { id: corrObj.id as string },
      select: { id: true },
    });

    if (existingCorr) {
      await tx.correspondence.update({
        where: { id: corrObj.id as string },
        data: { ...(corrUpdateData as any), isDeleted: false },
      });
    } else {
      await tx.correspondence.create({ data: corrObj as any });
    }
  });
}

async function restoreGeographyRecord(
  entity: "constituency" | "block" | "town_village" | "district",
  payload: unknown,
) {
  const record = ensureObject(payload, entity);

  const recordId = record.id;

  if (typeof recordId !== "string" || !recordId.trim()) {
    throw ApiError.badRequest(`Cannot restore ${entity}: invalid record id`);
  }

  /**
   * Dynamic Prisma delegate.
   *
   * We deliberately cast only this delegate to `any`
   * because Constituency, Block and TownVillage have
   * different generated Prisma delegate signatures.
   */
  const model = (
    entity === "constituency"
      ? prisma.constituency
      : entity === "block"
        ? prisma.block
        : entity === "town_village"
          ? prisma.townVillage
          : prisma.district
  ) as any;

  /**
   * Remove fields that must not be blindly restored.
   *
   * ID is handled separately because we want to preserve
   * the original record ID if the record was permanently
   * removed before restoration.
   */
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    _count: _count,
    isDeleted: _isDeleted,
    deletedAt: _deletedAt,
    ...restoreData
  } = record;

  const existing = await model.findUnique({
    where: {
      id: recordId,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    await model.update({
      where: {
        id: recordId,
      },

      data: {
        ...restoreData,
        isDeleted: false,
        deletedAt: null,
      },
    });

    return;
  }

  await model.create({
    data: {
      id: recordId,
      ...restoreData,
      isDeleted: false,
      deletedAt: null,
    },
  });
}

async function restoreVoter(payload: unknown) {
  const voterObj = ensureObject(payload, "voter");
  const voterData = omitSystemFields(voterObj);

  const existing = await prisma.voter.findUnique({
    where: { id: voterObj.id as string },
    select: { id: true, wardId: true, tenantId: true },
  });

  if (existing) {
    await prisma.voter.update({
      where: { id: voterObj.id as string },
      data: { ...(voterData as any), isDeleted: false, status: "ACTIVE" },
    });
    if (existing.tenantId && existing.wardId) {
      await syncVoterDemographics(existing.tenantId, existing.wardId);
    }
  } else {
    await prisma.voter.create({
      data: { ...(voterObj as any), isDeleted: false, status: "ACTIVE" },
    });
    if (voterObj.tenantId && voterObj.wardId) {
      await syncVoterDemographics(
        voterObj.tenantId as string,
        voterObj.wardId as string,
      );
    }
  }
}

export async function restoreRecycleBinEntry(entry: {
  id: string;
  entityType: string;
  payload: unknown;
}) {
  switch (entry.entityType as RecycleEntityType) {
    case "voter":
    case "voter_list":
      await restoreVoter(entry.payload);
      break;
    case "community_group":
      await restoreCommunityGroup(entry.payload);
      break;
    case "department":
      await restoreDepartment(entry.payload);
      break;
    case "grievance":
      await restoreGrievance(entry.payload);
      break;
    case "event":
      await restoreEvent(entry.payload);
      break;
    case "appointment":
      await restoreAppointment(entry.payload);
      break;
    case "janata_darbar_session":
      await restoreJanataSession(entry.payload);
      break;
    case "scheme":
      await restoreScheme(entry.payload);
      break;
    case "contact":
      await restoreContact(entry.payload);
      break;
    case "document":
      await restoreDocument(entry.payload);
      break;
    case "correspondence":
      await restoreCorrespondence(entry.payload);
      break;
    case "task":
      await restoreTask(entry.payload);
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
    case "constituency":
      await restoreGeographyRecord("constituency", entry.payload);
      break;
    case "block":
      await restoreGeographyRecord("block", entry.payload);
      break;
    case "town_village":
      await restoreGeographyRecord("town_village", entry.payload);
      break;
    case "district":
      await restoreGeographyRecord("district", entry.payload);
      break;
    default:
      throw ApiError.badRequest(
        `Restore not supported for entity type: ${entry.entityType}`,
      );
  }
}

export async function permanentlyDeleteRecycledRecord(entry: {
  entityType: string;
  recordId: string;
}) {
  switch (entry.entityType as RecycleEntityType) {
    case "voter":
    case "voter_list":
      await prisma.voter.deleteMany({ where: { id: entry.recordId } });
      break;
    case "community_group":
      await prisma.communityGroup.deleteMany({ where: { id: entry.recordId } });
      break;
    case "grievance":
      await prisma.grievance.deleteMany({ where: { id: entry.recordId } });
      break;
    case "task":
      await prisma.task.deleteMany({ where: { id: entry.recordId } });
      break;
    case "event":
      await prisma.event.deleteMany({ where: { id: entry.recordId } });
      break;
    case "appointment":
      await prisma.appointment.deleteMany({ where: { id: entry.recordId } });
      break;
    case "janata_darbar_session":
      await prisma.janataDarbarSession.deleteMany({
        where: { id: entry.recordId },
      });
      break;
    case "scheme":
      await prisma.scheme.deleteMany({ where: { id: entry.recordId } });
      break;
    case "contact":
      await prisma.contact.deleteMany({ where: { id: entry.recordId } });
      break;
    case "document":
      await prisma.document.deleteMany({ where: { id: entry.recordId } });
      break;
    case "correspondence":
      await prisma.correspondence.deleteMany({ where: { id: entry.recordId } });
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
      await prisma.voter.deleteMany({ where: { wardId: entry.recordId } });
      await prisma.wardArea.deleteMany({ where: { wardId: entry.recordId } });
      await prisma.wardCouncillor.deleteMany({ where: { wardId: entry.recordId } });
      await prisma.demographics.deleteMany({ where: { wardId: entry.recordId } });
      await prisma.ward.deleteMany({ where: { id: entry.recordId } });
      break;
    case "ward_area":
      await prisma.demographics.deleteMany({ where: { wardAreaId: entry.recordId } });
      await prisma.wardArea.deleteMany({ where: { id: entry.recordId } });
      break;
    case "project_milestone":
      await prisma.projectMilestone.deleteMany({
        where: { id: entry.recordId },
      });
      break;
    case "incharge":
      await prisma.incharge.deleteMany({ where: { id: entry.recordId } });
      break;
    case "department":
      await (prisma as any).department.deleteMany({
        where: { id: entry.recordId },
      });
      break;
    case "fund":
      await (prisma as any).fund.deleteMany({ where: { id: entry.recordId } });
      break;
    case "fund_transaction":
      await (prisma as any).fundTransaction.deleteMany({
        where: { id: entry.recordId },
      });
      break;
    case "constituency":
      await prisma.representativeProfile.deleteMany({
        where: { constituencyId: entry.recordId },
      });
      await prisma.constituency.deleteMany({ where: { id: entry.recordId } });
      break;
    case "block":
      await prisma.block.deleteMany({ where: { id: entry.recordId } });
      break;
    case "town_village":
      await prisma.townVillage.deleteMany({ where: { id: entry.recordId } });
      break;
    case "district":
      await prisma.district.deleteMany({ where: { id: entry.recordId } });
      break;
    default:
      break;
  }
}
