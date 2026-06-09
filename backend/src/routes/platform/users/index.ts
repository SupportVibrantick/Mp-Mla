import { Router } from "express";
import {
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform,
} from "../../../middleware/platformAuth.js";
import {
  listPlatformUsers,
  createPlatformUser,
  updatePlatformUser,
  deletePlatformUser,
} from "../../../controllers/platform/users.controller.js";

const router = Router();

router.use(
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
);

router.get("/", listPlatformUsers);
router.post("/", createPlatformUser);
router.patch("/:id", updatePlatformUser);
router.delete("/:id", deletePlatformUser);

export default router;
