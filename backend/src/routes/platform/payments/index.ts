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
  listPaymentsSchema,
  createPaymentSchema,
  updatePaymentSchema,
  updatePaymentStatusSchema,
} from "../../../schemas/platform/payments/index.js";
import {
  listPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  updatePaymentStatus,
  deletePayment,
  getPaymentStats,
} from "../../../controllers/platform/payments.controller.js";

const router = Router();
const readRoles = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "BILLING_MANAGER",
] as const;
const writeRoles = ["SUPER_ADMIN", "PLATFORM_ADMIN", "BILLING_MANAGER"] as const;

router.use(authenticatePlatform, requireActivePlatformUser);

router.get("/stats", authorizePlatform(...readRoles), getPaymentStats);
router.get("/", authorizePlatform(...readRoles), validateQuery(listPaymentsSchema), listPayments);
router.get("/:id", authorizePlatform(...readRoles), validateParams(idParamSchema), getPaymentById);
router.post("/", authorizePlatform(...writeRoles), validate(createPaymentSchema), createPayment);
router.patch(
  "/:id",
  authorizePlatform(...writeRoles),
  validateParams(idParamSchema),
  validate(updatePaymentSchema),
  updatePayment,
);
router.patch(
  "/:id/status",
  authorizePlatform(...writeRoles),
  validateParams(idParamSchema),
  validate(updatePaymentStatusSchema),
  updatePaymentStatus,
);
router.delete(
  "/:id",
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
  validateParams(idParamSchema),
  deletePayment,
);

export default router;
