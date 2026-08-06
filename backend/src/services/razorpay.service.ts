import Razorpay from "razorpay";
import crypto from "crypto";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Razorpay Service
 *
 * SDK wrapper — the ONLY file that imports the `razorpay` package.
 * All gateway-specific logic stays here.
 * If we add Stripe later, we create stripe.service.ts with the same interface.
 */

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || "";
}

/**
 * Create a Razorpay order.
 * Amount is in paise (INR * 100).
 */
export async function createOrder(params: {
  amount: number; // in INR (will be converted to paise)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}> {
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(params.amount * 100), // Convert INR to paise
      currency: params.currency || "INR",
      receipt: params.receipt,
      notes: params.notes || {},
    });

    logger.info(
      `Razorpay order created: ${order.id} for ₹${params.amount} (receipt: ${params.receipt})`,
    );

    return {
      id: order.id,
      amount: order.amount as number,
      currency: order.currency,
      receipt: order.receipt || params.receipt,
      status: order.status as string,
    };
  } catch (error: any) {
    logger.error(`Razorpay orders.create failed: ${error?.error?.description || error?.message || error}`);
    throw ApiError.badRequest(
      `Razorpay Order Error: ${error?.error?.description || error?.message || "Failed to create order"}`,
    );
  }
}

/**
 * Verify Razorpay payment signature using HMAC SHA256.
 * Returns true if signature is valid.
 */
export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

/**
 * Fetch payment details from Razorpay for reconciliation.
 */
export async function fetchPayment(
  paymentId: string,
): Promise<{
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  order_id: string;
}> {
  const payment = await razorpay.payments.fetch(paymentId);
  return {
    id: payment.id,
    amount: payment.amount as number,
    currency: payment.currency,
    status: payment.status as string,
    method: (payment.method as string) || "unknown",
    order_id: payment.order_id as string,
  };
}
