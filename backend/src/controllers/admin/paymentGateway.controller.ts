import { Request, Response, NextFunction } from "express";
import * as paymentService from "../../services/payment.service.js";
import ApiResponse from "../../utils/ApiResponse.js";

/**
 * Tenant-facing payment gateway controller.
 * Used by the frontend (tenant dashboard) for Razorpay checkout.
 */

// POST /admin/account/payments/order
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { paymentId, planId, billingCycle, notes } = req.body;

    const result = await paymentService.createTenantOrder({
      tenantId,
      paymentId,
      planId,
      billingCycle,
      notes,
      performedBy: req.user?.id,
    });

    res.status(200).json(ApiResponse.success(result, "Payment order created"));
  } catch (error) {
    next(error);
  }
};

// POST /admin/account/payments/verify
export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const result = await paymentService.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      performedBy: req.user?.id,
    });

    const message = result.alreadyProcessed
      ? "Payment was already verified"
      : "Payment verified successfully";

    res.status(200).json(ApiResponse.success(result, message));
  } catch (error) {
    next(error);
  }
};
