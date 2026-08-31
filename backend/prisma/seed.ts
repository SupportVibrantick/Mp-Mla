import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════
// ALL PERMISSIONS
// ═══════════════════════════════════════════════════════════

const ALL_PERMISSIONS = [
  {
    module: "dashboard",
    action: "read",
    description: "View overview dashboard",
  },

  { module: "constituency", action: "create", description: "Create constituency geography data" },
  { module: "constituency", action: "read", description: "View constituency geography data" },
  { module: "constituency", action: "update", description: "Edit constituency geography data" },
  { module: "constituency", action: "delete", description: "Delete/deactivate constituency geography data" },
  { module: "representative", action: "read", description: "View representative profile" },
  { module: "representative", action: "update", description: "Edit representative profile" },

  { module: "wards", action: "create", description: "Create ward" },
  { module: "wards", action: "read", description: "View wards" },
  { module: "wards", action: "update", description: "Edit ward" },
  { module: "wards", action: "delete", description: "Delete ward" },

  { module: "institutions", action: "create", description: "Add institution" },
  { module: "institutions", action: "read", description: "View institutions" },
  { module: "institutions", action: "update", description: "Edit institution" },
  {
    module: "institutions",
    action: "delete",
    description: "Delete institution",
  },
  {
    module: "institutions",
    action: "export",
    description: "Export institutions",
  },

  { module: "incharges", action: "create", description: "Add incharge" },
  { module: "incharges", action: "read", description: "View incharges" },
  { module: "incharges", action: "update", description: "Edit incharge" },
  { module: "incharges", action: "delete", description: "Delete incharge" },

  { module: "grievances", action: "create", description: "Register grievance" },
  { module: "grievances", action: "read", description: "View grievances" },
  { module: "grievances", action: "update", description: "Update grievance" },
  { module: "grievances", action: "delete", description: "Delete grievance" },
  { module: "grievances", action: "export", description: "Export grievances" },

  { module: "projects", action: "create", description: "Create project" },
  { module: "projects", action: "read", description: "View projects" },
  { module: "projects", action: "update", description: "Update project" },
  { module: "projects", action: "delete", description: "Delete project" },
  { module: "projects", action: "export", description: "Export projects" },

  { module: "schemes", action: "create", description: "Add scheme" },
  { module: "schemes", action: "read", description: "View schemes" },
  { module: "schemes", action: "update", description: "Edit scheme" },
  { module: "schemes", action: "delete", description: "Delete scheme" },
  { module: "schemes", action: "export", description: "Export schemes" },
  { module: "scheme_applications", action: "create", description: "Create scheme application" },
  { module: "scheme_applications", action: "read", description: "View scheme applications" },
  { module: "scheme_applications", action: "update", description: "Update scheme application" },
  { module: "scheme_applications", action: "delete", description: "Delete scheme application" },
  { module: "scheme_applications", action: "manage", description: "Manage scheme application status/assignment" },
  { module: "crm", action: "create", description: "Create CRM contact" },
  { module: "crm", action: "read", description: "View CRM contacts" },
  { module: "crm", action: "update", description: "Update CRM contact" },
  { module: "crm", action: "delete", description: "Delete CRM contact" },
  { module: "documents", action: "create", description: "Upload document" },
  { module: "documents", action: "read", description: "View documents" },
  { module: "documents", action: "update", description: "Update document" },
  { module: "documents", action: "delete", description: "Delete document" },
  { module: "documents", action: "download", description: "Download document" },

  {
    module: "community_groups",
    action: "create",
    description: "Add community group",
  },
  {
    module: "community_groups",
    action: "read",
    description: "View community groups",
  },
  {
    module: "community_groups",
    action: "update",
    description: "Edit community group",
  },
  {
    module: "community_groups",
    action: "delete",
    description: "Delete community group",
  },

  { module: "demographics", action: "create", description: "Add demographics" },
  { module: "demographics", action: "read", description: "View demographics" },
  {
    module: "demographics",
    action: "update",
    description: "Edit demographics",
  },
  {
    module: "demographics",
    action: "export",
    description: "Export demographics",
  },

  { module: "funds", action: "create", description: "Create fund record" },
  { module: "funds", action: "read", description: "View funds" },
  { module: "funds", action: "update", description: "Update funds" },
  { module: "funds", action: "delete", description: "Delete funds" },
  { module: "funds", action: "export", description: "Export funds" },

  { module: "departments", action: "create", description: "Add department" },
  { module: "departments", action: "read", description: "View departments" },
  { module: "departments", action: "update", description: "Edit department" },
  { module: "departments", action: "delete", description: "Delete department" },

  { module: "tasks", action: "create", description: "Create task" },
  { module: "tasks", action: "read", description: "View tasks" },
  { module: "tasks", action: "update", description: "Update task" },
  { module: "tasks", action: "delete", description: "Delete task" },

  { module: "leaders", action: "read", description: "View leaders" },
  { module: "leaders", action: "create", description: "Add leader" },
  { module: "leaders", action: "update", description: "Edit leader" },
  { module: "leaders", action: "delete", description: "Delete leader" },
  { module: "leaders", action: "export", description: "Export leaders" },

  {
    module: "notifications",
    action: "send",
    description: "Send notifications",
  },
  {
    module: "notifications",
    action: "read",
    description: "View notifications",
  },
  {
    module: "notifications",
    action: "create",
    description: "Create notification template",
  },
  {
    module: "notifications",
    action: "update",
    description: "Edit notification template",
  },

  { module: "reports", action: "read", description: "View reports" },
  { module: "reports", action: "export", description: "Export reports" },

  { module: "users", action: "create", description: "Create user account" },
  { module: "users", action: "read", description: "View user list" },
  { module: "users", action: "update", description: "Edit user account" },
  { module: "users", action: "delete", description: "Deactivate user" },

  { module: "audit_logs", action: "read", description: "View audit logs" },

  { module: "backups", action: "create", description: "Trigger backup" },
  { module: "backups", action: "read", description: "View backup history" },
  { module: "backups", action: "restore", description: "Restore from backup" },

  { module: "settings", action: "read", description: "View system settings" },
  {
    module: "settings",
    action: "update",
    description: "Update system settings",
  },

  { module: "branding", action: "read", description: "View branding" },
  { module: "branding", action: "update", description: "Update branding/logo" },

  {
    module: "data_import",
    action: "create",
    description: "Import data via Excel",
  },

  { module: "meeting", action: "create", description: "Schedule a meeting" },
  { module: "meeting", action: "read", description: "View meetings" },
  { module: "meeting", action: "update", description: "Edit meeting details" },
  { module: "meeting", action: "delete", description: "Delete a meeting" },

  { module: "appointments", action: "create", description: "Request an appointment" },
  { module: "appointments", action: "read", description: "View appointments" },
  { module: "appointments", action: "update", description: "Edit appointment details" },
  { module: "appointments", action: "delete", description: "Delete an appointment request" },
  { module: "appointments", action: "approve", description: "Approve an appointment request" },
  { module: "appointments", action: "reject", description: "Reject an appointment request" },
  { module: "appointments", action: "reschedule", description: "Reschedule an appointment" },
  { module: "appointments", action: "complete", description: "Mark appointment as completed" },
  { module: "appointments", action: "cancel", description: "Cancel an appointment" },

  {
    module: "competitors",
    action: "create",
    description: "Add competitor profile & metrics",
  },
  {
    module: "competitors",
    action: "read",
    description: "View competitor analysis",
  },
  {
    module: "competitors",
    action: "update",
    description: "Edit competitor data",
  },
  { module: "events", action: "create", description: "Create an event" },
  { module: "events", action: "read", description: "View events" },
  { module: "events", action: "update", description: "Edit event details" },
  { module: "events", action: "delete", description: "Delete an event" },
  { module: "events", action: "manage_team", description: "Manage event staff team" },
  { module: "events", action: "manage_guests", description: "Manage event guest list" },
  { module: "events", action: "manage_attendance", description: "Manage guest attendance" },
  { module: "events", action: "manage_media", description: "Manage event gallery/media" },
  { module: "events", action: "manage_report", description: "Manage event completion reports" },
  { module: "events", action: "manage_tasks", description: "Manage event tasks" },

  { module: "janata_darbar", action: "create", description: "Create Janata Darbar session" },
  { module: "janata_darbar", action: "read", description: "View Janata Darbar sessions" },
  { module: "janata_darbar", action: "update", description: "Edit/Transition Janata Darbar sessions" },
  { module: "janata_darbar", action: "delete", description: "Delete Janata Darbar session" },

  { module: "voter_list", action: "create", description: "Add voter" },
  { module: "voter_list", action: "read", description: "View voter list" },
  { module: "voter_list", action: "update", description: "Edit voter" },
  { module: "voter_list", action: "delete", description: "Delete voter" },
  { module: "voter_list", action: "export", description: "Export voter list" },
];

// ═══════════════════════════════════════════════════════════
// ROLE → PERMISSION MAPPING
// ═══════════════════════════════════════════════════════════

const ROLE_MAP: Record<UserRole, { module: string; action: string }[]> = {
  SYSTEM_ADMIN: ALL_PERMISSIONS.map((p) => ({
    module: p.module,
    action: p.action,
  })),

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
    { module: "scheme_applications", action: "read" },
    { module: "scheme_applications", action: "manage" },
    { module: "crm", action: "read" },
    { module: "crm", action: "create" },
    { module: "crm", action: "update" },
    { module: "documents", action: "read" },
    { module: "documents", action: "download" },
    { module: "community_groups", action: "read" },
    { module: "demographics", action: "read" },
    { module: "demographics", action: "export" },
    { module: "funds", action: "read" },
    { module: "funds", action: "export" },
    { module: "departments", action: "read" },
    { module: "tasks", action: "create" },
    { module: "tasks", action: "read" },
    { module: "tasks", action: "update" },
    // ── Leaders ──
    { module: "leaders", action: "read" },
    { module: "leaders", action: "create" },
    { module: "leaders", action: "update" },
    { module: "leaders", action: "export" },
    // ─────────────
    { module: "notifications", action: "read" },
    { module: "reports", action: "read" },
    { module: "reports", action: "export" },
    { module: "audit_logs", action: "read" },
    // ── Meetings ──
    { module: "meeting", action: "create" },
    { module: "meeting", action: "read" },
    { module: "meeting", action: "update" },
    { module: "meeting", action: "delete" },
    // ── Events ──
    { module: "events", action: "create" },
    { module: "events", action: "read" },
    { module: "events", action: "update" },
    { module: "events", action: "delete" },
    { module: "events", action: "manage_team" },
    { module: "events", action: "manage_guests" },
    { module: "events", action: "manage_attendance" },
    { module: "events", action: "manage_media" },
    { module: "events", action: "manage_report" },
    { module: "events", action: "manage_tasks" },
    // ── Janata Darbar ──
    { module: "janata_darbar", action: "create" },
    { module: "janata_darbar", action: "read" },
    { module: "janata_darbar", action: "update" },
    { module: "janata_darbar", action: "delete" },
    // ── Appointments ──
    { module: "appointments", action: "create" },
    { module: "appointments", action: "read" },
    { module: "appointments", action: "update" },
    { module: "appointments", action: "delete" },
    { module: "appointments", action: "approve" },
    { module: "appointments", action: "reject" },
    { module: "appointments", action: "reschedule" },
    { module: "appointments", action: "complete" },
    { module: "appointments", action: "cancel" },
    // ── Competitors ──
    { module: "competitors", action: "read" },
    { module: "competitors", action: "create" },
    // ── Voter List ──
    { module: "voter_list", action: "read" },
    { module: "voter_list", action: "export" },
  ],

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
    { module: "scheme_applications", action: "create" },
    { module: "scheme_applications", action: "read" },
    { module: "scheme_applications", action: "update" },
    { module: "scheme_applications", action: "manage" },
    { module: "crm", action: "create" },
    { module: "crm", action: "read" },
    { module: "crm", action: "update" },
    { module: "crm", action: "delete" },
    { module: "documents", action: "create" },
    { module: "documents", action: "read" },
    { module: "documents", action: "update" },
    { module: "documents", action: "delete" },
    { module: "documents", action: "download" },
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
    // ── Leaders ──
    { module: "leaders", action: "read" },
    { module: "leaders", action: "create" },
    { module: "leaders", action: "update" },
    { module: "leaders", action: "export" },
    // ─────────────
    { module: "notifications", action: "send" },
    { module: "notifications", action: "read" },
    { module: "reports", action: "read" },
    { module: "reports", action: "export" },
    { module: "data_import", action: "create" },
    // ── Meetings ──
    { module: "meeting", action: "create" },
    { module: "meeting", action: "read" },
    { module: "meeting", action: "update" },
    // ── Events ──
    { module: "events", action: "create" },
    { module: "events", action: "read" },
    { module: "events", action: "update" },
    { module: "events", action: "delete" },
    { module: "events", action: "manage_team" },
    { module: "events", action: "manage_guests" },
    { module: "events", action: "manage_attendance" },
    { module: "events", action: "manage_media" },
    { module: "events", action: "manage_report" },
    { module: "events", action: "manage_tasks" },
    // ── Janata Darbar ──
    { module: "janata_darbar", action: "create" },
    { module: "janata_darbar", action: "read" },
    { module: "janata_darbar", action: "update" },
    { module: "janata_darbar", action: "delete" },
    // ── Appointments ──
    { module: "appointments", action: "create" },
    { module: "appointments", action: "read" },
    { module: "appointments", action: "update" },
    { module: "appointments", action: "delete" },
    { module: "appointments", action: "approve" },
    { module: "appointments", action: "reject" },
    { module: "appointments", action: "reschedule" },
    { module: "appointments", action: "complete" },
    { module: "appointments", action: "cancel" },
    // ── Competitors ──
    { module: "competitors", action: "create" },
    { module: "competitors", action: "read" },
    { module: "competitors", action: "update" },
    { module: "competitors", action: "delete" },
    // ── Voter List ──
    { module: "voter_list", action: "create" },
    { module: "voter_list", action: "read" },
    { module: "voter_list", action: "update" },
    { module: "voter_list", action: "export" },
  ],
};

// ═══════════════════════════════════════════════════════════
// HELPER: get today's date with custom month/day for DOB
// ═══════════════════════════════════════════════════════════

function dobWithToday(birthYear: number): Date {
  const now = new Date();
  return new Date(birthYear, now.getMonth(), now.getDate());
}

function dobTomorrow(birthYear: number): Date {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return new Date(birthYear, t.getMonth(), t.getDate());
}

function dobInDays(birthYear: number, days: number): Date {
  const t = new Date();
  t.setDate(t.getDate() + days);
  return new Date(birthYear, t.getMonth(), t.getDate());
}

// ═══════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("🌱 Starting seed...\n");

  console.log("🧹 Cleaning up existing database records...");

  // 1. AI & Competitor Metrics / Analysis (Child models first)
  await prisma.competitorChat.deleteMany();
  await prisma.competitorAnalysis.deleteMany();
  await prisma.competitorMetricEntry.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.ownMetricEntry.deleteMany();

  // 1b. Voter List & Bulk Upload Jobs
  await prisma.voter.deleteMany();
  await prisma.bulkUploadJob.deleteMany();

  // 2. Meetings, Bin, Logs & Activities
  await prisma.meeting.deleteMany();
  await prisma.recycleBinEntry.deleteMany();
  await prisma.dataActivity.deleteMany();
  await prisma.backup.deleteMany();
  await prisma.tenantSetting.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.auditLog.deleteMany();

  // 3. Notifications & Tasks
  await prisma.notificationTemplate.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();

  // 4. Funds & Transactions
  await prisma.fundTransaction.deleteMany();
  await prisma.fund.deleteMany();

  // 5. Leaders & Greetings
  await prisma.leaderGreeting.deleteMany();
  await prisma.leader.deleteMany();

  // 6. Departments & Project Child Models
  await prisma.projectAttachment.deleteMany();
  await prisma.projectUpdate.deleteMany();
  await prisma.projectMilestone.deleteMany();
  await prisma.project.deleteMany();

  // 7. Grievances & Wards
  await prisma.grievanceAttachment.deleteMany();
  await prisma.grievanceTimeline.deleteMany();
  await prisma.grievance.deleteMany();
  await prisma.department.deleteMany(); // Deleted after Grievance which references it
  await prisma.demographics.deleteMany();
  await prisma.communityGroup.deleteMany();
  await prisma.institutionRequest.deleteMany();
  await prisma.incharge.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.wardCouncillor.deleteMany();
  await prisma.wardArea.deleteMany();
  await prisma.ward.deleteMany();

  // 8. Permissions & Security
  await prisma.userPermission.deleteMany();
  await prisma.roleDefaultPermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // 9. Subscriptions & Tenants (Core parent models)
  await prisma.payment.deleteMany();
  await prisma.tenantModuleAccess.deleteMany();
  await prisma.module.deleteMany();
  await prisma.tenantSubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.platformUser.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.organization.deleteMany();

  console.log("✨ Database cleanup complete!\n");

  // ─── 1. Tenant ───────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant-default" },
    update: {
      name: "MP/MLA Constituency Platform",
      constituencyName: "Chandni Chowk",
      state: "Delhi",
      district: "Central Delhi",
      representativeName: "Shri Example Singh",
      representativeTitle: "Member of Parliament",
    },
    create: {
      id: "tenant-default",
      name: "MP/MLA Constituency Platform",
      constituencyName: "Chandni Chowk",
      state: "Delhi",
      district: "Central Delhi",
      representativeName: "Shri Example Singh",
      representativeTitle: "Member of Parliament",
    },
  });
  console.log("✅ Default tenant created");

  // ─── 1a. Organization ────────────────────────────────
  await prisma.organization.upsert({
    where: { id: "org-default" },
    update: {
      name: "Constituency Management Portal",
      tagline: "Serving the Citizens",
      address: "Office of the MP/MLA, Chandni Chowk, New Delhi",
      phone: "+91-11-23456789",
      email: "contact@chandnichowk-mp.in",
      website: "https://chandnichowk-mp.in",
    },
    create: {
      id: "org-default",
      tenantId: "tenant-default",
      name: "Constituency Management Portal",
      tagline: "Serving the Citizens",
      address: "Office of the MP/MLA, Chandni Chowk, New Delhi",
      phone: "+91-11-23456789",
      email: "contact@chandnichowk-mp.in",
      website: "https://chandnichowk-mp.in",
    },
  });
  console.log("✅ Organization created");

  // ─── 1b. Constituency ────────────────────────────────
  await prisma.constituency.upsert({
    where: { id: "constituency-default" },
    update: {
      name: "Chandni Chowk",
      code: "DL-08",
      type: "PARLIAMENTARY",
      description: "Chandni Chowk Parliamentary Constituency, Delhi",
    },
    create: {
      id: "constituency-default",
      tenantId: "tenant-default",
      name: "Chandni Chowk",
      code: "DL-08",
      type: "PARLIAMENTARY",
      description: "Chandni Chowk Parliamentary Constituency, Delhi",
    },
  });
  console.log("✅ Default constituency created");

  // ─── 1c. Representative Profile ──────────────────────
  await prisma.representativeProfile.upsert({
    where: { constituencyId: "constituency-default" },
    update: {
      name: "Shri Example Singh",
      title: "Member of Parliament",
      partyName: "XYZ Party",
    },
    create: {
      id: "rep-default",
      tenantId: "tenant-default",
      constituencyId: "constituency-default",
      name: "Shri Example Singh",
      title: "Member of Parliament",
      partyName: "XYZ Party",
    },
  });
  console.log("✅ Default representative profile created");

  // ─── 1b. SaaS Plans, Modules & Tenant Access ─────────
  const subscriptionPlans = [
    {
      name: "Starter",
      code: "STARTER",
      description: "Basic constituency operations for small offices.",
      priceMonthly: 2999,
      priceYearly: 29990,
      features: [
        "Dashboard",
        "Wards",
        "Institutions",
        "Grievances",
        "Projects",
        "Reports",
      ],
      sortOrder: 1,
    },
    {
      name: "Professional",
      code: "PROFESSIONAL",
      description: "Full MP/MLA office workflow for growing teams.",
      priceMonthly: 7999,
      priceYearly: 79990,
      features: [
        "Everything in Starter",
        "Leaders",
        "Meetings",
        "Notifications",
        "Data Import",
        "Audit Logs",
      ],
      sortOrder: 2,
    },
    {
      name: "Enterprise",
      code: "ENTERPRISE",
      description: "Complete platform access for MP/MLA offices.",
      priceMonthly: 19999,
      priceYearly: 199990,
      features: [
        "Everything in Professional",
        "Competitor Analysis",
        "Backups",
        "Branding",
        "Priority Support",
      ],
      sortOrder: 3,
    },
  ];

  let enterprisePlanId = "";
  for (const plan of subscriptionPlans) {
    const savedPlan = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        features: plan.features,
        isActive: true,
        sortOrder: plan.sortOrder,
      },
      create: {
        ...plan,
        isActive: true,
      },
    });

    if (savedPlan.code === "ENTERPRISE") {
      enterprisePlanId = savedPlan.id;
    }
  }
  console.log(`✅ ${subscriptionPlans.length} subscription plans seeded`);

  const platformModules = [
    {
      code: "dashboard",
      name: "Dashboard",
      description: "Overview, metrics, and quick office insights.",
      category: "core",
      sortOrder: 1,
    },
    {
      code: "wards",
      name: "Wards",
      description: "Ward profiles, areas, councillors, and demographics.",
      category: "core",
      sortOrder: 2,
    },
    {
      code: "institutions",
      name: "Institutions",
      description: "Schools, hospitals, religious places, NGOs, and offices.",
      category: "core",
      sortOrder: 3,
    },
    {
      code: "incharges",
      name: "Incharges",
      description: "Institution head and incharge records.",
      category: "core",
      sortOrder: 4,
    },
    {
      code: "grievances",
      name: "Grievances",
      description: "Complaint registration, tracking, and resolution.",
      category: "core",
      sortOrder: 5,
    },
    {
      code: "projects",
      name: "Projects",
      description: "Development work, budgets, status, and updates.",
      category: "core",
      sortOrder: 6,
    },
    {
      code: "community_groups",
      name: "Community Groups",
      description: "RWA, market, youth, senior citizen, and local groups.",
      category: "engagement",
      sortOrder: 7,
    },
    {
      code: "demographics",
      name: "Demographics",
      description: "Population, households, voters, and social data.",
      category: "analytics",
      sortOrder: 8,
    },
    {
      code: "funds",
      name: "Funds",
      description: "MPLAD, MLALAD, CSR, and fund utilization tracking.",
      category: "finance",
      sortOrder: 9,
    },
    {
      code: "departments",
      name: "Departments",
      description: "Government department configuration.",
      category: "core",
      sortOrder: 10,
    },
    {
      code: "tasks",
      name: "Tasks",
      description: "Office task assignment and follow-up tracking.",
      category: "core",
      sortOrder: 11,
    },
    {
      code: "leaders",
      name: "Leaders",
      description: "Political, social, community, and stakeholder profiles.",
      category: "engagement",
      sortOrder: 12,
    },
    {
      code: "notifications",
      name: "Notifications",
      description: "SMS, email, WhatsApp, and in-app communication.",
      category: "engagement",
      sortOrder: 13,
    },
    {
      code: "reports",
      name: "Reports",
      description: "Reports, exports, and constituency analytics.",
      category: "analytics",
      sortOrder: 14,
    },
    {
      code: "meeting",
      name: "Meetings",
      description: "Online and offline meeting scheduling.",
      category: "engagement",
      sortOrder: 15,
    },
    {
      code: "appointments",
      name: "Appointments",
      description: "Manage public and official appointments.",
      category: "engagement",
      sortOrder: 25,
    },
    {
      code: "events",
      name: "Events",
      description: "Manage constituency events, vip guest attendance, team scheduling, and completion reports.",
      category: "engagement",
      sortOrder: 26,
    },
    {
      code: "janata_darbar",
      name: "Janata Darbar",
      description: "Manage public darbar sessions, visitor queue tokens, and direct integration with grievances and tasks.",
      category: "engagement",
      sortOrder: 27,
    },
    {
      code: "users",
      name: "Users",
      description: "Tenant user and role management.",
      category: "admin",
      sortOrder: 16,
    },
    {
      code: "audit_logs",
      name: "Audit Logs",
      description: "Security and activity audit trails.",
      category: "admin",
      sortOrder: 17,
    },
    {
      code: "backups",
      name: "Backups",
      description: "Backup history and restore operations.",
      category: "admin",
      sortOrder: 18,
    },
    {
      code: "settings",
      name: "Settings",
      description: "System and tenant-level configuration.",
      category: "admin",
      sortOrder: 19,
    },
    {
      code: "branding",
      name: "Branding",
      description: "Logo, color, and constituency branding settings.",
      category: "admin",
      sortOrder: 20,
    },
    {
      code: "data_import",
      name: "Data Import",
      description: "Excel and bulk data import workflows.",
      category: "admin",
      sortOrder: 21,
    },
    {
      code: "competitors",
      name: "Competitors",
      description: "Competitor profiles, metrics, and AI analysis.",
      category: "analytics",
      sortOrder: 22,
    },
    {
      code: "voter_list",
      name: "Voter List",
      description: "Constituent voter roll & bulk upload ingestion.",
      category: "core",
      sortOrder: 23,
    },
    {
      code: "constituency",
      name: "Constituency",
      description: "Constituency geographic and electoral structures & master data.",
      category: "core",
      sortOrder: 24,
    },
    {
      code: "schemes",
      name: "Schemes",
      description: "Government welfare schemes, beneficiary applications, and tracking.",
      category: "core",
      sortOrder: 28,
    },
    {
      code: "scheme_applications",
      name: "Scheme Applications",
      description: "Beneficiary applications for government schemes with status workflow.",
      category: "core",
      sortOrder: 29,
    },
    {
      code: "crm",
      name: "CRM",
      description: "Citizen relationship management - contacts, interactions, and follow-ups.",
      category: "engagement",
      sortOrder: 30,
    },
    {
      code: "documents",
      name: "Documents",
      description: "Central document management with versioning and entity linking.",
      category: "core",
      sortOrder: 31,
    },
    {
      code: "correspondence",
      name: "Correspondence",
      description: "Manage official citizen and department correspondence letters and files.",
      category: "engagement",
      sortOrder: 32,
    },
  ];

  const savedModules = [];
  for (const moduleData of platformModules) {
    const savedModule = await prisma.module.upsert({
      where: { code: moduleData.code },
      update: {
        name: moduleData.name,
        description: moduleData.description,
        category: moduleData.category,
        isActive: true,
        sortOrder: moduleData.sortOrder,
      },
      create: {
        ...moduleData,
        isActive: true,
      },
    });
    savedModules.push(savedModule);
  }
  console.log(`✅ ${savedModules.length} modules seeded`);

  const subscriptionStart = new Date();
  const currentPeriodEnd = new Date(subscriptionStart);
  currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);

  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      planId: enterprisePlanId,
      status: "ACTIVE",
      billingCycle: "YEARLY",
      currentPeriodStart: subscriptionStart,
      currentPeriodEnd,
      trialEndsAt: null,
      cancelledAt: null,
      suspendedAt: null,
      amountDue: 0,
    },
    create: {
      tenantId: tenant.id,
      planId: enterprisePlanId,
      status: "ACTIVE",
      billingCycle: "YEARLY",
      currentPeriodStart: subscriptionStart,
      currentPeriodEnd,
      amountDue: 0,
    },
  });
  console.log("✅ Tenant subscription seeded");

  for (const moduleData of savedModules) {
    await prisma.tenantModuleAccess.upsert({
      where: {
        tenantId_moduleId: {
          tenantId: tenant.id,
          moduleId: moduleData.id,
        },
      },
      update: {
        isEnabled: true,
      },
      create: {
        tenantId: tenant.id,
        moduleId: moduleData.id,
        isEnabled: true,
      },
    });
  }
  console.log(`✅ ${savedModules.length} modules enabled for default tenant`);

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
  const permMap = new Map(
    allPerms.map((p) => [`${p.module}:${p.action}`, p.id]),
  );

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
  const platformPwd = await bcrypt.hash("Platform@123456", 12);
  const adminPwd = await bcrypt.hash("Admin@123456", 12);
  const mlaPwd = await bcrypt.hash("Mla@123456", 12);
  const staffPwd = await bcrypt.hash("Staff@123456", 12);

  const platformAdmin = await prisma.platformUser.upsert({
    where: { email: "superadmin@admin.mpmla.in" },
    update: {
      name: "Platform Super Admin",
      password: platformPwd,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      name: "Platform Super Admin",
      email: "superadmin@admin.mpmla.in",
      password: platformPwd,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log(`✅ Platform Admin: ${platformAdmin.email}`);

  const platformSettings = [
    {
      key: "platform_name",
      value: "MP-MLA Platform",
      type: "text",
      group: "general",
      description: "Platform operator name",
    },
    {
      key: "support_email",
      value: "support@admin.mpmla.in",
      type: "text",
      group: "general",
      description: "Support email shown to tenants",
    },
    {
      key: "default_trial_days",
      value: "14",
      type: "number",
      group: "billing",
      description: "Default trial period for new tenants",
    },
    {
      key: "allow_tenant_creation",
      value: "true",
      type: "boolean",
      group: "general",
      description: "Allow operators to create new tenants",
    },
    {
      key: "renewal_reminder_days",
      value: "7",
      type: "number",
      group: "billing",
      description: "Days before renewal to send reminder",
    },
  ];

  for (const setting of platformSettings) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`✅ ${platformSettings.length} platform settings seeded`);

  async function upsertTenantUserByEmail(
    email: string,
    createData: Parameters<typeof prisma.user.create>[0]["data"],
    updateData: Parameters<typeof prisma.user.update>[0]["data"],
  ) {
    const existingUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email },
      select: { id: true },
    });

    if (existingUser) {
      return prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
      });
    }

    return prisma.user.create({
      data: createData,
    });
  }

  const admin = await upsertTenantUserByEmail(
    "admin@constituency.gov.in",
    {
      name: "System Administrator",
      email: "admin@constituency.gov.in",
      phone: "9999900001",
      tenantId: tenant.id,
      password: adminPwd,
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
    },
    {
      tenantId: tenant.id,
      password: adminPwd,
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
    },
  );
  console.log(`✅ Admin: ${admin.email}`);

  const mla = await upsertTenantUserByEmail(
    "mla@constituency.gov.in",
    {
      name: "Shri Example Singh",
      email: "mla@constituency.gov.in",
      phone: "9999900002",
      tenantId: tenant.id,
      password: mlaPwd,
      role: "MLA_MP",
      status: "ACTIVE",
      createdById: admin.id,
    },
    {},
  );
  console.log(`✅ MLA: ${mla.email}`);

  const staff1 = await upsertTenantUserByEmail(
    "pa@constituency.gov.in",
    {
      name: "Rajesh Kumar (PA)",
      email: "pa@constituency.gov.in",
      phone: "9999900003",
      tenantId: tenant.id,
      password: staffPwd,
      role: "OFFICE_STAFF",
      status: "ACTIVE",
      createdById: admin.id,
    },
    {},
  );
  console.log(`✅ Staff PA: ${staff1.email}`);

  const staff2 = await upsertTenantUserByEmail(
    "dataentry@constituency.gov.in",
    {
      name: "Priya Sharma (Data Entry)",
      email: "dataentry@constituency.gov.in",
      phone: "9999900004",
      tenantId: tenant.id,
      password: staffPwd,
      role: "OFFICE_STAFF",
      status: "ACTIVE",
      createdById: admin.id,
    },
    {},
  );
  console.log(`✅ Staff DE: ${staff2.email}`);

  // ─── 5. Per-User Permission Overrides ────────────────
  const sendNotifPermId = permMap.get("notifications:send");
  if (sendNotifPermId) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: staff2.id,
          permissionId: sendNotifPermId,
        },
      },
      update: { granted: false },
      create: {
        userId: staff2.id,
        permissionId: sendNotifPermId,
        granted: false,
      },
    });
    console.log(`✅ Revoked notifications:send for ${staff2.email}`);
  }

  const deleteGrievPermId = permMap.get("grievances:delete");
  if (deleteGrievPermId) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: staff1.id,
          permissionId: deleteGrievPermId,
        },
      },
      update: { granted: true },
      create: {
        userId: staff1.id,
        permissionId: deleteGrievPermId,
        granted: true,
      },
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
      where: { tenantId_code: { tenantId: tenant.id, code: dept.code } },
      update: {},
      create: { tenantId: tenant.id, ...dept },
    });
  }
  console.log(`✅ ${departments.length} departments created`);
  const seededDepartments = await prisma.department.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true },
  });
  const departmentIdByName = new Map(
    seededDepartments.map((department) => [department.name, department.id]),
  );

  // ─── 7. Wards ────────────────────────────────────────
  const wardsData = [
    {
      wardNumber: 1,
      name: "Shivaji Nagar",
      zone: "A",
      areaType: "Urban",
      status: "ACTIVE" as const,
      description: "Major commercial and residential ward in central area",
      establishedDate: new Date("2020-01-15"),
      areas: [
        {
          name: "Sector 1",
          areaType: "RESIDENTIAL" as const,
          population: 8000,
          households: 1600,
          maleCount: 4200,
          femaleCount: 3800,
        },
        {
          name: "Market Area",
          areaType: "COMMERCIAL" as const,
          population: 5500,
          households: 1100,
          maleCount: 3000,
          femaleCount: 2500,
        },
        {
          name: "Old Town",
          areaType: "MIXED_USE" as const,
          population: 10000,
          households: 2000,
          maleCount: 5100,
          femaleCount: 4900,
        },
        {
          name: "Industrial Belt",
          areaType: "INDUSTRIAL" as const,
          population: 5000,
          households: 1000,
          maleCount: 2800,
          femaleCount: 2200,
        },
      ],
      councillor: {
        name: "Suresh Patil",
        phone: "9876000001",
        partyName: "Party",
        sinceDate: new Date("2020-01-15"),
      },
    },
    {
      wardNumber: 2,
      name: "Civil Lines",
      zone: "A",
      areaType: "Urban",
      status: "ACTIVE" as const,
      description: "Upscale residential area with government offices",
      establishedDate: new Date("2020-01-15"),
      areas: [
        {
          name: "Govt Colony",
          areaType: "INSTITUTIONAL" as const,
          population: 6000,
          households: 1200,
          maleCount: 3200,
          femaleCount: 2800,
        },
        {
          name: "Judges Enclave",
          areaType: "RESIDENTIAL" as const,
          population: 4000,
          households: 800,
          maleCount: 2000,
          femaleCount: 2000,
        },
        {
          name: "Mall Road",
          areaType: "COMMERCIAL" as const,
          population: 8000,
          households: 1600,
          maleCount: 4300,
          femaleCount: 3700,
        },
      ],
      councillor: {
        name: "Priya Sharma",
        phone: "9876000002",
        partyName: "INC",
        sinceDate: new Date("2020-01-15"),
      },
    },
    {
      wardNumber: 3,
      name: "Laxmi Nagar",
      zone: "B",
      areaType: "Urban",
      status: "ACTIVE" as const,
      description: "Densely populated commercial hub",
      establishedDate: new Date("2020-01-15"),
      areas: [
        {
          name: "Main Market",
          areaType: "COMMERCIAL" as const,
          population: 12000,
          households: 2400,
          maleCount: 6500,
          femaleCount: 5500,
        },
        {
          name: "Pocket A",
          areaType: "RESIDENTIAL" as const,
          population: 15000,
          households: 3000,
          maleCount: 7800,
          femaleCount: 7200,
        },
        {
          name: "Pocket B",
          areaType: "RESIDENTIAL" as const,
          population: 13000,
          households: 2600,
          maleCount: 6500,
          femaleCount: 6500,
        },
        {
          name: "EWS Colony",
          areaType: "SLUM" as const,
          population: 8000,
          households: 1500,
          maleCount: 4200,
          femaleCount: 3800,
        },
        {
          name: "Metro Station Area",
          areaType: "MIXED_USE" as const,
          population: 7000,
          households: 1400,
          maleCount: 3700,
          femaleCount: 3300,
        },
      ],
      councillor: {
        name: "Ramesh Verma",
        phone: "9876000003",
        partyName: "AAP",
        sinceDate: new Date("2020-01-15"),
      },
    },
    {
      wardNumber: 4,
      name: "Gandhi Colony",
      zone: "B",
      areaType: "Semi-Urban",
      status: "ACTIVE" as const,
      description: "Mixed residential area with educational institutions",
      establishedDate: new Date("2020-01-15"),
      areas: [
        {
          name: "Education City",
          areaType: "INSTITUTIONAL" as const,
          population: 5000,
          households: 1000,
          maleCount: 2600,
          femaleCount: 2400,
        },
        {
          name: "Nehru Block",
          areaType: "RESIDENTIAL" as const,
          population: 12000,
          households: 2400,
          maleCount: 6100,
          femaleCount: 5900,
        },
        {
          name: "Ambedkar Basti",
          areaType: "SLUM" as const,
          population: 11000,
          households: 2200,
          maleCount: 5800,
          femaleCount: 5200,
        },
      ],
      councillor: {
        name: "Meena Devi",
        phone: "9876000004",
        partyName: "BSP",
        sinceDate: new Date("2020-01-15"),
      },
    },
    {
      wardNumber: 5,
      name: "Rajpur",
      zone: "C",
      areaType: "Rural",
      status: "ACTIVE" as const,
      description: "Rural ward with agricultural land and villages",
      establishedDate: new Date("2020-01-15"),
      areas: [
        {
          name: "Rajpur Village",
          areaType: "RESIDENTIAL" as const,
          population: 5000,
          households: 1000,
          maleCount: 2600,
          femaleCount: 2400,
        },
        {
          name: "Kisan Colony",
          areaType: "AGRICULTURAL" as const,
          population: 4000,
          households: 800,
          maleCount: 2100,
          femaleCount: 1900,
        },
        {
          name: "NH-24 Strip",
          areaType: "COMMERCIAL" as const,
          population: 6000,
          households: 1200,
          maleCount: 3400,
          femaleCount: 2600,
        },
      ],
      councillor: {
        name: "Hari Singh",
        phone: "9876000005",
        partyName: "Party",
        sinceDate: new Date("2020-01-15"),
      },
    },
  ];

  const wards: any[] = [];
  for (const wd of wardsData) {
    const totalPop = wd.areas.reduce((s, a) => s + a.population, 0);
    const totalHH = wd.areas.reduce((s, a) => s + a.households, 0);
    const totalMale = wd.areas.reduce((s, a) => s + a.maleCount, 0);
    const totalFemale = wd.areas.reduce((s, a) => s + a.femaleCount, 0);

    const ward = await prisma.ward.upsert({
      where: {
        tenantId_wardNumber: {
          tenantId: tenant.id,
          wardNumber: wd.wardNumber,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        wardNumber: wd.wardNumber,
        name: wd.name,
        zone: wd.zone,
        status: wd.status,
        areaType: wd.areaType,
        description: wd.description,
        establishedDate: wd.establishedDate,
        totalPopulation: totalPop,
        totalHouseholds: totalHH,
        totalAreas: wd.areas.length,
        totalMale: totalMale,
        totalFemale: totalFemale,
      },
    });
    wards.push(ward);

    for (const area of wd.areas) {
      await prisma.wardArea.upsert({
        where: { wardId_name: { wardId: ward.id, name: area.name } },
        update: {},
        create: { tenantId: tenant.id, wardId: ward.id, ...area },
      });
    }

    await prisma.wardCouncillor.create({
      data: {
        tenantId: tenant.id,
        wardId: ward.id,
        name: wd.councillor.name,
        phone: wd.councillor.phone,
        partyName: wd.councillor.partyName,
        sinceDate: wd.councillor.sinceDate,
        isCurrent: true,
      },
    });
  }
  console.log(`✅ ${wards.length} wards with areas created`);

  // ─── 8. Institutions ─────────────────────────────────
  const institutions = [
    {
      name: "City Hospital",
      category: "HOSPITAL" as const,
      address: "Main Road, Sadar Bazar",
      wardId: wards[0].id,
      contactNo: "0111234567",
      status: "ACTIVE" as const,
    },
    {
      name: "Govt School No. 1",
      category: "SCHOOL" as const,
      address: "School Lane, Civil Lines",
      wardId: wards[1].id,
      contactNo: "0111234568",
      status: "ACTIVE" as const,
    },
    {
      name: "Shiv Temple",
      category: "TEMPLE" as const,
      address: "Temple Road, Laxmi Nagar",
      wardId: wards[2].id,
      contactNo: "0111234569",
      status: "ACTIVE" as const,
    },
    {
      name: "Police Station Sadar",
      category: "POLICE_STATION" as const,
      address: "PS Road, Sadar Bazar",
      wardId: wards[0].id,
      contactNo: "0111234570",
      status: "ACTIVE" as const,
    },
    {
      name: "Community Health Center",
      category: "CLINIC" as const,
      address: "CHC Road, Gandhi Colony",
      wardId: wards[3].id,
      contactNo: "0111234571",
      status: "ACTIVE" as const,
    },
    {
      name: "Gandhi Public School",
      category: "SCHOOL" as const,
      address: "Education Sector",
      wardId: wards[3].id,
      contactNo: "0111234572",
      status: "ACTIVE" as const,
    },
    {
      name: "Youth Fitness Club",
      category: "GYM" as const,
      address: "Sports Complex, Civil Lines",
      wardId: wards[1].id,
      contactNo: "0111234574",
      status: "ACTIVE" as const,
    },
    {
      name: "Jan Seva NGO",
      category: "NGO" as const,
      address: "Service Road, Laxmi Nagar",
      wardId: wards[2].id,
      contactNo: "0111234575",
      status: "ACTIVE" as const,
    },
  ];

  for (const inst of institutions) {
    await prisma.institution.create({ data: { tenantId: tenant.id, ...inst } });
  }
  console.log(`✅ ${institutions.length} institutions created`);

  // ─── 9. Incharges ────────────────────────────────────
  const allInstitutions = await prisma.institution.findMany({
    where: { tenantId: tenant.id },
  });
  for (const inst of allInstitutions.slice(0, 4)) {
    await prisma.incharge.create({
      data: {
        tenantId: tenant.id,
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
    {
      ticketNumber: "GRV-2025-00001",
      category: "Water Supply",
      description: "No water supply in Block C for 3 days.",
      wardId: wards[0].id,
      departmentId: departmentIdByName.get("Jal Board"),
      status: "OPEN" as const,
      priority: "HIGH" as const,
      createdById: staff1.id,
    },
    {
      ticketNumber: "GRV-2025-00002",
      category: "Road Damage",
      description: "Large pothole on Main Road near market.",
      wardId: wards[0].id,
      departmentId: departmentIdByName.get("Public Works Department"),
      status: "IN_PROGRESS" as const,
      priority: "URGENT" as const,
      createdById: staff1.id,
    },
    {
      ticketNumber: "GRV-2025-00003",
      category: "Sanitation",
      description: "Garbage not collected in Lane 3.",
      wardId: wards[1].id,
      departmentId: departmentIdByName.get("Sanitation"),
      status: "RESOLVED" as const,
      priority: "MEDIUM" as const,
      resolvedAt: new Date("2025-01-20"),
      createdById: staff1.id,
    },
    {
      ticketNumber: "GRV-2025-00004",
      category: "Electricity",
      description: "Frequent power cuts lasting 4-5 hours daily.",
      wardId: wards[2].id,
      departmentId: departmentIdByName.get("Electricity Board"),
      status: "OPEN" as const,
      priority: "HIGH" as const,
      createdById: staff2.id,
    },
    {
      ticketNumber: "GRV-2025-00005",
      category: "Street Light",
      description: "Street lights not working in Sector 5.",
      wardId: wards[3].id,
      departmentId: departmentIdByName.get("Electricity Board"),
      status: "IN_PROGRESS" as const,
      priority: "MEDIUM" as const,
      createdById: staff2.id,
    },
    {
      ticketNumber: "GRV-2025-00006",
      category: "Drainage",
      description: "Blocked drainage causing waterlogging.",
      wardId: wards[4].id,
      departmentId: departmentIdByName.get("Public Works Department"),
      status: "OPEN" as const,
      priority: "LOW" as const,
      createdById: staff1.id,
    },
  ];

  for (const g of grievances) {
    const created = await prisma.grievance.create({
      data: { tenantId: tenant.id, ...g },
    });
    await prisma.grievanceTimeline.create({
      data: {
        tenantId: tenant.id,
        grievanceId: created.id,

        action: "CREATED",

        fromStatus: null,

        toStatus: g.status,

        comment: "Grievance registered",

        changedBy: "System (Seed)",
      },
    });
  }
  console.log(`✅ ${grievances.length} grievances created`);

  // ─── 11. Projects ────────────────────────────────────
  const projects = [
    {
      projectCode: "PRJ-2025-00001",
      name: "Road Widening - Sadar Main Road",
      category: "Infrastructure",
      departmentId: departmentIdByName.get("Public Works Department"),
      contractor: "ABC Construction",
      wardId: wards[0].id,
      startDate: new Date("2025-01-15"),
      expectedEndDate: new Date("2025-12-31"),
      budgetSanctioned: 8000000,
      budgetReleased: 5000000,
      budgetUsed: 3200000,
      status: "RUNNING" as const,
      completionPercent: 40,
      createdById: staff1.id,
    },
    {
      projectCode: "PRJ-2025-00002",
      name: "Community Park Development",
      category: "Green Space",
      departmentId: departmentIdByName.get("Horticulture"),
      wardId: wards[1].id,
      startDate: new Date("2025-03-01"),
      budgetSanctioned: 2000000,
      budgetReleased: 1500000,
      budgetUsed: 800000,
      status: "RUNNING" as const,
      completionPercent: 55,
      createdById: staff1.id,
    },
    {
      projectCode: "PRJ-2025-00003",
      name: "Street Light Installation",
      category: "Infrastructure",
      departmentId: departmentIdByName.get("Electricity Board"),
      contractor: "Power Solutions Ltd",
      wardId: wards[2].id,
      startDate: new Date("2024-11-01"),
      expectedEndDate: new Date("2025-03-15"),
      actualEndDate: new Date("2025-03-10"),
      budgetSanctioned: 1200000,
      budgetReleased: 1200000,
      budgetUsed: 1200000,
      status: "COMPLETED" as const,
      completionPercent: 100,
      createdById: staff1.id,
    },
    {
      projectCode: "PRJ-2025-00004",
      name: "Water Pipeline Extension",
      category: "Water Supply",
      departmentId: departmentIdByName.get("Jal Board"),
      wardId: wards[3].id,
      budgetSanctioned: 3500000,
      budgetReleased: 0,
      budgetUsed: 0,
      status: "PENDING" as const,
      completionPercent: 0,
      createdById: staff2.id,
    },
  ];

  for (const p of projects) {
    await prisma.project.upsert({
      where: {
        tenantId_projectCode: {
          tenantId: tenant.id,
          projectCode: p.projectCode,
        },
      },
      update: {},
      create: { tenantId: tenant.id, ...p },
    });
  }

  console.log(`✅ ${projects.length} projects created`);

  // ─── 12. Schemes ─────────────────────────────────────
  const schemes = [
    {
      name: "PM Awas Yojana",
      code: "PMAY",
      department: "Housing & Urban Affairs",
      level: "CENTRAL" as const,
      description: "Housing for all under poverty line",
      eligibility: "Families with no pucca house and annual income below ₹3 lakh",
      benefits: "Financial assistance up to ₹2.67 lakh for house construction",
      requiredDocuments: ["Aadhaar Card", "Income Certificate", "Bank Passbook"],
      applicationUrl: "https://pmaymis.gov.in",
      status: "ACTIVE" as const,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2026-12-31"),
    },
    {
      name: "Swachh Bharat Mission",
      code: "SBM",
      department: "Sanitation",
      level: "CENTRAL" as const,
      description: "Clean India initiative",
      eligibility: "All households without toilet facilities",
      benefits: "Financial assistance for toilet construction",
      requiredDocuments: ["Aadhaar Card", "Land Ownership Proof"],
      applicationUrl: "https://swachhbharatmission.gov.in",
      status: "ACTIVE" as const,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-12-31"),
    },
    {
      name: "Ayushman Bharat",
      code: "AB-PMJAY",
      department: "Health",
      level: "CENTRAL" as const,
      description: "Free health insurance up to ₹5 lakh per family per year",
      eligibility: "Families listed in SECC database",
      benefits: "Cashless health insurance coverage",
      requiredDocuments: ["Aadhaar Card", "SECC Certificate"],
      applicationUrl: "https://pmjay.gov.in",
      status: "ACTIVE" as const,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2026-12-31"),
    },
    {
      name: "PM Kisan Samman Nidhi",
      code: "PM-KISAN",
      department: "Agriculture",
      level: "CENTRAL" as const,
      description: "Income support of ₹6000 per year for farmers",
      eligibility: "All landholding farmer families",
      benefits: "₹6000 per year in three installments",
      requiredDocuments: ["Aadhaar Card", "Land Records"],
      applicationUrl: "https://pmkisan.gov.in",
      status: "ACTIVE" as const,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2026-12-31"),
    },
    {
      name: "State Health Scheme",
      code: "SHS",
      department: "Health Department",
      level: "STATE" as const,
      description: "State-level health insurance for below poverty line families",
      eligibility: "BPL families in the state",
      benefits: "Health insurance coverage up to ₹2 lakh",
      requiredDocuments: ["Aadhaar Card", "BPL Certificate"],
      status: "UPCOMING" as const,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2027-12-31"),
    },
    {
      name: "Local Skill Development Program",
      code: "LSDP",
      department: "Urban Development",
      level: "LOCAL" as const,
      description: "Skill training for local youth",
      eligibility: "Youth aged 18-35 in the constituency",
      benefits: "Free skill training and certification",
      requiredDocuments: ["Aadhaar Card", "Educational Certificate"],
      status: "ACTIVE" as const,
      startDate: new Date("2024-06-01"),
      endDate: new Date("2025-05-31"),
    },
  ];

  const createdSchemes: any[] = [];
  for (const s of schemes) {
    const scheme = await prisma.scheme.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: s.name } },
      update: {},
      create: { tenantId: tenant.id, ...s },
    });
    createdSchemes.push(scheme);
  }
  console.log(`✅ ${createdSchemes.length} schemes created`);

  // ─── 12b. Scheme Applications ────────────────────────
  const schemeApplications = [
    {
      schemeIdx: 0,
      beneficiaryName: "Ramesh Kumar",
      beneficiaryPhone: "9876500001",
      beneficiaryEmail: "ramesh.kumar@email.com",
      address: "12, Sector 1, Shivaji Nagar",
      wardIdx: 0,
      status: "APPROVED" as const,
      notes: "Verified all documents",
    },
    {
      schemeIdx: 0,
      beneficiaryName: "Sunita Devi",
      beneficiaryPhone: "9876500002",
      address: "45, Old Town, Shivaji Nagar",
      wardIdx: 0,
      status: "UNDER_REVIEW" as const,
      notes: "Documents under verification",
    },
    {
      schemeIdx: 1,
      beneficiaryName: "Mohd. Salim",
      beneficiaryPhone: "9876500003",
      address: "8, Market Area, Shivaji Nagar",
      wardIdx: 0,
      status: "SUBMITTED" as const,
    },
    {
      schemeIdx: 2,
      beneficiaryName: "Kavita Sharma",
      beneficiaryPhone: "9876500004",
      beneficiaryEmail: "kavita.sharma@email.com",
      address: "23, Pocket A, Laxmi Nagar",
      wardIdx: 2,
      status: "APPROVED" as const,
      notes: "Eligible under SECC",
    },
    {
      schemeIdx: 2,
      beneficiaryName: "Ravi Prakash",
      beneficiaryPhone: "9876500005",
      address: "56, Pocket B, Laxmi Nagar",
      wardIdx: 2,
      status: "DOCUMENT_PENDING" as const,
      notes: "Income certificate pending",
    },
    {
      schemeIdx: 3,
      beneficiaryName: "Hari Singh",
      beneficiaryPhone: "9876500006",
      address: "Rajpur Village",
      wardIdx: 4,
      status: "COMPLETED" as const,
      notes: "Benefit disbursed",
    },
    {
      schemeIdx: 3,
      beneficiaryName: "Gopal Yadav",
      beneficiaryPhone: "9876500007",
      address: "Kisan Colony, Rajpur",
      wardIdx: 4,
      status: "REJECTED" as const,
      rejectionReason: "Land records not matching",
    },
    {
      schemeIdx: 4,
      beneficiaryName: "Meena Devi",
      beneficiaryPhone: "9876500008",
      address: "Nehru Block, Gandhi Colony",
      wardIdx: 3,
      status: "DRAFT" as const,
    },
    {
      schemeIdx: 5,
      beneficiaryName: "Vikram Singh",
      beneficiaryPhone: "9876500009",
      address: "Mall Road, Civil Lines",
      wardIdx: 1,
      status: "SUBMITTED" as const,
    },
    {
      schemeIdx: 5,
      beneficiaryName: "Priya Sharma",
      beneficiaryPhone: "9876500010",
      beneficiaryEmail: "priya.sharma@email.com",
      address: "Govt Colony, Civil Lines",
      wardIdx: 1,
      status: "CANCELLED" as const,
      notes: "Applicant withdrew",
    },
  ];

  let appCount = 0;
  for (const app of schemeApplications) {
    const scheme = createdSchemes[app.schemeIdx];
    if (!scheme) continue;
    const ward = wards[app.wardIdx];
    if (!ward) continue;

    const applicationNumber = `SCM-${new Date().getFullYear()}-${String(appCount + 1).padStart(5, "0")}`;

    await prisma.schemeApplication.create({
      data: {
        tenantId: tenant.id,
        schemeId: scheme.id,
        applicationNumber,
        beneficiaryName: app.beneficiaryName,
        beneficiaryPhone: app.beneficiaryPhone || null,
        beneficiaryEmail: app.beneficiaryEmail || null,
        address: app.address || null,
        wardId: ward.id,
        status: app.status,
        notes: app.notes || null,
        rejectionReason: (app as any).rejectionReason || null,
        createdById: staff1.id,
      },
    });
    appCount++;
  }
  console.log(`✅ ${appCount} scheme applications created`);

  // ─── 13. Demographics ────────────────────────────────
  for (const ward of wards) {
    const wd = wardsData.find((w) => w.wardNumber === ward.wardNumber)!;
    const totalPop = wd.areas.reduce((s, a) => s + a.population, 0);
    const totalMale = wd.areas.reduce((s, a) => s + a.maleCount, 0);
    const totalFemale = wd.areas.reduce((s, a) => s + a.femaleCount, 0);
    const totalHH = wd.areas.reduce((s, a) => s + a.households, 0);

    await prisma.demographics.create({
      data: {
        tenantId: tenant.id,
        wardId: ward.id,
        totalPopulation: totalPop,
        maleCount: totalMale,
        femaleCount: totalFemale,
        age0to6: Math.round(totalPop * 0.08),
        age7to18: Math.round(totalPop * 0.18),
        age19to35: Math.round(totalPop * 0.3),
        age36to60: Math.round(totalPop * 0.28),
        age60plus: Math.round(totalPop * 0.16),
        totalHouseholds: totalHH,
        bplHouseholds: Math.round(totalHH * 0.15),
        aplHouseholds: Math.round(totalHH * 0.85),
        generalCount: Math.round(totalPop * 0.35),
        obcCount: Math.round(totalPop * 0.28),
        scCount: Math.round(totalPop * 0.2),
        stCount: Math.round(totalPop * 0.08),
        minorityCount: Math.round(totalPop * 0.09),
        literacyRate: 72 + Math.random() * 15,
        // totalVoters: Math.round(totalPop * 0.55),
        // maleVoters: Math.round(totalMale * 0.55),
        // femaleVoters: Math.round(totalFemale * 0.55),
        source: "Ward Survey 2024",
        surveyDate: new Date("2024-06-01"),
      },
    });
  }
  console.log(`✅ ${wards.length} ward demographics created`);

  // ─── 14. Community Groups ────────────────────────────
  const cgData = [
    {
      name: "Shivaji Nagar RWA",
      type: "RWA" as const,
      wardIdx: 0,
      areaName: "Sector 1",
      headName: "Ramesh Gupta",
      headPhone: "9876543001",
      memberCount: 500,
      maleMembers: 320,
      femaleMembers: 180,
    },
    {
      name: "Market Traders Association",
      type: "MARKET" as const,
      wardIdx: 0,
      areaName: "Market Area",
      headName: "Suresh Jain",
      headPhone: "9876543002",
      memberCount: 150,
      maleMembers: 120,
      femaleMembers: 30,
    },
    {
      name: "Old Town Senior Citizens",
      type: "SENIOR_CITIZEN" as const,
      wardIdx: 0,
      areaName: "Old Town",
      headName: "Dr. Sharma",
      headPhone: "9876543003",
      memberCount: 200,
      maleMembers: 110,
      femaleMembers: 90,
    },
    {
      name: "Civil Lines Youth Club",
      type: "YOUTH_GROUP" as const,
      wardIdx: 1,
      areaName: "Mall Road",
      headName: "Vikram Singh",
      headPhone: "9876543004",
      memberCount: 80,
      maleMembers: 50,
      femaleMembers: 30,
    },
    {
      name: "Laxmi Nagar Women Welfare",
      type: "WOMEN_GROUP" as const,
      wardIdx: 2,
      areaName: "Pocket A",
      headName: "Sunita Rani",
      headPhone: "9876543005",
      memberCount: 350,
      maleMembers: 0,
      femaleMembers: 350,
    },
    {
      name: "EWS Slum Committee",
      type: "SLUM" as const,
      wardIdx: 2,
      areaName: "EWS Colony",
      headName: "Meena Devi",
      headPhone: "9876543006",
      memberCount: 600,
      maleMembers: 380,
      femaleMembers: 220,
    },
    {
      name: "Gandhi Colony Buddhijeevi Manch",
      type: "BUDDHIJEEVI" as const,
      wardIdx: 3,
      headName: "Prof. Verma",
      headPhone: "9876543007",
      memberCount: 45,
      maleMembers: 30,
      femaleMembers: 15,
    },
    {
      name: "Kisan Sangh Rajpur",
      type: "TRADE_UNION" as const,
      wardIdx: 4,
      areaName: "Kisan Colony",
      headName: "Hari Prasad",
      headPhone: "9876543008",
      memberCount: 300,
      maleMembers: 250,
      femaleMembers: 50,
    },
    {
      name: "Rajpur Cricket Club",
      type: "SPORTS_TEAM" as const,
      wardIdx: 4,
      areaName: "Rajpur Village",
      headName: "Ajay Yadav",
      headPhone: "9876543009",
      memberCount: 25,
      maleMembers: 25,
      femaleMembers: 0,
    },
    {
      name: "Diwali Utsav Samiti",
      type: "FESTIVAL_COMMITTEE" as const,
      wardIdx: 0,
      headName: "Anil Sharma",
      headPhone: "9876543010",
      memberCount: 100,
      maleMembers: 70,
      femaleMembers: 30,
    },
  ];

  for (const cg of cgData) {
    let wardAreaId: string | null = null;
    if (cg.areaName) {
      const area = await prisma.wardArea.findUnique({
        where: {
          wardId_name: { wardId: wards[cg.wardIdx].id, name: cg.areaName },
        },
      });
      wardAreaId = area?.id || null;
    }
    await prisma.communityGroup.create({
      data: {
        tenantId: tenant.id,
        name: cg.name,
        type: cg.type,
        wardId: wards[cg.wardIdx].id,
        wardAreaId,
        headName: cg.headName,
        headPhone: cg.headPhone,
        memberCount: cg.memberCount,
        maleMembers: cg.maleMembers,
        femaleMembers: cg.femaleMembers,
        isActive: true,
      },
    });
  }
  console.log(`✅ ${cgData.length} community groups created`);

  // ════════════════════════════════════════════════════════
  // 15. LEADERS (NEW)
  // ════════════════════════════════════════════════════════

  const now = new Date();
  const thisYear = now.getFullYear();

  const leadersData = [
    // ── 2 leaders with birthday TODAY (for testing) ──
    {
      name: "Shri Ramesh Chandra Gupta",
      category: "PARTY_LEADER" as const,
      designation: "District President",
      organization: "Party",
      partyName: "Party",
      dateOfBirth: dobWithToday(1970),
      gender: "Male",
      address: "12, Civil Lines, Ward 1",
      wardId: wards[0].id,
      phone: "9811000001",
      whatsapp: "919811000001",
      email: "ramesh.gupta@email.com",
      relation: "Supporter",
      notes:
        "Key supporter since 2014. Active in all ward programs. Former Municipal Councillor.",
      tags: ["VIP", "Core Team", "Ward 1 Incharge"],
    },
    {
      name: "Smt. Kavita Sharma",
      category: "WOMEN_LEADER" as const,
      designation: "President, Mahila Morcha",
      organization: "Women Wing",
      partyName: "Party",
      dateOfBirth: dobWithToday(1978),
      gender: "Female",
      address: "45, Laxmi Nagar",
      wardId: wards[2].id,
      phone: "9811000002",
      whatsapp: "919811000002",
      email: "kavita.sharma@email.com",
      relation: "Supporter",
      notes:
        "Heads the women's wing. Very active in social causes. Organizes monthly health camps.",
      tags: ["Women Wing", "Health Camps"],
    },

    // ── 1 leader with birthday TOMORROW ──
    {
      name: "Dr. Anil Mehta",
      category: "ACADEMIC" as const,
      designation: "Principal",
      organization: "DAV Public School",
      dateOfBirth: dobTomorrow(1965),
      gender: "Male",
      address: "Education City, Gandhi Colony",
      wardId: wards[3].id,
      phone: "9811000003",
      whatsapp: "919811000003",
      email: "dr.anil@dav.edu.in",
      relation: "Neutral",
      notes:
        "Respected educationist. Invited to all official functions. Helps with youth programs.",
      tags: ["Education", "Youth"],
    },

    // ── 1 leader in 3 days ──
    {
      name: "Haji Mohammad Salim",
      category: "RELIGIOUS_LEADER" as const,
      designation: "Imam",
      organization: "Jama Masjid Committee",
      dateOfBirth: dobInDays(1960, 3),
      gender: "Male",
      address: "Near Jama Masjid, Old Town",
      wardId: wards[0].id,
      phone: "9811000004",
      whatsapp: "919811000004",
      relation: "Alliance",
      notes:
        "Very influential in Muslim community. Peace committee member. Helps during festivals.",
      tags: ["Religious", "Peace Committee", "Minority"],
    },

    // ── 1 leader in 5 days ──
    {
      name: "Shri Vikram Singh Chauhan",
      category: "YOUTH_LEADER" as const,
      designation: "President, Yuva Morcha",
      organization: "Party Youth Wing",
      partyName: "Party",
      dateOfBirth: dobInDays(1992, 5),
      gender: "Male",
      address: "Mall Road, Civil Lines",
      wardId: wards[1].id,
      phone: "9811000005",
      whatsapp: "919811000005",
      instagramUrl: "https://instagram.com/vikramsingh",
      twitterUrl: "https://twitter.com/vikramsingh",
      relation: "Supporter",
      notes:
        "Energetic youth leader. Organizes sports events and employment drives.",
      tags: ["Youth", "Sports", "Employment"],
    },

    // ── Opposition leader ──
    {
      name: "Shri Rajendra Prasad Yadav",
      category: "OPPOSITION_LEADER" as const,
      designation: "Block President",
      organization: "INC",
      partyName: "Congress",
      dateOfBirth: new Date(1968, 6, 15),
      gender: "Male",
      address: "23, Gandhi Colony",
      wardId: wards[3].id,
      phone: "9811000006",
      whatsapp: "919811000006",
      relation: "Opposition",
      notes:
        "Strong opposition leader. Has good grassroots network. Ex-MLA candidate.",
      tags: ["Opposition", "Ex-Candidate"],
    },

    // ── Business leaders ──
    {
      name: "Shri Manoj Jain",
      category: "BUSINESS_LEADER" as const,
      designation: "President, Traders Association",
      organization: "Laxmi Nagar Market Association",
      dateOfBirth: new Date(1972, 3, 22),
      gender: "Male",
      address: "Main Market, Laxmi Nagar",
      wardId: wards[2].id,
      phone: "9811000007",
      whatsapp: "919811000007",
      email: "manoj.jain@traders.com",
      relation: "Supporter",
      notes:
        "Controls 500+ shops association. Major fundraiser. Helps in event organization.",
      tags: ["Business", "Market", "Fundraiser"],
    },
    {
      name: "Smt. Nisha Agarwal",
      category: "BUSINESS_LEADER" as const,
      designation: "CEO",
      organization: "Agarwal Industries Pvt Ltd",
      dateOfBirth: new Date(1980, 10, 8),
      gender: "Female",
      address: "Industrial Belt, Shivaji Nagar",
      wardId: wards[0].id,
      phone: "9811000008",
      whatsapp: "919811000008",
      email: "nisha@agarwalindustries.com",
      facebookUrl: "https://facebook.com/nishaagarwal",
      relation: "Neutral",
      notes: "Runs CSR programs. Potential ally for infrastructure projects.",
      tags: ["Industry", "CSR", "Women Entrepreneur"],
    },

    // ── Bureaucrat ──
    {
      name: "Shri R.K. Mishra (IAS)",
      category: "BUREAUCRAT" as const,
      designation: "District Magistrate",
      organization: "District Administration",
      dateOfBirth: new Date(1975, 0, 10),
      gender: "Male",
      phone: "9811000009",
      email: "dm.centraldelhi@gov.in",
      relation: "Neutral",
      notes:
        "Current DM. Key for all government approvals. Professional and efficient.",
      tags: ["IAS", "Administration", "VIP"],
    },

    // ── Community leader ──
    {
      name: "Shri Dharamveer Singh",
      category: "COMMUNITY_LEADER" as const,
      designation: "Pradhan",
      organization: "Rajpur Gram Panchayat",
      dateOfBirth: new Date(1962, 8, 25),
      gender: "Male",
      address: "Rajpur Village",
      wardId: wards[4].id,
      phone: "9811000010",
      whatsapp: "919811000010",
      relation: "Alliance",
      notes:
        "Village head. Strong influence in rural ward. Helps with farmer issues.",
      tags: ["Rural", "Farmer", "Pradhan"],
    },

    // ── Media person ──
    {
      name: "Shri Pankaj Tiwari",
      category: "MEDIA_PERSON" as const,
      designation: "Bureau Chief",
      organization: "Dainik Jagran",
      dateOfBirth: new Date(1982, 4, 12),
      gender: "Male",
      phone: "9811000011",
      whatsapp: "919811000011",
      email: "pankaj.tiwari@jagran.com",
      twitterUrl: "https://twitter.com/pankajtiwari",
      relation: "Neutral",
      notes:
        "Covers constituency news. Good for positive media coverage. Handle carefully.",
      tags: ["Media", "Press", "Print"],
    },

    // ── Senior citizen ──
    {
      name: "Shri Babu Lal Verma",
      category: "SENIOR_CITIZEN" as const,
      designation: "Retired Judge",
      organization: "Senior Citizens Forum",
      dateOfBirth: new Date(1948, 11, 3),
      gender: "Male",
      address: "Judges Enclave, Civil Lines",
      wardId: wards[1].id,
      phone: "9811000012",
      relation: "Supporter",
      notes:
        "Retired High Court Judge. Respected elder. Invited as chief guest at events.",
      tags: ["Legal", "Senior", "Respected Elder"],
    },

    // ── Medical ──
    {
      name: "Dr. Sunita Reddy",
      category: "MEDICAL" as const,
      designation: "Chief Medical Officer",
      organization: "City Hospital",
      dateOfBirth: dobInDays(1974, 12),
      gender: "Female",
      wardId: wards[0].id,
      phone: "9811000013",
      whatsapp: "919811000013",
      email: "dr.sunita@cityhospital.in",
      relation: "Neutral",
      notes:
        "Key for health camps. Coordinates free medical camps. COVID warrior.",
      tags: ["Medical", "Health Camps", "COVID Warrior"],
    },

    // ── NGO Head ──
    {
      name: "Shri Ashok Kumar Pandey",
      category: "NGO_HEAD" as const,
      designation: "Founder & Director",
      organization: "Jan Seva Foundation",
      dateOfBirth: dobInDays(1976, 20),
      gender: "Male",
      address: "Service Road, Laxmi Nagar",
      wardId: wards[2].id,
      phone: "9811000014",
      whatsapp: "919811000014",
      email: "ashok@janseva.org",
      facebookUrl: "https://facebook.com/jansevafoundation",
      relation: "Alliance",
      notes:
        "Runs education and livelihood programs. 500+ volunteers. Good outreach partner.",
      tags: ["NGO", "Education", "Livelihood", "Volunteers"],
    },

    // ── Trade union (birthday was recent) ──
    {
      name: "Shri Ratan Lal Kashyap",
      category: "TRADE_UNION" as const,
      designation: "General Secretary",
      organization: "Mazdoor Sangh",
      dateOfBirth: new Date(
        1966,
        now.getMonth(),
        Math.max(1, now.getDate() - 5),
      ),
      gender: "Male",
      address: "Industrial Belt",
      wardId: wards[0].id,
      phone: "9811000015",
      whatsapp: "919811000015",
      relation: "Alliance",
      notes:
        "Controls 2000+ workers union. Important for labour votes. Can mobilize crowds.",
      tags: ["Labour", "Union", "Mobilization"],
    },
  ];

  const createdLeaders: any[] = [];

  for (const ld of leadersData) {
    const leader = await prisma.leader.create({
      data: {
        tenantId: tenant.id,
        name: ld.name,
        category: ld.category,
        designation: ld.designation || null,
        organization: ld.organization || null,
        partyName: ld.partyName || null,
        dateOfBirth: ld.dateOfBirth,
        gender: ld.gender || null,
        address: ld.address || null,
        wardId: ld.wardId || null,
        phone: ld.phone || null,
        whatsapp: ld.whatsapp || null,
        email: ld.email || null,
        facebookUrl: ld.facebookUrl || null,
        twitterUrl: ld.twitterUrl || null,
        instagramUrl: ld.instagramUrl || null,
        relation: ld.relation || null,
        notes: ld.notes || null,
        tags: ld.tags || [],
        isActive: true,
      },
    });
    createdLeaders.push(leader);
  }
  console.log(`✅ ${createdLeaders.length} leaders created`);

  // ────────────────────────────────────────────────────
  // 15b. LEADER GREETINGS (past birthday greetings)
  // ────────────────────────────────────────────────────

  const greetingsData = [
    // Last year birthday greetings for first few leaders
    {
      leaderIdx: 0,
      type: "BIRTHDAY",
      channel: "WHATSAPP" as const,
      message: `Respected Shri Ramesh Chandra Gupta ji, wishing you a very Happy Birthday! 🎂 May this year bring you great health, happiness, and continued success. Warm regards from Constituency Office.`,
      status: "SENT" as const,
      sentBy: "Rajesh Kumar (PA)",
      year: thisYear - 1,
      sentAt: new Date(thisYear - 1, now.getMonth(), now.getDate(), 8, 0, 0),
    },
    {
      leaderIdx: 0,
      type: "BIRTHDAY",
      channel: "SMS" as const,
      message: `Happy Birthday Shri Ramesh Gupta ji! 🎂 Warm wishes from MP Office.`,
      status: "SENT" as const,
      sentBy: "Rajesh Kumar (PA)",
      year: thisYear - 1,
      sentAt: new Date(thisYear - 1, now.getMonth(), now.getDate(), 8, 5, 0),
    },
    {
      leaderIdx: 1,
      type: "BIRTHDAY",
      channel: "WHATSAPP" as const,
      message: `Dear Smt. Kavita Sharma ji, Happy Birthday! 🎉🎂 Wishing you a wonderful year ahead filled with joy and achievements.`,
      status: "SENT" as const,
      sentBy: "Priya Sharma (Data Entry)",
      year: thisYear - 1,
      sentAt: new Date(thisYear - 1, now.getMonth(), now.getDate(), 9, 0, 0),
    },
    {
      leaderIdx: 5,
      type: "BIRTHDAY",
      channel: "SMS" as const,
      message: `Respected Shri Rajendra Prasad Yadav ji, wishing you a Happy Birthday! 🎂`,
      status: "SENT" as const,
      sentBy: "Rajesh Kumar (PA)",
      year: thisYear - 1,
      sentAt: new Date(thisYear - 1, 6, 15, 8, 30, 0),
    },
    {
      leaderIdx: 6,
      type: "BIRTHDAY",
      channel: "WHATSAPP" as const,
      message: `Happy Birthday Shri Manoj Jain ji! 🎂🎉 May your business prosper and you keep serving the trader community. Warm regards.`,
      status: "SENT" as const,
      sentBy: "Rajesh Kumar (PA)",
      year: thisYear - 1,
      sentAt: new Date(thisYear - 1, 3, 22, 7, 45, 0),
    },
    // A failed greeting
    {
      leaderIdx: 8,
      type: "BIRTHDAY",
      channel: "EMAIL" as const,
      message: `Happy Birthday Shri R.K. Mishra ji!`,
      status: "FAILED" as const,
      sentBy: "System",
      year: thisYear - 1,
      sentAt: null,
      failReason: "Email delivery failed — invalid address",
    },
    // Festival greeting example
    {
      leaderIdx: 3,
      type: "FESTIVAL",
      channel: "WHATSAPP" as const,
      message: `Eid Mubarak! 🌙 Wishing you and your family peace, happiness, and prosperity. — Constituency Office`,
      status: "SENT" as const,
      sentBy: "Rajesh Kumar (PA)",
      year: thisYear,
      sentAt: new Date(thisYear, 2, 31, 7, 0, 0),
    },
    // Recent birthday that was greeted (Ratan Lal — 5 days ago)
    {
      leaderIdx: 14,
      type: "BIRTHDAY",
      channel: "WHATSAPP" as const,
      message: `Happy Birthday Shri Ratan Lal Kashyap ji! 🎂 Wishing you great health and strength. Thank you for your service to the workers.`,
      status: "SENT" as const,
      sentBy: "Rajesh Kumar (PA)",
      year: thisYear,
      sentAt: new Date(
        thisYear,
        now.getMonth(),
        Math.max(1, now.getDate() - 5),
        8,
        0,
        0,
      ),
    },
  ];

  for (const gd of greetingsData) {
    const leader = createdLeaders[gd.leaderIdx];
    if (!leader) continue;

    await prisma.leaderGreeting.create({
      data: {
        tenantId: tenant.id,
        leaderId: leader.id,
        type: gd.type,
        channel: gd.channel,
        message: gd.message,
        status: gd.status,
        sentAt: gd.sentAt || null,
        sentBy: gd.sentBy,
        year: gd.year,
        failReason: (gd as any).failReason || null,
      },
    });
  }
  console.log(`✅ ${greetingsData.length} leader greetings history created`);

  // ─── 16. System Settings ─────────────────────────────
  const settings = [
    {
      key: "org_name",
      value: "MP/MLA Constituency Office",
      group: "general",
      description: "Organization name",
    },
    {
      key: "org_address",
      value: "Constituency Office, Main Road",
      group: "general",
      description: "Address",
    },
    {
      key: "org_phone",
      value: "+91 11 1234 5678",
      group: "general",
      description: "Phone",
    },
    {
      key: "timezone",
      value: "Asia/Kolkata",
      group: "general",
      description: "Timezone",
    },
    {
      key: "default_language",
      value: "en",
      group: "general",
      description: "Default language",
    },
    {
      key: "grievance_sla_days",
      value: "7",
      group: "general",
      type: "number",
      description: "Default SLA for grievances",
    },
    {
      key: "session_timeout_minutes",
      value: "30",
      group: "security",
      type: "number",
      description: "Session timeout",
    },
    {
      key: "max_failed_logins",
      value: "5",
      group: "security",
      type: "number",
      description: "Max failed logins before lock",
    },
    {
      key: "password_min_length",
      value: "8",
      group: "security",
      type: "number",
      description: "Min password length",
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`✅ ${settings.length} system settings created`);

  // ─── 17. Notification Templates ──────────────────────
  const templates = [
    {
      name: "grievance_created_sms",
      channel: "SMS" as const,
      body: "Your complaint {{ticketNumber}} has been registered. Category: {{category}}. We will resolve it soon. - Constituency Office",
      variables: ["ticketNumber", "category"],
    },
    {
      name: "grievance_resolved_sms",
      channel: "SMS" as const,
      body: "Your complaint {{ticketNumber}} has been resolved. Thank you. - Constituency Office",
      variables: ["ticketNumber"],
    },
    {
      name: "grievance_created_whatsapp",
      channel: "WHATSAPP" as const,
      body: "🏛️ *Complaint Registered*\n\nTicket: {{ticketNumber}}\nCategory: {{category}}\nWard: {{wardName}}\n\nWe are working on it.",
      variables: ["ticketNumber", "category", "wardName"],
    },
    {
      name: "welcome_email",
      channel: "EMAIL" as const,
      subject: "Welcome to Constituency Portal",
      body: "Dear {{name}},\n\nYour account has been created.\nEmail: {{email}}\n\nPlease login and change your password.",
      variables: ["name", "email"],
    },
    // ── NEW: Birthday templates ──
    {
      name: "birthday_whatsapp",
      channel: "WHATSAPP" as const,
      body: "🎂 *Happy Birthday {{name}} ji!*\n\nWishing you a wonderful year ahead filled with health, happiness, and great achievements.\n\nWarm regards,\n{{orgName}}",
      variables: ["name", "orgName"],
    },
    {
      name: "birthday_sms",
      channel: "SMS" as const,
      body: "Happy Birthday {{name}} ji! 🎂 Wishing you health, happiness & success. - {{orgName}}",
      variables: ["name", "orgName"],
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: t.name } },
      update: {},
      create: { tenantId: tenant.id, ...t },
    });
  }
  console.log(`✅ ${templates.length} notification templates created`);

  // ═══════════════════════════════════════════════════════
  console.log("\n🎉 Seed completed successfully!\n");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Login Credentials                                      ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Platform: superadmin@admin.mpmla.in / Platform@123456  ║");
  console.log("║  Admin:  admin@constituency.gov.in    / Admin@123456    ║");
  console.log("║  MLA:    mla@constituency.gov.in      / Mla@123456     ║");
  console.log("║  PA:     pa@constituency.gov.in       / Staff@123456   ║");
  console.log("║  DE:     dataentry@constituency.gov.in / Staff@123456  ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  Leaders: 15 (2 birthdays TODAY for testing)            ║");
  console.log("║  Greetings: 8 history records                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
}
main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
