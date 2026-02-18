import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// ALL PERMISSIONS
// ═══════════════════════════════════════════════════════════

const ALL_PERMISSIONS = [
  { module: "dashboard",        action: "read",    description: "View overview dashboard" },

  { module: "wards",            action: "create",  description: "Create ward" },
  { module: "wards",            action: "read",    description: "View wards" },
  { module: "wards",            action: "update",  description: "Edit ward" },
  { module: "wards",            action: "delete",  description: "Delete ward" },

  { module: "institutions",     action: "create",  description: "Add institution" },
  { module: "institutions",     action: "read",    description: "View institutions" },
  { module: "institutions",     action: "update",  description: "Edit institution" },
  { module: "institutions",     action: "delete",  description: "Delete institution" },
  { module: "institutions",     action: "export",  description: "Export institutions" },

  { module: "incharges",        action: "create",  description: "Add incharge" },
  { module: "incharges",        action: "read",    description: "View incharges" },
  { module: "incharges",        action: "update",  description: "Edit incharge" },
  { module: "incharges",        action: "delete",  description: "Delete incharge" },

  { module: "grievances",       action: "create",  description: "Register grievance" },
  { module: "grievances",       action: "read",    description: "View grievances" },
  { module: "grievances",       action: "update",  description: "Update grievance" },
  { module: "grievances",       action: "delete",  description: "Delete grievance" },
  { module: "grievances",       action: "export",  description: "Export grievances" },

  { module: "projects",         action: "create",  description: "Create project" },
  { module: "projects",         action: "read",    description: "View projects" },
  { module: "projects",         action: "update",  description: "Update project" },
  { module: "projects",         action: "delete",  description: "Delete project" },
  { module: "projects",         action: "export",  description: "Export projects" },

  { module: "schemes",          action: "create",  description: "Add scheme" },
  { module: "schemes",          action: "read",    description: "View schemes" },
  { module: "schemes",          action: "update",  description: "Edit scheme" },
  { module: "schemes",          action: "delete",  description: "Delete scheme" },
  { module: "schemes",          action: "export",  description: "Export schemes" },

  { module: "community_groups", action: "create",  description: "Add community group" },
  { module: "community_groups", action: "read",    description: "View community groups" },
  { module: "community_groups", action: "update",  description: "Edit community group" },
  { module: "community_groups", action: "delete",  description: "Delete community group" },

  { module: "demographics",     action: "create",  description: "Add demographics" },
  { module: "demographics",     action: "read",    description: "View demographics" },
  { module: "demographics",     action: "update",  description: "Edit demographics" },
  { module: "demographics",     action: "export",  description: "Export demographics" },

  { module: "funds",            action: "create",  description: "Create fund record" },
  { module: "funds",            action: "read",    description: "View funds" },
  { module: "funds",            action: "update",  description: "Update funds" },
  { module: "funds",            action: "export",  description: "Export funds" },

  { module: "departments",      action: "create",  description: "Add department" },
  { module: "departments",      action: "read",    description: "View departments" },
  { module: "departments",      action: "update",  description: "Edit department" },
  { module: "departments",      action: "delete",  description: "Delete department" },

  { module: "tasks",            action: "create",  description: "Create task" },
  { module: "tasks",            action: "read",    description: "View tasks" },
  { module: "tasks",            action: "update",  description: "Update task" },
  { module: "tasks",            action: "delete",  description: "Delete task" },

  { module: "notifications",    action: "send",    description: "Send notifications" },
  { module: "notifications",    action: "read",    description: "View notifications" },
  { module: "notifications",    action: "create",  description: "Create notification template" },
  { module: "notifications",    action: "update",  description: "Edit notification template" },

  { module: "reports",          action: "read",    description: "View reports" },
  { module: "reports",          action: "export",  description: "Export reports" },

  { module: "users",            action: "create",  description: "Create user account" },
  { module: "users",            action: "read",    description: "View user list" },
  { module: "users",            action: "update",  description: "Edit user account" },
  { module: "users",            action: "delete",  description: "Deactivate user" },

  { module: "audit_logs",       action: "read",    description: "View audit logs" },

  { module: "backups",          action: "create",  description: "Trigger backup" },
  { module: "backups",          action: "read",    description: "View backup history" },
  { module: "backups",          action: "restore", description: "Restore from backup" },

  { module: "settings",         action: "read",    description: "View system settings" },
  { module: "settings",         action: "update",  description: "Update system settings" },

  { module: "branding",         action: "read",    description: "View branding" },
  { module: "branding",         action: "update",  description: "Update branding/logo" },

  { module: "data_import",      action: "create",  description: "Import data via Excel" },
];

// ═══════════════════════════════════════════════════════════
// ROLE → PERMISSION MAPPING
// ═══════════════════════════════════════════════════════════

const ROLE_MAP: Record<UserRole, { module: string; action: string }[]> = {
  // Admin gets everything
  SYSTEM_ADMIN: ALL_PERMISSIONS.map((p) => ({ module: p.module, action: p.action })),

  // MLA — read + export + tasks only
  MLA_MP: [
    { module: "dashboard", action: "read" },
    { module: "wards", action: "read" },
    { module: "institutions", action: "read" },
    { module: "institutions", action: "export" },
    { module: "incharges", action: "read" },
    { module: "grievances", action: "read" },
    { module: "grievances", action: "export" },
    { module: "projects", action: "read" },
    { module: "projects", action: "export" },
    { module: "schemes", action: "read" },
    { module: "schemes", action: "export" },
    { module: "community_groups", action: "read" },
    { module: "demographics", action: "read" },
    { module: "demographics", action: "export" },
    { module: "funds", action: "read" },
    { module: "funds", action: "export" },
    { module: "departments", action: "read" },
    { module: "tasks", action: "create" },
    { module: "tasks", action: "read" },
    { module: "tasks", action: "update" },
    { module: "notifications", action: "read" },
    { module: "reports", action: "read" },
    { module: "reports", action: "export" },
    { module: "audit_logs", action: "read" },
  ],

  // Staff — create + read + update (no delete except tasks)
  OFFICE_STAFF: [
    { module: "dashboard", action: "read" },
    { module: "wards", action: "read" },
    { module: "institutions", action: "create" },
    { module: "institutions", action: "read" },
    { module: "institutions", action: "update" },
    { module: "institutions", action: "export" },
    { module: "incharges", action: "create" },
    { module: "incharges", action: "read" },
    { module: "incharges", action: "update" },
    { module: "grievances", action: "create" },
    { module: "grievances", action: "read" },
    { module: "grievances", action: "update" },
    { module: "grievances", action: "export" },
    { module: "projects", action: "create" },
    { module: "projects", action: "read" },
    { module: "projects", action: "update" },
    { module: "projects", action: "export" },
    { module: "schemes", action: "create" },
    { module: "schemes", action: "read" },
    { module: "schemes", action: "update" },
    { module: "community_groups", action: "create" },
    { module: "community_groups", action: "read" },
    { module: "community_groups", action: "update" },
    { module: "demographics", action: "create" },
    { module: "demographics", action: "read" },
    { module: "demographics", action: "update" },
    { module: "demographics", action: "export" },
    { module: "funds", action: "create" },
    { module: "funds", action: "read" },
    { module: "funds", action: "update" },
    { module: "funds", action: "export" },
    { module: "departments", action: "read" },
    { module: "tasks", action: "create" },
    { module: "tasks", action: "read" },
    { module: "tasks", action: "update" },
    { module: "notifications", action: "send" },
    { module: "notifications", action: "read" },
    { module: "reports", action: "read" },
    { module: "reports", action: "export" },
    { module: "data_import", action: "create" },
  ],
};

// ═══════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("🌱 Starting seed...\n");

  // ─── 1. Organization ─────────────────────────────────
  await prisma.organization.upsert({
    where: { id: "org-default" },
    update: {},
    create: {
      id: "org-default",
      name: "Constituency Management Portal",
      constituencyName: "Chandni Chowk",
      state: "Delhi",
      district: "Central Delhi",
      representativeName: "Shri Example Singh",
      representativeTitle: "Member of Parliament",
    },
  });
  console.log("✅ Organization created");

  // ─── 2. Permissions ──────────────────────────────────
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: { description: perm.description },
      create: perm,
    });
  }
  console.log(`✅ ${ALL_PERMISSIONS.length} permissions seeded`);

  // ─── 3. Role Default Permissions ─────────────────────
  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [`${p.module}:${p.action}`, p.id]));

  for (const role of Object.keys(ROLE_MAP) as UserRole[]) {
    const rolePerms = ROLE_MAP[role];
    let count = 0;
    for (const rp of rolePerms) {
      const permId = permMap.get(`${rp.module}:${rp.action}`);
      if (!permId) {
        console.warn(`  ⚠️  Permission not found: ${rp.module}:${rp.action}`);
        continue;
      }
      await prisma.roleDefaultPermission.upsert({
        where: { role_permissionId: { role, permissionId: permId } },
        update: { granted: true },
        create: { role, permissionId: permId, granted: true },
      });
      count++;
    }
    console.log(`✅ ${count} permissions assigned to ${role}`);
  }

  // ─── 4. Users ────────────────────────────────────────
  const adminPwd = await bcrypt.hash("Admin@123456", 12);
  const mlaPwd = await bcrypt.hash("Mla@123456", 12);
  const staffPwd = await bcrypt.hash("Staff@123456", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@constituency.gov.in" },
    update: {},
    create: {
      name: "System Administrator",
      email: "admin@constituency.gov.in",
      phone: "9999900001",
      password: adminPwd,
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  const mla = await prisma.user.upsert({
    where: { email: "mla@constituency.gov.in" },
    update: {},
    create: {
      name: "Shri Example Singh",
      email: "mla@constituency.gov.in",
      phone: "9999900002",
      password: mlaPwd,
      role: "MLA_MP",
      status: "ACTIVE",
      createdById: admin.id,
    },
  });
  console.log(`✅ MLA: ${mla.email}`);

  const staff1 = await prisma.user.upsert({
    where: { email: "pa@constituency.gov.in" },
    update: {},
    create: {
      name: "Rajesh Kumar (PA)",
      email: "pa@constituency.gov.in",
      phone: "9999900003",
      password: staffPwd,
      role: "OFFICE_STAFF",
      status: "ACTIVE",
      createdById: admin.id,
    },
  });
  console.log(`✅ Staff PA: ${staff1.email}`);

  const staff2 = await prisma.user.upsert({
    where: { email: "dataentry@constituency.gov.in" },
    update: {},
    create: {
      name: "Priya Sharma (Data Entry)",
      email: "dataentry@constituency.gov.in",
      phone: "9999900004",
      password: staffPwd,
      role: "OFFICE_STAFF",
      status: "ACTIVE",
      createdById: admin.id,
    },
  });
  console.log(`✅ Staff DE: ${staff2.email}`);

  // ─── 5. Per-User Permission Overrides (Example) ──────
  // Revoke notification:send from data entry staff
  const sendNotifPermId = permMap.get("notifications:send");
  if (sendNotifPermId) {
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: staff2.id, permissionId: sendNotifPermId } },
      update: { granted: false },
      create: { userId: staff2.id, permissionId: sendNotifPermId, granted: false },
    });
    console.log(`✅ Revoked notifications:send for ${staff2.email}`);
  }

  // Grant grievances:delete to PA (beyond role default)
  const deleteGrievPermId = permMap.get("grievances:delete");
  if (deleteGrievPermId) {
    await prisma.userPermission.upsert({
      where: { userId_permissionId: { userId: staff1.id, permissionId: deleteGrievPermId } },
      update: { granted: true },
      create: { userId: staff1.id, permissionId: deleteGrievPermId, granted: true },
    });
    console.log(`✅ Granted grievances:delete for ${staff1.email}`);
  }

  // ─── 6. Departments ─────────────────────────────────
  const departments = [
    { name: "Public Works Department", code: "PWD" },
    { name: "Water Supply", code: "WSD" },
    { name: "Electricity Board", code: "ELEC" },
    { name: "Health Department", code: "HLTH" },
    { name: "Education Department", code: "EDU" },
    { name: "Sanitation", code: "SAN" },
    { name: "Police", code: "POL" },
    { name: "Revenue Department", code: "REV" },
    { name: "Social Welfare", code: "SW" },
    { name: "Urban Development", code: "UD" },
    { name: "Municipal Corporation", code: "MC" },
    { name: "Horticulture", code: "HORT" },
    { name: "Jal Board", code: "JB" },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
  }
  console.log(`✅ ${departments.length} departments created`);

  // ─── 7. Wards ────────────────────────────────────────
  const wardsData = [
    { wardNumber: 1, name: "Ward 1 - Sadar Bazar", population: 45000, areaType: "Urban", areaName: "Sadar Bazar" },
    { wardNumber: 2, name: "Ward 2 - Civil Lines", population: 32000, areaType: "Urban", areaName: "Civil Lines" },
    { wardNumber: 3, name: "Ward 3 - Laxmi Nagar", population: 55000, areaType: "Urban", areaName: "Laxmi Nagar" },
    { wardNumber: 4, name: "Ward 4 - Gandhi Colony", population: 28000, areaType: "Semi-Urban", areaName: "Gandhi Colony" },
    { wardNumber: 5, name: "Ward 5 - Rajpur", population: 15000, areaType: "Rural", areaName: "Rajpur" },
  ];

  const wards: any[] = [];
  for (const w of wardsData) {
    const ward = await prisma.ward.upsert({
      where: { wardNumber: w.wardNumber },
      update: {},
      create: w,
    });
    wards.push(ward);
  }
  console.log(`✅ ${wards.length} wards created`);

  // ─── 8. Institutions ─────────────────────────────────
  const institutions = [
    { name: "City Hospital", category: "HOSPITAL" as const, address: "Main Road, Sadar Bazar", wardId: wards[0].id, contactNo: "0111234567", status: "ACTIVE" as const },
    { name: "Govt School No. 1", category: "SCHOOL" as const, address: "School Lane, Civil Lines", wardId: wards[1].id, contactNo: "0111234568", status: "ACTIVE" as const },
    { name: "Shiv Temple", category: "TEMPLE" as const, address: "Temple Road, Laxmi Nagar", wardId: wards[2].id, contactNo: "0111234569", status: "ACTIVE" as const },
    { name: "Police Station Sadar", category: "POLICE_STATION" as const, address: "PS Road, Sadar Bazar", wardId: wards[0].id, contactNo: "0111234570", status: "ACTIVE" as const },
    { name: "Community Health Center", category: "CLINIC" as const, address: "CHC Road, Gandhi Colony", wardId: wards[3].id, contactNo: "0111234571", status: "ACTIVE" as const },
    { name: "Gandhi Public School", category: "SCHOOL" as const, address: "Education Sector", wardId: wards[3].id, contactNo: "0111234572", status: "ACTIVE" as const },
    { name: "Youth Fitness Club", category: "GYM" as const, address: "Sports Complex, Civil Lines", wardId: wards[1].id, contactNo: "0111234574", status: "ACTIVE" as const },
    { name: "Jan Seva NGO", category: "NGO" as const, address: "Service Road, Laxmi Nagar", wardId: wards[2].id, contactNo: "0111234575", status: "ACTIVE" as const },
  ];

  for (const inst of institutions) {
    await prisma.institution.create({ data: inst });
  }
  console.log(`✅ ${institutions.length} institutions created`);

  // ─── 9. Incharges ────────────────────────────────────
  const allInstitutions = await prisma.institution.findMany();
  for (const inst of allInstitutions.slice(0, 4)) {
    await prisma.incharge.create({
      data: {
        institutionId: inst.id,
        name: `Head of ${inst.name}`,
        designation: "Director",
        contactNo: "9876500000",
        isActive: true,
      },
    });
  }
  console.log(`✅ 4 incharges created`);

  // ─── 10. Grievances ──────────────────────────────────
  const grievances = [
    { ticketNumber: "GRV-2025-00001", category: "Water Supply", description: "No water supply in Block C for 3 days.", wardId: wards[0].id, assignedDept: "Jal Board", status: "OPEN" as const, priority: "HIGH" as const, createdById: staff1.id },
    { ticketNumber: "GRV-2025-00002", category: "Road Damage", description: "Large pothole on Main Road near market.", wardId: wards[0].id, assignedDept: "Public Works Department", status: "IN_PROGRESS" as const, priority: "URGENT" as const, createdById: staff1.id },
    { ticketNumber: "GRV-2025-00003", category: "Sanitation", description: "Garbage not collected in Lane 3.", wardId: wards[1].id, assignedDept: "Sanitation", status: "RESOLVED" as const, priority: "MEDIUM" as const, resolvedAt: new Date("2025-01-20"), createdById: staff1.id },
    { ticketNumber: "GRV-2025-00004", category: "Electricity", description: "Frequent power cuts lasting 4-5 hours daily.", wardId: wards[2].id, assignedDept: "Electricity Board", status: "OPEN" as const, priority: "HIGH" as const, createdById: staff2.id },
    { ticketNumber: "GRV-2025-00005", category: "Street Light", description: "Street lights not working in Sector 5.", wardId: wards[3].id, assignedDept: "Electricity Board", status: "IN_PROGRESS" as const, priority: "MEDIUM" as const, createdById: staff2.id },
    { ticketNumber: "GRV-2025-00006", category: "Drainage", description: "Blocked drainage causing waterlogging.", wardId: wards[4].id, assignedDept: "Public Works Department", status: "OPEN" as const, priority: "LOW" as const, createdById: staff1.id },
  ];

  for (const g of grievances) {
    const created = await prisma.grievance.create({ data: g });
    await prisma.grievanceTimeline.create({
      data: {
        grievanceId: created.id,
        status: g.status,
        comment: "Grievance registered",
        changedBy: "System (Seed)",
      },
    });
  }
  console.log(`✅ ${grievances.length} grievances created with timeline`);

  // ─── 11. Projects ────────────────────────────────────
  const projects = [
    { projectCode: "PRJ-2025-00001", name: "Road Widening - Sadar Main Road", category: "Infrastructure", department: "Public Works Department", contractor: "ABC Construction", wardId: wards[0].id, startDate: new Date("2025-01-15"), expectedEndDate: new Date("2025-12-31"), budgetSanctioned: 8000000, budgetReleased: 5000000, budgetUsed: 3200000, status: "RUNNING" as const, completionPercent: 40, createdById: staff1.id },
    { projectCode: "PRJ-2025-00002", name: "Community Park Development", category: "Green Space", department: "Horticulture", wardId: wards[1].id, startDate: new Date("2025-03-01"), budgetSanctioned: 2000000, budgetReleased: 1500000, budgetUsed: 800000, status: "RUNNING" as const, completionPercent: 55, createdById: staff1.id },
    { projectCode: "PRJ-2025-00003", name: "Street Light Installation", category: "Infrastructure", department: "Electricity Board", contractor: "Power Solutions Ltd", wardId: wards[2].id, startDate: new Date("2024-11-01"), expectedEndDate: new Date("2025-03-15"), actualEndDate: new Date("2025-03-10"), budgetSanctioned: 1200000, budgetReleased: 1200000, budgetUsed: 1200000, status: "COMPLETED" as const, completionPercent: 100, createdById: staff1.id },
    { projectCode: "PRJ-2025-00004", name: "Water Pipeline Extension", category: "Water Supply", department: "Jal Board", wardId: wards[3].id, budgetSanctioned: 3500000, budgetReleased: 0, budgetUsed: 0, status: "PENDING" as const, completionPercent: 0, createdById: staff2.id },
  ];

  for (const p of projects) {
    await prisma.project.create({ data: p });
  }
  console.log(`✅ ${projects.length} projects created`);

  // ─── 12. Schemes ─────────────────────────────────────
  const schemes = [
    { name: "PM Awas Yojana", department: "Housing", level: "Central", description: "Housing for all under poverty line", budget: 50000000, status: "ACTIVE" as const },
    { name: "Swachh Bharat Mission", department: "Sanitation", level: "Central", description: "Clean India initiative", budget: 15000000, status: "ACTIVE" as const },
    { name: "Ayushman Bharat", department: "Health", level: "Central", description: "Free health insurance", budget: 30000000, status: "ACTIVE" as const },
    { name: "PM Kisan Samman", department: "Agriculture", level: "Central", description: "Income support for farmers", budget: 10000000, status: "ACTIVE" as const },
  ];

  for (const s of schemes) {
    const scheme = await prisma.scheme.create({ data: s });
    // Link to first 3 wards
    for (const w of wards.slice(0, 3)) {
      await prisma.schemeBeneficiary.create({
        data: {
          schemeId: scheme.id,
          wardId: w.id,
          beneficiaryCount: Math.floor(Math.random() * 500) + 50,
          targetCount: Math.floor(Math.random() * 1000) + 200,
        },
      });
    }
  }
  console.log(`✅ ${schemes.length} schemes created with beneficiaries`);

  // ─── 13. Demographics ────────────────────────────────
  const demographics = [
    { wardId: wards[0].id, communityGroup: "RWA", maleCount: 12000, femaleCount: 11000, age0to18: 5000, age19to35: 8000, age36to60: 7000, age60plus: 3000 },
    { wardId: wards[0].id, communityGroup: "Markets", maleCount: 3000, femaleCount: 1500, age0to18: 200, age19to35: 1800, age36to60: 2000, age60plus: 500 },
    { wardId: wards[1].id, communityGroup: "Senior Citizens", maleCount: 2000, femaleCount: 2500, age0to18: 0, age19to35: 0, age36to60: 0, age60plus: 4500 },
    { wardId: wards[2].id, communityGroup: "Youth Groups", maleCount: 5000, femaleCount: 4500, age0to18: 3000, age19to35: 6500, age36to60: 0, age60plus: 0 },
    { wardId: wards[3].id, communityGroup: "Women Groups", maleCount: 0, femaleCount: 6000, age0to18: 500, age19to35: 2500, age36to60: 2500, age60plus: 500 },
    { wardId: wards[4].id, communityGroup: "Slums", maleCount: 4000, femaleCount: 3500, age0to18: 2500, age19to35: 2000, age36to60: 2000, age60plus: 1000 },
  ];

  for (const d of demographics) {
    await prisma.demographics.create({ data: d });
  }
  console.log(`✅ ${demographics.length} demographics records created`);

  // ─── 14. Community Groups ────────────────────────────
  const communityGroups = [
    { name: "Sadar Bazar RWA", type: "RWA" as const, wardId: wards[0].id, headName: "Ramesh Gupta", headPhone: "9876543001", memberCount: 500 },
    { name: "Civil Lines Market Association", type: "MARKET" as const, wardId: wards[1].id, headName: "Suresh Jain", headPhone: "9876543002", memberCount: 150 },
    { name: "Laxmi Nagar Youth Club", type: "YOUTH_GROUP" as const, wardId: wards[2].id, headName: "Vikram Singh", headPhone: "9876543003", memberCount: 80 },
    { name: "Gandhi Colony Senior Citizens Forum", type: "SENIOR_CITIZEN" as const, wardId: wards[3].id, headName: "Dr. Sharma", headPhone: "9876543004", memberCount: 200 },
    { name: "Rajpur Slum Committee", type: "SLUM" as const, wardId: wards[4].id, headName: "Meena Devi", headPhone: "9876543005", memberCount: 300 },
  ];

  for (const cg of communityGroups) {
    await prisma.communityGroup.create({ data: cg });
  }
  console.log(`✅ ${communityGroups.length} community groups created`);

  // ─── 15. System Settings ─────────────────────────────
  const settings = [
    { key: "org_name", value: "MP/MLA Constituency Office", group: "general", description: "Organization name" },
    { key: "org_address", value: "Constituency Office, Main Road", group: "general", description: "Address" },
    { key: "org_phone", value: "+91 11 1234 5678", group: "general", description: "Phone" },
    { key: "timezone", value: "Asia/Kolkata", group: "general", description: "Timezone" },
    { key: "default_language", value: "en", group: "general", description: "Default language" },
    { key: "grievance_sla_days", value: "7", group: "general", type: "number", description: "Default SLA for grievances" },
    { key: "session_timeout_minutes", value: "30", group: "security", type: "number", description: "Session timeout" },
    { key: "max_failed_logins", value: "5", group: "security", type: "number", description: "Max failed logins before lock" },
    { key: "password_min_length", value: "8", group: "security", type: "number", description: "Min password length" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`✅ ${settings.length} system settings created`);

  // ─── 16. Notification Templates ──────────────────────
  const templates = [
    { name: "grievance_created_sms", channel: "SMS" as const, body: "Your complaint {{ticketNumber}} has been registered. Category: {{category}}. We will resolve it soon. - Constituency Office", variables: ["ticketNumber", "category"] },
    { name: "grievance_resolved_sms", channel: "SMS" as const, body: "Your complaint {{ticketNumber}} has been resolved. Thank you. - Constituency Office", variables: ["ticketNumber"] },
    { name: "grievance_created_whatsapp", channel: "WHATSAPP" as const, body: "🏛️ *Complaint Registered*\n\nTicket: {{ticketNumber}}\nCategory: {{category}}\nWard: {{wardName}}\n\nWe are working on it.", variables: ["ticketNumber", "category", "wardName"] },
    { name: "welcome_email", channel: "EMAIL" as const, subject: "Welcome to Constituency Portal", body: "Dear {{name}},\n\nYour account has been created.\nEmail: {{email}}\n\nPlease login and change your password.", variables: ["name", "email"] },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }
  console.log(`✅ ${templates.length} notification templates created`);

  // ═══════════════════════════════════════════════════════
  console.log("\n🎉 Seed completed successfully!\n");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  Login Credentials                                  ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  Admin:  admin@constituency.gov.in  / Admin@123456  ║");
  console.log("║  MLA:    mla@constituency.gov.in    / Mla@123456    ║");
  console.log("║  PA:     pa@constituency.gov.in     / Staff@123456  ║");
  console.log("║  DE:     dataentry@constituency.gov.in / Staff@123456║");
  console.log("╚══════════════════════════════════════════════════════╝\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());