import { Router } from "express";
import { authenticate, requireActiveUser } from "../../middleware/auth.js";

import authRoutes from "./auth/index.js";
import userRoutes from "./user/index.js";
import permissionRoutes from "./permission/index.js";
import wardRoutes from "./ward/index.js";
import communityGroup from "./communityGroup";
import demographicsRoutes from "./demographics";

import institutionRoutes from "./institution";
// import inchargeRoutes from "./incharge/index.js";
import grievanceRoutes from "./grievance/index.js";
import projectRoutes from "./project/index.js";
// import schemeRoutes from "./scheme/index.js";
import fundRoutes from "./fund/index.js";
// import demographicsRoutes from "./demographics/index.js";
import departmentRoutes from "./department/index.js";
// import taskRoutes from "./task/index.js";
import reportRoutes from "./report/index.js";
import dashboardRoutes from "./dashboard/index.js";
import leaderRoutes from "./leader/index.js";
import settingsRoutes from "./settings/index.js";
import auditLogRoutes from "./auditLog/index.js";
import recycleBinRoutes from "./recycleBin/index.js";
import dataActivityRoutes from "./dataActivity/index.js";
import meetingRoutes from "./meeting/index.js";
import competitorRoutes from "./competitor/index.js";

// import auditLogRoutes from "./auditLog/index.js";
// import settingsRoutes from "./settings/index.js";
// import notificationRoutes from "./notification/index.js";

const router = Router();

// ─── Semi-Public: settings contains a public route for branding ────────
router.use("/auth", authRoutes);
router.use("/settings", settingsRoutes);

// ─── Protected: All routes below require auth ───────────
router.use(authenticate, requireActiveUser);

router.use("/users", userRoutes);
router.use("/permissions", permissionRoutes);
router.use("/wards", wardRoutes);
router.use("/community-groups", communityGroup);
router.use("/demographics", demographicsRoutes);
router.use("/institutions", institutionRoutes);
router.use("/departments", departmentRoutes);
// router.use("/incharges", inchargeRoutes);
router.use("/grievances", grievanceRoutes);
router.use("/projects", projectRoutes);
router.use("/funds", fundRoutes);

router.use("/audit-logs", auditLogRoutes);
router.use("/recycle-bin", recycleBinRoutes);
router.use("/leaders", leaderRoutes);
router.use("/reports", reportRoutes);
router.use("/data-activity", dataActivityRoutes);
router.use("/meetings", meetingRoutes);
router.use("/competitor-analysis", competitorRoutes);
// router.use("/schemes", schemeRoutes);
// router.use("/demographics", demographicsRoutes);
// router.use("/departments", departmentRoutes);
// router.use("/tasks", taskRoutes);
router.use("/dashboard", dashboardRoutes);
// router.use("/audit-logs", auditLogRoutes);
// router.use("/settings", settingsRoutes);
// router.use("/notifications", notificationRoutes);

export default router;
