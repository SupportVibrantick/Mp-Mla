import { Request, Response, NextFunction } from "express";
import * as paymentService from "../../services/payment.service.js";
import ApiResponse from "../../utils/ApiResponse.js";

/**
 * Platform-facing payment gateway controller.
 * Used by the master dashboard for admin-initiated Razorpay payments.
 */

// POST /platform/payments/order
export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { subscriptionId, amount, currency, notes } = req.body;

    const result = await paymentService.createOrder({
      subscriptionId,
      amount,
      currency,
      notes,
      performedBy: req.platformUser?.id,
    });

    res.status(200).json(ApiResponse.success(result, "Payment order created"));
  } catch (error) {
    next(error);
  }
};

// POST /platform/payments/verify
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
      performedBy: req.platformUser?.id,
    });

    const message = result.alreadyProcessed
      ? "Payment was already verified"
      : "Payment verified successfully";

    res.status(200).json(ApiResponse.success(result, message));
  } catch (error) {
    next(error);
  }
};
