import { Router } from "express";
import {
  getSubscription,
  getInvoices,
  getUsage,
  getPlans,
  createPlanUpgradeRequest,
} from "../../../controllers/admin/account.controller.js";
import {
  createOrder,
  verifyPayment,
} from "../../../controllers/admin/paymentGateway.controller.js";
import { validate } from "../../../middleware/validate.js";
import { z } from "zod";

const router = Router();

const planUpgradeRequestSchema = z.object({
  requestedPlanId: z.string().min(1, "Plan is required"),
  requestedBillingCycle: z
    .enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"])
    .optional(),
  requesterName: z.string().optional(),
  requesterEmail: z.string().email().optional(),
  requesterPhone: z.string().optional(),
  tenantNote: z.string().max(1000).optional(),
});

const createOrderSchema = z.object({
  paymentId: z.string().optional(),
  planId: z.string().optional(),
  billingCycle: z
    .enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"])
    .optional(),
  notes: z.string().optional(),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

router.get("/subscription", getSubscription);
router.get("/invoices", getInvoices);
router.get("/usage", getUsage);
router.get("/plans", getPlans);
router.post(
  "/upgrade-requests",
  validate(planUpgradeRequestSchema),
  createPlanUpgradeRequest,
);

// Payment gateway routes
router.post("/payments/order", validate(createOrderSchema), createOrder);
router.post("/payments/verify", validate(verifyPaymentSchema), verifyPayment);

export default router;
