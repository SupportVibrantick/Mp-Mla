import prisma from "../lib/prisma.js";

async function fixDefaultConstituency() {
  console.log("🔍 Inspecting database for 'constituency-default' records...");

  const DEFAULT_ID = "constituency-default";

  // 1. Check TownVillage records
  const townVillages = await prisma.townVillage.findMany({
    where: { constituencyId: DEFAULT_ID },
    select: { id: true, name: true, tenantId: true, districtId: true },
  });

  console.log(`Found ${townVillages.length} Town/Village record(s) using 'constituency-default'`);

  // 2. Check Ward records
  const wards = await prisma.ward.findMany({
    where: { constituencyId: DEFAULT_ID },
    select: { id: true, name: true, tenantId: true },
  });

  console.log(`Found ${wards.length} Ward record(s) using 'constituency-default'`);

  // 3. Check Booth records
  const booths = await prisma.booth.findMany({
    where: { constituencyId: DEFAULT_ID },
    select: { id: true, boothName: true, tenantId: true },
  });

  console.log(`Found ${booths.length} Booth record(s) using 'constituency-default'`);

  // Group by tenantId to find active real constituency ID for each tenant
  const tenantIds = Array.from(
    new Set([
      ...townVillages.map((t) => t.tenantId),
      ...wards.map((w) => w.tenantId),
      ...booths.map((b) => b.tenantId),
    ])
  );

  for (const tenantId of tenantIds) {
    const realConstituency = await prisma.constituency.findFirst({
      where: { tenantId, isDeleted: false, NOT: { id: DEFAULT_ID } },
      select: { id: true, name: true },
    });

    const targetConstituencyId = realConstituency ? realConstituency.id : null;
    console.log(
      `Tenant [${tenantId}]: Mapping 'constituency-default' -> ${targetConstituencyId ? `${realConstituency?.name} (${targetConstituencyId})` : "NULL"}`
    );

    if (townVillages.some((t) => t.tenantId === tenantId)) {
      const res = await prisma.townVillage.updateMany({
        where: { tenantId, constituencyId: DEFAULT_ID },
        data: { constituencyId: targetConstituencyId },
      });
      console.log(`  Updated ${res.count} TownVillage record(s).`);
    }

    if (wards.some((w) => w.tenantId === tenantId)) {
      const res = await prisma.ward.updateMany({
        where: { tenantId, constituencyId: DEFAULT_ID },
        data: { constituencyId: targetConstituencyId },
      });
      console.log(`  Updated ${res.count} Ward record(s).`);
    }

    if (booths.some((b) => b.tenantId === tenantId)) {
      if (targetConstituencyId) {
        const res = await prisma.booth.updateMany({
          where: { tenantId, constituencyId: DEFAULT_ID },
          data: { constituencyId: targetConstituencyId },
        });
        console.log(`  Updated ${res.count} Booth record(s).`);
      }
    }
  }

  console.log("✅ Default constituency migration script completed.");
}

fixDefaultConstituency()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
