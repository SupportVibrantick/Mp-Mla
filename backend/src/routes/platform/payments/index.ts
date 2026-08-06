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
import {
  createOrder,
  verifyPayment,
} from "../../../controllers/platform/paymentGateway.controller.js";
import { z } from "zod";

const router = Router();
const readRoles = [
  "SUPER_ADMIN",
  "PLATFORM_ADMIN",
  "BILLING_MANAGER",
] as const;
const writeRoles = ["SUPER_ADMIN", "PLATFORM_ADMIN", "BILLING_MANAGER"] as const;

const createOrderSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  amount: z.coerce.number().min(0.01).optional(),
  currency: z.string().default("INR"),
  notes: z.string().optional(),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

router.use(authenticatePlatform, requireActivePlatformUser);

// Payment gateway routes (Razorpay)
router.post("/order", authorizePlatform(...writeRoles), validate(createOrderSchema), createOrder);
router.post("/verify", authorizePlatform(...writeRoles), validate(verifyPaymentSchema), verifyPayment);

// Existing payment CRUD routes
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

