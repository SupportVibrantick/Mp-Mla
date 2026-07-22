import { Router } from "express";
import {
  getSubscription,
  getInvoices,
  getUsage,
  getAvailablePlans,
  createPlanUpgradeRequest,
} from "../../../controllers/admin/account.controller.js";
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

router.get("/subscription", getSubscription);
router.get("/invoices", getInvoices);
router.get("/usage", getUsage);
router.get("/plans", getAvailablePlans);
router.post(
  "/upgrade-requests",
  validate(planUpgradeRequestSchema),
  createPlanUpgradeRequest,
);

export default router;
