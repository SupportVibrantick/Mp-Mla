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
  listRenewalsSchema,
  listPlanUpgradeRequestsSchema,
  reviewPlanUpgradeRequestSchema,
} from "../../../schemas/platform/subscriptions/index.js";
import {
  activateTenantSubscription,
  approvePlanUpgradeRequest,
  cancelTenantSubscription,
  createSubscriptionPlan,
  getSubscriptionOverview,
  getTenantSubscription,
  upgradeTenantSubscription,
  listPlanUpgradeRequests,
  listInvoices,
  listSubscriptionPlans,
  listTenantSubscriptions,
  suspendTenantSubscription,
  updateSubscriptionPlan,
  upsertTenantSubscription,
  listUpcomingRenewals,
  rejectPlanUpgradeRequest,
} from "../../../controllers/platform/subscriptions.controller.js";

const router = Router();
const readRoles = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "BILLING_MANAGER",
  "SUPPORT_STAFF",
] as const;
const writeRoles = ["SUPER_ADMIN", "PLATFORM_ADMIN", "BILLING_MANAGER"] as const;
const planWriteRoles = ["SUPER_ADMIN", "PLATFORM_ADMIN"] as const;

router.use(authenticatePlatform, requireActivePlatformUser);

router.get(
  "/plans",
  authorizePlatform(...readRoles),
  validateQuery(listPlansSchema),
  listSubscriptionPlans,
);
router.post(
  "/plans",
  authorizePlatform(...planWriteRoles),
  validate(createPlanSchema),
  createSubscriptionPlan,
);
router.patch(
  "/plans/:id",
  authorizePlatform(...planWriteRoles),
  validateParams(idParamSchema),
  validate(updatePlanSchema),
  updateSubscriptionPlan,
);

router.get("/overview", authorizePlatform(...readRoles), getSubscriptionOverview);
router.get(
  "/invoices",
  authorizePlatform(...readRoles),
  validateQuery(listInvoicesSchema),
  listInvoices,
);
router.get(
  "/renewals",
  authorizePlatform(...readRoles),
  validateQuery(listRenewalsSchema),
  listUpcomingRenewals,
);
router.get(
  "/upgrade-requests",
  authorizePlatform(...readRoles),
  validateQuery(listPlanUpgradeRequestsSchema),
  listPlanUpgradeRequests,
);
router.post(
  "/upgrade-requests/:id/approve",
  authorizePlatform(...writeRoles),
  validateParams(idParamSchema),
  validate(reviewPlanUpgradeRequestSchema),
  approvePlanUpgradeRequest,
);
router.post(
  "/upgrade-requests/:id/reject",
  authorizePlatform(...writeRoles),
  validateParams(idParamSchema),
  validate(reviewPlanUpgradeRequestSchema.pick({ adminNote: true })),
  rejectPlanUpgradeRequest,
);
router.get(
  "/tenant-subscriptions",
  authorizePlatform(...readRoles),
  validateQuery(listTenantSubscriptionsSchema),
  listTenantSubscriptions,
);

router.get(
  "/tenant-subscriptions/:tenantId",
  authorizePlatform(...readRoles),
  validateParams(tenantIdParamSchema),
  getTenantSubscription,
);
router.put(
  "/tenant-subscriptions/:tenantId",
  authorizePlatform(...writeRoles),
  validateParams(tenantIdParamSchema),
  validate(upsertTenantSubscriptionSchema),
  upsertTenantSubscription,
);
router.post(
  "/tenant-subscriptions/:tenantId/upgrade",
  authorizePlatform(...writeRoles),
  validateParams(tenantIdParamSchema),
  validate(upgradeTenantSubscriptionSchema),
  upgradeTenantSubscription,
);
router.post(
  "/tenant-subscriptions/:tenantId/suspend",
  authorizePlatform(...writeRoles),
  validateParams(tenantIdParamSchema),
  suspendTenantSubscription,
);
router.post(
  "/tenant-subscriptions/:tenantId/activate",
  authorizePlatform(...writeRoles),
  validateParams(tenantIdParamSchema),
  activateTenantSubscription,
);
router.post(
  "/tenant-subscriptions/:tenantId/cancel",
  authorizePlatform(...writeRoles),
  validateParams(tenantIdParamSchema),
  cancelTenantSubscription,
);

export default router;
