import { Router } from "express";
import {
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform,
} from "../../../middleware/platformAuth.js";
import { getDashboardStats } from "../../../controllers/platform/dashboard.controller.js";

const router = Router();

// All platform dashboard routes require platform authentication and role permission
router.use(
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN", "BILLING_MANAGER", "SUPPORT_STAFF"),
);

router.get("/", getDashboardStats);

export default router;
