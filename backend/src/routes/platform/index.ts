import { Router } from "express";
import authRoutes from "./auth/index.js";
import subscriptionRoutes from "./subscriptions/index.js";
import tenantRoutes from "./tenants/index.js";
import moduleRoutes from "./modules/index.js";
import paymentRoutes from "./payments/index.js";
import dashboardRoutes from "./dashboard/index.js";
import settingsRoutes from "./settings/index.js";
import usersRoutes from "./users/index.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tenants", tenantRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/modules", moduleRoutes);
router.use("/payments", paymentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/settings", settingsRoutes);
router.use("/users", usersRoutes);

export default router;
