import { Router } from "express";
import {
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform,
} from "../../../middleware/platformAuth.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../../../middleware/validate.js";
import {
  idParamSchema,
  tenantIdParamSchema,
  tenantModuleParamSchema,
  listModulesSchema,
  createModuleSchema,
  updateModuleSchema,
  listTenantModulesSchema,
  grantModuleAccessSchema,
  updateModuleAccessSchema,
  bulkGrantModulesSchema,
} from "../../../schemas/platform/modules/index.js";
import {
  listModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  listTenantModules,
  grantModuleAccess,
  updateModuleAccess,
  revokeModuleAccess,
  bulkGrantModules,
} from "../../../controllers/platform/modules.controller.js";

const router = Router();

// All module routes require platform authentication
router.use(
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
);

// ─── Module CRUD ──────────────────────────────────────────
router.get("/", validateQuery(listModulesSchema), listModules);
router.get("/:id", validateParams(idParamSchema), getModuleById);
router.post("/", validate(createModuleSchema), createModule);
router.patch("/:id", validateParams(idParamSchema), validate(updateModuleSchema), updateModule);
router.delete("/:id", validateParams(idParamSchema), deleteModule);

// ─── Tenant Module Access ─────────────────────────────────
router.get(
  "/tenant-access/:tenantId",
  validateParams(tenantIdParamSchema),
  validateQuery(listTenantModulesSchema),
  listTenantModules,
);
router.post(
  "/tenant-access/:tenantId",
  validateParams(tenantIdParamSchema),
  validate(grantModuleAccessSchema),
  grantModuleAccess,
);
router.post(
  "/tenant-access/:tenantId/bulk",
  validateParams(tenantIdParamSchema),
  validate(bulkGrantModulesSchema),
  bulkGrantModules,
);
router.patch(
  "/tenant-access/:tenantId/:moduleId",
  validateParams(tenantModuleParamSchema),
  validate(updateModuleAccessSchema),
  updateModuleAccess,
);
router.delete(
  "/tenant-access/:tenantId/:moduleId",
  validateParams(tenantModuleParamSchema),
  revokeModuleAccess,
);

export default router;
