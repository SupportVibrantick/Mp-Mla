import prisma from "../src/lib/prisma.js";
import { migrateSystemSettingsToTenant } from "../src/lib/tenantSettingsHelper.js";

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`Migrating settings for ${tenants.length} tenant(s)...`);

  for (const tenant of tenants) {
    await migrateSystemSettingsToTenant(tenant.id);
    console.log(`  ✓ ${tenant.name}`);
  }

  console.log("Migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
