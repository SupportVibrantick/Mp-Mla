import prisma from "../../../lib/prisma.js";

async function saveWardDemographics(
  tenantId: string,
  wardId: string,
  totalVoters: number,
  maleVoters: number,
  femaleVoters: number,
) {
  const rows = await prisma.demographics.findMany({
    where: { tenantId, wardId, wardAreaId: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (rows.length > 0) {
    await prisma.demographics.update({
      where: { id: rows[0].id },
      data: { totalVoters, maleVoters, femaleVoters },
    });

    if (rows.length > 1) {
      await prisma.demographics.deleteMany({
        where: { id: { in: rows.slice(1).map((row) => row.id) } },
      });
    }
    return;
  }

  await prisma.demographics.create({
    data: {
      tenantId,
      wardId,
      wardAreaId: null,
      totalVoters,
      maleVoters,
      femaleVoters,
    },
  });
}

/**
 * Recalculates derived voter counts (totalVoters, maleVoters, femaleVoters)
 * for a specific ward (and optional area), updating the corresponding Demographics records.
 * If targetWardId is omitted, syncs all wards for the tenant.
 */
export async function syncVoterDemographics(
  tenantId: string,
  targetWardId?: string,
): Promise<void> {
  const whereClause: any = { tenantId, isDeleted: false };
  if (targetWardId) whereClause.wardId = targetWardId;

  // ─── 1. Ward-Level Aggregations ───────────────────────
  const wardGenderStats = await prisma.voter.groupBy({
    by: ["wardId", "gender"],
    where: whereClause,
    _count: { id: true },
  });

  // Collect affected wardIds
  const wardIds = new Set<string>();
  if (targetWardId) {
    wardIds.add(targetWardId);
  } else {
    const wards = await prisma.ward.findMany({
      where: { tenantId },
      select: { id: true },
    });
    for (const ward of wards) wardIds.add(ward.id);
  }

  for (const wardId of wardIds) {
    const male =
      wardGenderStats.find((s) => s.wardId === wardId && s.gender === "MALE")
        ?._count.id || 0;
    const female =
      wardGenderStats.find((s) => s.wardId === wardId && s.gender === "FEMALE")
        ?._count.id || 0;
    const transgender =
      wardGenderStats.find(
        (s) => s.wardId === wardId && s.gender === "TRANSGENDER",
      )?._count.id || 0;
    const total = male + female + transgender;

    await saveWardDemographics(tenantId, wardId, total, male, female);
  }

  // ─── 2. Area-Level Aggregations (if area exists) ──────
  const areaGenderStats = await prisma.voter.groupBy({
    by: ["wardId", "wardAreaId", "gender"],
    where: { ...whereClause, wardAreaId: { not: null } },
    _count: { id: true },
  });

  const areaKeys = new Set<string>();
  for (const s of areaGenderStats) {
    if (s.wardAreaId) areaKeys.add(`${s.wardId}__${s.wardAreaId}`);
  }

  for (const key of areaKeys) {
    const [wId, aId] = key.split("__");
    const male =
      areaGenderStats.find(
        (s) => s.wardId === wId && s.wardAreaId === aId && s.gender === "MALE",
      )?._count.id || 0;
    const female =
      areaGenderStats.find(
        (s) =>
          s.wardId === wId && s.wardAreaId === aId && s.gender === "FEMALE",
      )?._count.id || 0;
    const transgender =
      areaGenderStats.find(
        (s) =>
          s.wardId === wId &&
          s.wardAreaId === aId &&
          s.gender === "TRANSGENDER",
      )?._count.id || 0;
    const total = male + female + transgender;

    await prisma.demographics.upsert({
      where: {
        tenantId_wardId_wardAreaId: {
          tenantId,
          wardId: wId,
          wardAreaId: aId,
        },
      },
      create: {
        tenantId,
        wardId: wId,
        wardAreaId: aId,
        totalVoters: total,
        maleVoters: male,
        femaleVoters: female,
      },
      update: {
        totalVoters: total,
        maleVoters: male,
        femaleVoters: female,
      },
    });
  }
}
