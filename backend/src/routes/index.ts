import { Router } from "express";

import adminRoutes from "./admin/index.js";

const router = Router();

// Mount all admin routes under /api/admin/*
router.use("/admin", adminRoutes);

export default router;
