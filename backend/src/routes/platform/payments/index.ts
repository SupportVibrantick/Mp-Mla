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

// All payment routes require platform authentication
router.use(
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform("SUPER_ADMIN", "PLATFORM_ADMIN"),
);

// ─── Payment Stats ─────────────────────────────────────────
router.get("/stats", getPaymentStats);

// ─── Payment CRUD ──────────────────────────────────────────
router.get("/", validateQuery(listPaymentsSchema), listPayments);
router.get("/:id", validateParams(idParamSchema), getPaymentById);
router.post("/", validate(createPaymentSchema), createPayment);
router.patch("/:id", validateParams(idParamSchema), validate(updatePaymentSchema), updatePayment);
router.patch("/:id/status", validateParams(idParamSchema), validate(updatePaymentStatusSchema), updatePaymentStatus);
router.delete("/:id", validateParams(idParamSchema), deletePayment);

export default router;
