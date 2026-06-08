import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting backfill for multi-tenant architecture...");

  // 1. Create or ensure a default tenant exists
  let defaultTenant = await prisma.tenant.findFirst({
    where: { name: "Default Legacy Tenant" },
  });

  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.create({
      data: {
        name: "Default Legacy Tenant",
        constituencyName: "Legacy Constituency",
        state: "Unknown",
        district: "Unknown",
        representativeName: "Legacy Representative",
        representativeTitle: "MLA",
        status: "ACTIVE",
      },
    });
  }

  console.log(`Default Tenant ready: ${defaultTenant.id}`);

  // 2. Backfill Users (excluding platform users if any were somehow mixed in, though they are a separate model now)
  const usersUpdated = await prisma.$executeRaw`UPDATE "users" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" = '' OR "tenantId" IS NULL`;
  console.log(`Users updated: ${usersUpdated}`);

  // 3. Backfill Wards
  const wardsUpdated = await prisma.$executeRaw`UPDATE "wards" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" = '' OR "tenantId" IS NULL`;
  console.log(`Wards updated: ${wardsUpdated}`);

  // 4. Backfill Grievances
  const grievancesUpdated = await prisma.$executeRaw`UPDATE "grievances" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" = '' OR "tenantId" IS NULL`;
  console.log(`Grievances updated: ${grievancesUpdated}`);

  // 5. Backfill Projects
  const projectsUpdated = await prisma.$executeRaw`UPDATE "projects" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" = '' OR "tenantId" IS NULL`;
  console.log(`Projects updated: ${projectsUpdated}`);
  
  // 6. Backfill Departments
  const departmentsUpdated = await prisma.$executeRaw`UPDATE "departments" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" = '' OR "tenantId" IS NULL`;
  console.log(`Departments updated: ${departmentsUpdated}`);

  // 7. Backfill Leaders
  const leadersUpdated = await prisma.$executeRaw`UPDATE "leaders" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" = '' OR "tenantId" IS NULL`;
  console.log(`Leaders updated: ${leadersUpdated}`);

  // 8. Backfill Community Groups
  const communityGroupsUpdated = await prisma.$executeRaw`UPDATE "community_groups" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" = '' OR "tenantId" IS NULL`;
  console.log(`Community Groups updated: ${communityGroupsUpdated}`);

  // 9. Backfill Meetings
  const meetingsUpdated = await prisma.$executeRaw`UPDATE "meetings" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" = '' OR "tenantId" IS NULL`;
  console.log(`Meetings updated: ${meetingsUpdated}`);

  // 10. Backfill Tasks
  const tasksUpdated = await prisma.$executeRaw`UPDATE "tasks" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" = '' OR "tenantId" IS NULL`;
  console.log(`Tasks updated: ${tasksUpdated}`);

  console.log("Backfill completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during backfill:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
