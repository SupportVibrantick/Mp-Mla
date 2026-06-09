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
const readRoles = ["SUPER_ADMIN", "PLATFORM_ADMIN", "SUPPORT_STAFF"] as const;
const writeRoles = ["SUPER_ADMIN", "PLATFORM_ADMIN"] as const;

router.use(authenticatePlatform, requireActivePlatformUser);

router.get("/", authorizePlatform(...readRoles), validateQuery(listModulesSchema), listModules);
router.get("/:id", authorizePlatform(...readRoles), validateParams(idParamSchema), getModuleById);
router.post("/", authorizePlatform(...writeRoles), validate(createModuleSchema), createModule);
router.patch(
  "/:id",
  authorizePlatform(...writeRoles),
  validateParams(idParamSchema),
  validate(updateModuleSchema),
  updateModule,
);
router.delete(
  "/:id",
  authorizePlatform(...writeRoles),
  validateParams(idParamSchema),
  deleteModule,
);

router.get(
  "/tenant-access/:tenantId",
  authorizePlatform(...readRoles),
  validateParams(tenantIdParamSchema),
  validateQuery(listTenantModulesSchema),
  listTenantModules,
);
router.post(
  "/tenant-access/:tenantId",
  authorizePlatform(...writeRoles),
  validateParams(tenantIdParamSchema),
  validate(grantModuleAccessSchema),
  grantModuleAccess,
);
router.post(
  "/tenant-access/:tenantId/bulk",
  authorizePlatform(...writeRoles),
  validateParams(tenantIdParamSchema),
  validate(bulkGrantModulesSchema),
  bulkGrantModules,
);
router.patch(
  "/tenant-access/:tenantId/:moduleId",
  authorizePlatform(...writeRoles),
  validateParams(tenantModuleParamSchema),
  validate(updateModuleAccessSchema),
  updateModuleAccess,
);
router.delete(
  "/tenant-access/:tenantId/:moduleId",
  authorizePlatform(...writeRoles),
  validateParams(tenantModuleParamSchema),
  revokeModuleAccess,
);

export default router;
