import { Router } from "express";
import {
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform,
} from "../../../middleware/platformAuth.js";
import {
  listPlatformSettings,
  updatePlatformSettings,
} from "../../../controllers/platform/settings.controller.js";

const router = Router();

router.use(authenticatePlatform, requireActivePlatformUser);

router.get(
  "/",
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
  listPlatformSettings,
);
router.patch(
  "/",
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
  updatePlatformSettings,
);

export default router;
