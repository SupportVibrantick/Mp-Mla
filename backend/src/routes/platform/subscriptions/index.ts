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
  createPlanSchema,
  idParamSchema,
  listInvoicesSchema,
  listPlansSchema,
  listTenantSubscriptionsSchema,
  tenantIdParamSchema,
  upgradeTenantSubscriptionSchema,
  updatePlanSchema,
  upsertTenantSubscriptionSchema,
} from "../../../schemas/platform/subscriptions/index.js";
import {
  activateTenantSubscription,
  cancelTenantSubscription,
  createSubscriptionPlan,
  getSubscriptionOverview,
  getTenantSubscription,
  upgradeTenantSubscription,
  listInvoices,
  listSubscriptionPlans,
  listTenantSubscriptions,
  suspendTenantSubscription,
  updateSubscriptionPlan,
  upsertTenantSubscription,
} from "../../../controllers/platform/subscriptions.controller.js";

const router = Router();

router.use(
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
);

router.get("/plans", validateQuery(listPlansSchema), listSubscriptionPlans);
router.post("/plans", validate(createPlanSchema), createSubscriptionPlan);
router.patch("/plans/:id", validateParams(idParamSchema), validate(updatePlanSchema), updateSubscriptionPlan);

router.get("/overview", getSubscriptionOverview);
router.get("/invoices", validateQuery(listInvoicesSchema), listInvoices);
router.get("/tenant-subscriptions", validateQuery(listTenantSubscriptionsSchema), listTenantSubscriptions);
router.get("/tenant-subscriptions/:tenantId", validateParams(tenantIdParamSchema), getTenantSubscription);
router.put(
  "/tenant-subscriptions/:tenantId",
  validateParams(tenantIdParamSchema),
  validate(upsertTenantSubscriptionSchema),
  upsertTenantSubscription,
);
router.post(
  "/tenant-subscriptions/:tenantId/upgrade",
  validateParams(tenantIdParamSchema),
  validate(upgradeTenantSubscriptionSchema),
  upgradeTenantSubscription,
);
router.post(
  "/tenant-subscriptions/:tenantId/suspend",
  validateParams(tenantIdParamSchema),
  suspendTenantSubscription,
);
router.post(
  "/tenant-subscriptions/:tenantId/activate",
  validateParams(tenantIdParamSchema),
  activateTenantSubscription,
);
router.post(
  "/tenant-subscriptions/:tenantId/cancel",
  validateParams(tenantIdParamSchema),
  cancelTenantSubscription,
);

export default router;
