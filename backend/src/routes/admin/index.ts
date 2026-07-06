import { Router } from "express";
import { authenticate, requireActiveUser } from "../../middleware/auth.js";
import { injectTenantContext } from "../../middleware/tenantContext.js";
import { requireModule } from "../../middleware/requireModule.js";
import accountRoutes from "./account/index.js";

import authRoutes from "./auth/index.js";
import userRoutes from "./user/index.js";
import permissionRoutes from "./permission/index.js";
import wardRoutes from "./ward/index.js";
import communityGroup from "./communityGroup";
import demographicsRoutes from "./demographics";

import institutionRoutes from "./institution";
import grievanceRoutes from "./grievance/index.js";
import projectRoutes from "./project/index.js";
// import schemeRoutes from "./scheme/index.js";
import fundRoutes from "./fund/index.js";
import departmentRoutes from "./department/index.js";
import reportRoutes from "./report/index.js";
import dashboardRoutes from "./dashboard/index.js";
import leaderRoutes from "./leader/index.js";
import settingsRoutes from "./settings/index.js";
import auditLogRoutes from "./auditLog/index.js";
import recycleBinRoutes from "./recycleBin/index.js";
import dataActivityRoutes from "./dataActivity/index.js";
import meetingRoutes from "./meeting/index.js";
import competitorRoutes from "./competitor/index.js";

const router = Router();

// ─── Semi-Public: auth + public branding (NO tenant context) ──────────────
// These routes must stay BEFORE the auth + injectTenantContext chain below.
router.use("/auth", authRoutes);

// /settings has one public sub-route (GET /public/branding) that is registered
// first inside settings/index.ts before any authenticate middleware.
router.use("/settings", settingsRoutes);

// ─── Protected: authenticate → active check → inject tenant-scoped Prisma ─
//
// injectTenantContext is applied HERE so every module below automatically
// receives req.tenantPrisma scoped to the authenticated tenant.
// This structurally prevents cross-tenant data leaks (AC-1, AC-2, AC-3).
router.use(authenticate, requireActiveUser, injectTenantContext);

router.use("/account", accountRoutes);
router.use("/users", requireModule("users"), userRoutes);
router.use("/permissions", requireModule("users"), permissionRoutes);
router.use("/wards", requireModule("wards"), wardRoutes);
router.use("/community-groups", requireModule("community_groups"), communityGroup);
router.use("/demographics", requireModule("demographics"), demographicsRoutes);
router.use("/institutions", requireModule("institutions"), institutionRoutes);
router.use("/departments", requireModule("departments"), departmentRoutes);
router.use("/grievances", requireModule("grievances"), grievanceRoutes);
router.use("/projects", requireModule("projects"), projectRoutes);
// router.use("/schemes", requireModule("schemes"), schemeRoutes);
router.use("/funds", requireModule("funds"), fundRoutes);
router.use("/audit-logs", requireModule("audit_logs"), auditLogRoutes);
router.use("/recycle-bin", requireModule("recycle_bin"), recycleBinRoutes);
router.use("/leaders", requireModule("leaders"), leaderRoutes);
router.use("/reports", requireModule("reports"), reportRoutes);
router.use("/data-activity", requireModule("data_import"), dataActivityRoutes);
router.use("/meetings", requireModule("meeting"), meetingRoutes);
router.use("/competitor-analysis", requireModule("competitors"), competitorRoutes);
router.use("/dashboard", requireModule("dashboard"), dashboardRoutes);

export default router;
