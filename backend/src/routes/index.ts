import { Router } from "express";

import adminRoutes from "./admin/index.js";
import platformRoutes from "./platform/index.js";
import publicRoutes from "./public/index.js";

const router = Router();

// Mount public routes (no auth required)
router.use("/public", publicRoutes);

// Mount all admin routes under /api/admin/*
router.use("/admin", adminRoutes);

// Mount all platform routes under /api/platform/*
router.use("/platform", platformRoutes);

export default router;
