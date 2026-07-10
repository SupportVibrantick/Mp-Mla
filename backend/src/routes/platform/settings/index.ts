import { Router } from "express";
import {
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform,
} from "../../../middleware/platformAuth.js";
import {
  listPlatformSettings,
  updatePlatformSettings,
  resetPlatformSettings,
  testPlatformSmtpConnection,
} from "../../../controllers/platform/settings.controller.js";
import { createUploader, enforceStorageAndTrack } from "../../../lib/upload.js";

const router = Router();
const settingsUploader = createUploader("settings");

router.use(authenticatePlatform, requireActivePlatformUser);

router.get(
  "/",
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
  listPlatformSettings,
);

router.patch(
  "/",
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
  settingsUploader.any(),
  enforceStorageAndTrack,
  updatePlatformSettings,
);

router.put(
  "/",
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
  settingsUploader.any(),
  enforceStorageAndTrack,
  updatePlatformSettings,
);

router.post(
  "/reset/:group",
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
  resetPlatformSettings,
);

router.post(
  "/test-email",
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
  testPlatformSmtpConnection,
);

export default router;
