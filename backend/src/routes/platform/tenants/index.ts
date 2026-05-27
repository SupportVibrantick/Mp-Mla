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

// All platform tenant routes require platform authentication.
router.use(
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
);

// ─── Tenant Management ────────────────────────────────────────────────
router.post("/", validate(createTenantSchema), createTenant);
router.get("/plans", listPlans);
router.get("/", validateQuery(listTenantsSchema), listTenants);
router.get("/:id", getTenantById);
router.post("/:id/suspend", suspendTenant);
router.post("/:id/activate", activateTenant);
router.delete("/:id", deleteTenant);
router.patch("/:id", validate(updateTenantSchema), updateTenant);

// ─── Tenant Users Management ──────────────────────────────────────────
router.post("/:id/users", validate(createTenantUserSchema), createTenantUser);
router.get("/:id/users", listTenantUsers);

export default router;
