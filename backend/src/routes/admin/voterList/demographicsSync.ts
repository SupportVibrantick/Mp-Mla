import prisma from "../../../lib/prisma.js";
import logger from "../../../utils/logger.js";

/**
 * Recalculates derived voter counts (totalVoters, maleVoters, femaleVoters)
 * for a specific ward (and optional area), updating the corresponding Demographics records.
 * If targetWardId is omitted, syncs all wards for the tenant.
 */
export async function syncVoterDemographics(
  tenantId: string,
  targetWardId?: string,
): Promise<void> {
  try {
    const whereClause: any = { tenantId, isDeleted: false };
    if (targetWardId) {
      whereClause.wardId = targetWardId;
    }

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
      for (const s of wardGenderStats) wardIds.add(s.wardId);
    }

    for (const wardId of wardIds) {
      const male =
        wardGenderStats.find((s) => s.wardId === wardId && s.gender === "MALE")
          ?._count.id || 0;
      const female =
        wardGenderStats.find(
          (s) => s.wardId === wardId && s.gender === "FEMALE",
        )?._count.id || 0;
      const transgender =
        wardGenderStats.find(
          (s) => s.wardId === wardId && s.gender === "TRANSGENDER",
        )?._count.id || 0;
      const total = male + female + transgender;

      // Upsert ward-level demographics (wardAreaId = null)
      await prisma.demographics.upsert({
        where: {
          tenantId_wardId_wardAreaId: {
            tenantId,
            wardId,
            wardAreaId: null as any,
          },
        },
        create: {
          tenantId,
          wardId,
          wardAreaId: null,
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
  } catch (err) {
    logger.error(`Error in syncVoterDemographics: ${(err as Error).message}`);
  }
}
