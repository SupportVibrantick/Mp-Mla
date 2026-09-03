/**
 * Script: cleanRecycleBin.ts
 * Purpose: Completely cleans/purges data from the Recycle Bin.
 *          By default, it also permanently deletes the underlying physical records
 *          from their corresponding database tables (voters, grievances, wards, etc.).
 *
 * Usage:
 *   npx tsx src/scripts/cleanRecycleBin.ts
 *   npx tsx src/scripts/cleanRecycleBin.ts --module=voter_list
 *   npx tsx src/scripts/cleanRecycleBin.ts --tenantId=tenant-default
 *   npx tsx src/scripts/cleanRecycleBin.ts --skip-underlying
 */

import prisma from "../lib/prisma.js";
import { permanentlyDeleteRecycledRecord } from "../lib/recycleBin.js";
import { syncVoterDemographics } from "../routes/admin/voterList/demographicsSync.js";

// Parse CLI arguments
const args = process.argv.slice(2);
const tenantIdArg = args.find((a) => a.startsWith("--tenantId="))?.split("=")[1];
const moduleArg = args.find((a) => a.startsWith("--module="))?.split("=")[1];
const skipUnderlying = args.includes("--skip-underlying");

async function cleanRecycleBin() {
  console.log("=================================================");
  console.log("🚀 STARTING RECYCLE BIN CLEANUP SCRIPT");
  if (tenantIdArg) console.log(`Target Tenant: ${tenantIdArg}`);
  if (moduleArg) console.log(`Target Module: ${moduleArg}`);
  console.log(`Purge Underlying Database Records: ${!skipUnderlying ? "YES" : "NO"}`);
  console.log("=================================================");

  try {
    // 1. Query target RecycleBin entries
    const whereClause: any = {};
    if (tenantIdArg) whereClause.tenantId = tenantIdArg;
    if (moduleArg) whereClause.module = moduleArg;

    const totalCount = await (prisma as any).recycleBinEntry.count({
      where: whereClause,
    });
    console.log(`\n🔍 Found ${totalCount} Recycle Bin entry/entries.`);

    if (totalCount === 0) {
      console.log("ℹ️ Recycle Bin is already empty.");
      return;
    }

    const entries = await (prisma as any).recycleBinEntry.findMany({
      where: whereClause,
    });

    // 2. Permanently delete underlying physical records if not skipped
    const entityBreakdown: Record<string, number> = {};
    let underlyingPurgedCount = 0;
    const affectedWards = new Set<string>();

    if (!skipUnderlying) {
      console.log("\n🧹 Step 1: Permanently purging underlying records from tables...");
      for (const entry of entries) {
        entityBreakdown[entry.entityType] = (entityBreakdown[entry.entityType] || 0) + 1;

        if (!entry.restoredAt) {
          try {
            await permanentlyDeleteRecycledRecord({
              entityType: entry.entityType,
              recordId: entry.recordId,
            });
            underlyingPurgedCount++;

            // If voter, record tenant and ward for demographic sync
            if (entry.entityType === "voter" || entry.entityType === "voter_list") {
              const payload = entry.payload as any;
              if (payload?.tenantId && payload?.wardId) {
                affectedWards.add(`${payload.tenantId}__${payload.wardId}`);
              }
            }
          } catch (err: any) {
            console.warn(`   ⚠️ Could not purge physical record for ${entry.entityType} (${entry.recordId}): ${err?.message}`);
          }
        }
      }
      console.log(`   ✓ Purged ${underlyingPurgedCount} underlying physical record(s).`);
    } else {
      console.log("\n⏭️ Step 1: Skipped purging underlying records (--skip-underlying).");
    }

    // 3. Delete RecycleBinEntry rows
    console.log("\n🧹 Step 2: Deleting all RecycleBinEntry rows...");
    const deletedEntries = await (prisma as any).recycleBinEntry.deleteMany({
      where: whereClause,
    });
    console.log(`   ✓ Deleted ${deletedEntries.count} entry/entries from RecycleBinEntry table.`);

    // 4. Re-sync Demographics if any voters were purged
    if (affectedWards.size > 0) {
      console.log("\n🧹 Step 3: Re-synchronizing affected ward demographics...");
      for (const item of affectedWards) {
        const [tenantId, wardId] = item.split("__");
        await syncVoterDemographics(tenantId, wardId);
      }
      console.log(`   ✓ Re-synchronized ${affectedWards.size} ward(s).`);
    }

    // 5. Print summary
    console.log("\n=================================================");
    console.log("📊 BREAKDOWN OF PURGED ENTITIES:");
    Object.entries(entityBreakdown).forEach(([entity, count]) => {
      console.log(`   • ${entity}: ${count}`);
    });
    console.log("=================================================");
    console.log("✅ RECYCLE BIN CLEANUP COMPLETED SUCCESSFULLY");
    console.log("=================================================");
  } catch (error: any) {
    console.error("\n❌ Error running cleanRecycleBin script:", error?.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanRecycleBin();
