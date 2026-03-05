import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MODULES = [
  "dashboard",
  "wards",
  "institutions",
  "incharges",
  "grievances",
  "projects",
  // "schemes",
  "community_groups",
  "demographics",
  "funds",
  "departments",
  "tasks",
  "notifications",
  "reports",
  "users",
  "audit_logs",
  "backups",
  "settings",
  "branding",
  "leaders",
];

const ACTIONS = ["read", "create", "update", "delete", "export"];

async function main() {
  console.log("Starting permission seeding...");

  for (const module of MODULES) {
    for (const action of ACTIONS) {
      // Some modules might not have all actions (e.g., dashboard usually just read)
      // But seeding them all doesn't hurt, we just won't use them.
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: {
          module,
          action,
          description: `Permission to ${action} ${module.replace("_", " ")}`,
        },
      });
    }
  }

  // Special actions
  const specialActions = [
    { module: "settings", action: "reset", desc: "Reset settings to defaults" },
    {
      module: "notifications",
      action: "send",
      desc: "Send bulk notifications",
    },
    { module: "backups", action: "restore", desc: "Restore system backups" },
  ];

  for (const sa of specialActions) {
    await prisma.permission.upsert({
      where: { module_action: { module: sa.module, action: sa.action } },
      update: {},
      create: {
        module: sa.module,
        action: sa.action,
        description: sa.desc,
      },
    });
  }

  console.log("Permissions seeded successfully.");

  // Role Defaults Seeding
  console.log("Seeding Role Defaults...");

  const allPerms = await prisma.permission.findMany();

  const roles = ["SYSTEM_ADMIN", "MLA_MP", "OFFICE_STAFF"];

  for (const role of roles) {
    for (const perm of allPerms) {
      let granted = false;

      if (role === "SYSTEM_ADMIN") {
        granted = true; // Admin gets everything
      } else if (role === "OFFICE_STAFF") {
        // Staff can read/create/update most things but not delete or manage users/settings
        if (["read", "create", "update"].includes(perm.action)) {
          const restrictedModules = [
            "users",
            "settings",
            "audit_logs",
            "backups",
            "branding",
          ];
          if (!restrictedModules.includes(perm.module)) {
            granted = true;
          }
        }
        if (perm.module === "dashboard") granted = true;
      } else if (role === "MLA_MP") {
        // MLA/MP is mostly read-only + reports
        if (perm.action === "read" || perm.action === "export") {
          granted = true;
        }
        if (perm.module === "tasks") granted = true; // Can manage tasks
      }

      await prisma.roleDefaultPermission.upsert({
        where: {
          role_permissionId: { role: role as any, permissionId: perm.id },
        },
        update: { granted },
        create: {
          role: role as any,
          permissionId: perm.id,
          granted,
        },
      });
    }
  }

  console.log("Role defaults seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
