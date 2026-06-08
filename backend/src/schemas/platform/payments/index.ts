import { z } from "zod";

const paymentStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]);

export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const subscriptionIdParamSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
});

export const listPaymentsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: paymentStatusSchema.optional(),
  subscriptionId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const createPaymentSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  amount: z.coerce.number().min(0, "Amount must be a positive number"),
  currency: z.string().default("INR"),
  method: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  status: paymentStatusSchema.default("PENDING"),
  invoiceNumber: z.string().nullable().optional(),
  invoiceUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const updatePaymentStatusSchema = z.object({
  status: paymentStatusSchema,
  paidAt: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  invoiceUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
