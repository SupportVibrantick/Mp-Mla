/**
 * Script: cleanVoters.ts
 * Purpose: Permanently deletes voter data, associated identity verifications,
 *          voter recycle bin entries, and resets ward voter demographics.
 *
 * Usage:
 *   npx tsx src/scripts/cleanVoters.ts
 *   npx tsx src/scripts/cleanVoters.ts --mode=all
 *   npx tsx src/scripts/cleanVoters.ts --mode=soft-deleted
 *   npx tsx src/scripts/cleanVoters.ts --tenantId=tenant-default
 */

import prisma from "../lib/prisma.js";

// Parse CLI arguments
const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1] || "all";
const tenantIdArg = args.find((a) => a.startsWith("--tenantId="))?.split("=")[1];

async function cleanVoters() {
  console.log("=================================================");
  console.log("🚀 STARTING VOTER LIST CLEANUP SCRIPT");
  console.log(`Mode: ${modeArg.toUpperCase()} (options: all, soft-deleted)`);
  if (tenantIdArg) console.log(`Target Tenant: ${tenantIdArg}`);
  console.log("=================================================");

  try {
    // 1. Build where clause for voters
    const voterWhere: any = {};
    if (tenantIdArg) voterWhere.tenantId = tenantIdArg;

    if (modeArg === "soft-deleted") {
      voterWhere.OR = [
        { isDeleted: true },
        { status: "DELETED" },
      ];
    }

    // Count target voters
    const totalMatchingVoters = await prisma.voter.count({ where: voterWhere });
    console.log(`\n🔍 Found ${totalMatchingVoters} voter(s) matching criteria.`);

    if (totalMatchingVoters === 0) {
      console.log("ℹ️ No voters found to delete.");
    } else {
      // Find IDs for dependent deletion
      const voters = await prisma.voter.findMany({
        where: voterWhere,
        select: { id: true, wardId: true, tenantId: true },
      });
      const voterIds = voters.map((v) => v.id);
      const affectedWardIds = Array.from(new Set(voters.map((v) => v.wardId).filter(Boolean)));
      const affectedTenantIds = Array.from(new Set(voters.map((v) => v.tenantId).filter(Boolean)));

      // Helper function to chunk array to prevent Postgres limit (max 32767 bind parameters)
      const CHUNK_SIZE = 5000;
      const chunkArray = <T>(array: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      };
      const voterIdChunks = chunkArray(voterIds, CHUNK_SIZE);

      // 2. Delete dependent VoterIdentityVerification records
      console.log("\n🧹 Step 1: Deleting dependent voter identity verifications...");
      let verificationsDeletedCount = 0;
      for (const chunk of voterIdChunks) {
        const res = await prisma.voterIdentityVerification.deleteMany({
          where: { voterId: { in: chunk } },
        });
        verificationsDeletedCount += res.count;
      }
      console.log(`   ✓ Deleted ${verificationsDeletedCount} identity verification record(s).`);

      // 3. Delete Voters
      console.log("\n🧹 Step 2: Permanently deleting voter records...");
      let votersDeletedCount = 0;
      for (const chunk of voterIdChunks) {
        const res = await prisma.voter.deleteMany({
          where: { id: { in: chunk } },
        });
        votersDeletedCount += res.count;
      }
      console.log(`   ✓ Deleted ${votersDeletedCount} voter record(s).`);

      // 4. Delete Voter Recycle Bin entries
      console.log("\n🧹 Step 3: Cleaning voter entries from Recycle Bin...");
      let recycleDeletedCount = 0;
      const generalRecycleWhere: any = {
        OR: [
          { entityType: "voter" },
          { entityType: "voter_list" },
          { module: "voter_list" },
        ],
      };
      if (tenantIdArg) generalRecycleWhere.tenantId = tenantIdArg;

      const generalRecycle = await (prisma as any).recycleBinEntry.deleteMany({
        where: generalRecycleWhere,
      });
      recycleDeletedCount += generalRecycle.count;

      for (const chunk of voterIdChunks) {
        const recordWhere: any = {
          recordId: { in: chunk },
        };
        if (tenantIdArg) recordWhere.tenantId = tenantIdArg;

        const res = await (prisma as any).recycleBinEntry.deleteMany({
          where: recordWhere,
        });
        recycleDeletedCount += res.count;
      }
      console.log(`   ✓ Deleted ${recycleDeletedCount} voter entry/entries from Recycle Bin.`);

      // 5. Reset Demographics
      console.log("\n🧹 Step 4: Resetting ward demographics voter counts...");
      if (modeArg === "all") {
        const demoWhere: any = {};
        if (tenantIdArg) demoWhere.tenantId = tenantIdArg;

        const demoUpdated = await prisma.demographics.updateMany({
          where: demoWhere,
          data: {
            totalVoters: 0,
            maleVoters: 0,
            femaleVoters: 0,
          },
        });
        console.log(`   ✓ Reset demographics voter counters across ${demoUpdated.count} records.`);
      } else {
        // Soft-deleted mode: re-calculate remaining active voters
        for (const tenantId of affectedTenantIds) {
          for (const wardId of affectedWardIds) {
            const activeStats = await prisma.voter.groupBy({
              by: ["gender"],
              where: { tenantId, wardId, isDeleted: false },
              _count: { id: true },
            });
            const male = activeStats.find((s) => s.gender === "MALE")?._count.id || 0;
            const female = activeStats.find((s) => s.gender === "FEMALE")?._count.id || 0;
            const trans = activeStats.find((s) => s.gender === "TRANSGENDER")?._count.id || 0;
            const total = male + female + trans;

            await prisma.demographics.updateMany({
              where: { tenantId, wardId, wardAreaId: null },
              data: {
                totalVoters: total,
                maleVoters: male,
                femaleVoters: female,
              },
            });
          }
        }
        console.log(`   ✓ Re-synchronized demographics for ${affectedWardIds.length} affected ward(s).`);
      }
    }

    console.log("\n=================================================");
    console.log("✅ VOTER CLEANUP COMPLETED SUCCESSFULLY");
    console.log("=================================================");
  } catch (error: any) {
    console.error("\n❌ Error running cleanVoters script:", error?.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanVoters();
