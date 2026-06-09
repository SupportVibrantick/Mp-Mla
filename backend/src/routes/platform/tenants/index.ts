import { Router } from "express";
import {
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform,
} from "../../../middleware/platformAuth.js";
import { validate, validateQuery } from "../../../middleware/validate.js";
import {
  createTenantSchema,
  updateTenantSchema,
  listTenantsSchema,
  createTenantUserSchema,
} from "../../../schemas/platform/tenants/index.js";
import {
  createTenant,
  listTenants,
  getTenantById,
  updateTenant,
  createTenantUser,
  listTenantUsers,
  listPlans,
  suspendTenant,
  activateTenant,
  deleteTenant,
} from "../../../controllers/platform/tenants.controller.js";

const router = Router();
const readRoles = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "SUPPORT_STAFF",
  "BILLING_MANAGER",
] as const;
const writeRoles = ["SUPER_ADMIN", "PLATFORM_ADMIN"] as const;

router.use(authenticatePlatform, requireActivePlatformUser);

router.post(
  "/",
  authorizePlatform(...writeRoles),
  validate(createTenantSchema),
  createTenant,
);
router.get("/plans", authorizePlatform(...readRoles), listPlans);
router.get(
  "/",
  authorizePlatform(...readRoles),
  validateQuery(listTenantsSchema),
  listTenants,
);
router.get("/:id", authorizePlatform(...readRoles), getTenantById);
router.post(
  "/:id/suspend",
  authorizePlatform(...writeRoles),
  suspendTenant,
);
router.post(
  "/:id/activate",
  authorizePlatform(...writeRoles),
  activateTenant,
);
router.delete("/:id", authorizePlatform(...writeRoles), deleteTenant);
router.patch(
  "/:id",
  authorizePlatform(...writeRoles),
  validate(updateTenantSchema),
  updateTenant,
);
router.post(
  "/:id/users",
  authorizePlatform(...writeRoles),
  validate(createTenantUserSchema),
  createTenantUser,
);
router.get("/:id/users", authorizePlatform(...readRoles), listTenantUsers);

export default router;
