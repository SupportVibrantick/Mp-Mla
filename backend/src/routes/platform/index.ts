import { Router } from "express";
import authRoutes from "./auth/index.js";
import tenantRoutes from "./tenants/index.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tenants", tenantRoutes);

export default router;
